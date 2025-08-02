import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "../../db";
import { households, memberships, type users } from "../../db/schema";
import { type ClerkUserData, syncUserToDatabase } from "../clerk-sync";

// Context type definition
export interface ClerkContext {
	db: typeof db;
	headers: Headers;
	requestedHouseholdId: string | null;
	auth: Awaited<ReturnType<typeof auth>>;
	clerkUser: Awaited<ReturnType<typeof currentUser>>;
	dbUser: typeof users.$inferSelect | null;
	currentHouseholdId: string | null;
	currentMembership: typeof memberships.$inferSelect | null;
	availableHouseholds: Array<
		typeof households.$inferSelect & {
			membership: typeof memberships.$inferSelect;
		}
	>;
}

// Create context function for Next.js App Router with Clerk
export const createClerkTRPCContext = async (
	opts: FetchCreateContextFnOptions,
): Promise<ClerkContext> => {
	// Extract householdId from headers (sent by the frontend)
	const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;

	// Get Clerk auth context
	const authResult = await auth();
	const clerkUser = await currentUser();

	let dbUser: typeof users.$inferSelect | null = null;
	let currentHouseholdId: string | null = null;
	let currentMembership: typeof memberships.$inferSelect | null = null;
	let availableHouseholds: Array<
		typeof households.$inferSelect & {
			membership: typeof memberships.$inferSelect;
		}
	> = [];

	// If user is authenticated, sync to database and get household info
	if (authResult?.userId && clerkUser) {
		try {
			// Sync user to database
			const clerkUserData: ClerkUserData = {
				userId: authResult.userId,
				email: clerkUser.emailAddresses[0]?.emailAddress || "",
				name:
					clerkUser.firstName && clerkUser.lastName
						? `${clerkUser.firstName} ${clerkUser.lastName}`
						: clerkUser.firstName || clerkUser.username || undefined,
				image: clerkUser.imageUrl,
				vetMedPreferences: clerkUser.unsafeMetadata?.vetMedPreferences as any,
				householdSettings: clerkUser.unsafeMetadata?.householdSettings as any,
				onboardingComplete: clerkUser.publicMetadata
					?.onboardingComplete as boolean,
			};

			dbUser = await syncUserToDatabase(clerkUserData);

			// Get user's household memberships
			const userMemberships = await db
				.select({
					id: memberships.id,
					userId: memberships.userId,
					householdId: memberships.householdId,
					role: memberships.role,
					createdAt: memberships.createdAt,
					updatedAt: memberships.updatedAt,
					household: {
						id: households.id,
						name: households.name,
						timezone: households.timezone,
						createdAt: households.createdAt,
						updatedAt: households.updatedAt,
					},
				})
				.from(memberships)
				.innerJoin(households, eq(memberships.householdId, households.id))
				.where(eq(memberships.userId, dbUser.id));

			availableHouseholds = userMemberships.map(
				({ household, ...membership }) => ({
					...household,
					membership,
				}),
			);

			// Determine current household
			if (requestedHouseholdId) {
				// User requested specific household
				const requestedMembership = userMemberships.find(
					(m) => m.householdId === requestedHouseholdId,
				);
				if (requestedMembership) {
					currentHouseholdId = requestedHouseholdId;
					currentMembership = requestedMembership;
				}
			}

			// Fall back to first household if none specified or requested household not found
			if (!currentHouseholdId && userMemberships.length > 0) {
				const firstMembership = userMemberships[0];
				currentHouseholdId = firstMembership.householdId;
				currentMembership = firstMembership;
			}

			// If user has no households, create a default one
			if (availableHouseholds.length === 0) {
				const defaultHouseholdName =
					(clerkUser.unsafeMetadata?.householdSettings
						?.primaryHouseholdName as string) ||
					`${clerkUser.firstName || "My"} Household`;

				const newHousehold = await db
					.insert(households)
					.values({
						name: defaultHouseholdName,
						timezone:
							(clerkUser.unsafeMetadata?.vetMedPreferences
								?.defaultTimezone as string) || "America/New_York",
					})
					.returning();

				const newMembership = await db
					.insert(memberships)
					.values({
						userId: dbUser.id,
						householdId: newHousehold[0].id,
						role: "OWNER",
					})
					.returning();

				currentHouseholdId = newHousehold[0].id;
				currentMembership = newMembership[0];
				availableHouseholds = [
					{
						...newHousehold[0],
						membership: newMembership[0],
					},
				];
			}
		} catch (error) {
			console.error("Error setting up user context:", error);
			// Continue with null user context if sync fails
		}
	}

	return {
		db,
		headers: opts.req.headers,
		requestedHouseholdId,
		auth: authResult,
		clerkUser,
		dbUser,
		currentHouseholdId,
		currentMembership,
		availableHouseholds,
	};
};

// Initialize tRPC with Clerk context
const t = initTRPC.context<ClerkContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Base procedures
export const publicProcedure = t.procedure;

// Protected procedure - requires Clerk authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.auth?.userId || !ctx.dbUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			// TypeScript now knows these are non-null
			auth: ctx.auth,
			clerkUser: ctx.clerkUser!,
			dbUser: ctx.dbUser,
		},
	});
});

// Household-scoped procedure - requires household membership
export const householdProcedure = protectedProcedure.use(
	async ({ ctx, next, input }) => {
		// Get householdId from input, context, or headers
		const householdId =
			(input as { householdId?: string })?.householdId ||
			ctx.currentHouseholdId ||
			ctx.requestedHouseholdId;

		if (!householdId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "householdId is required",
			});
		}

		// Check if user has membership in this household
		let membership = ctx.currentMembership;

		// If the requested household is different from current context, verify membership
		if (householdId !== ctx.currentHouseholdId) {
			const householdMembership = ctx.availableHouseholds.find(
				(h) => h.id === householdId,
			);

			if (!householdMembership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a member of this household",
				});
			}

			membership = householdMembership.membership;
		}

		if (!membership) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not a member of this household",
			});
		}

		return next({
			ctx: {
				...ctx,
				householdId,
				membership,
			},
		});
	},
);

// Owner-only procedure - requires OWNER role in household
export const ownerProcedure = householdProcedure.use(async ({ ctx, next }) => {
	if (ctx.membership.role !== "OWNER") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a household owner to perform this action",
		});
	}

	return next({ ctx });
});

// Export types
export type ClerkAppRouter = ReturnType<typeof createTRPCRouter>;
