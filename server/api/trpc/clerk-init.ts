import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";
import { dbPooled as db } from "@/db/drizzle";
import type { households, memberships, users } from "@/db/schema";
import { createTRPCConnectionMiddleware } from "@/lib/infrastructure/connection-middleware";
import {
	createEnhancedError,
	setupGlobalErrorHandling,
	toUserFriendlyError,
} from "@/lib/infrastructure/error-handling";
import {
	determineCurrentHousehold,
	setupAuthenticatedUser,
} from "./clerk-context-helpers";

// Context type definition
export interface ClerkContext {
	db: typeof db;
	headers: Headers;
	requestedHouseholdId: string | null;
	auth: Awaited<ReturnType<typeof auth>> | null;
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

	// Initialize empty context
	const baseContext = {
		db,
		headers: opts.req.headers,
		requestedHouseholdId,
		auth: authResult,
		clerkUser,
		dbUser: null as typeof users.$inferSelect | null,
		currentHouseholdId: null as string | null,
		currentMembership: null as typeof memberships.$inferSelect | null,
		availableHouseholds: [] as ClerkContext["availableHouseholds"],
	};

	// If user is not authenticated, return base context
	if (!authResult?.userId || !clerkUser) {
		return baseContext;
	}

	// Setup authenticated user context
	try {
		const userContext = await setupAuthenticatedUser(
			authResult.userId,
			clerkUser,
		);

		// Determine current household if not already set
		if (
			!userContext.currentHouseholdId &&
			userContext.availableHouseholds.length > 0
		) {
			const { currentHouseholdId, currentMembership } =
				determineCurrentHousehold(
					userContext.availableHouseholds,
					requestedHouseholdId,
				);
			userContext.currentHouseholdId = currentHouseholdId;
			userContext.currentMembership = currentMembership;
		}

		return {
			...baseContext,
			...userContext,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const errorDetails = {
			userId: authResult.userId,
			email: clerkUser?.emailAddresses[0]?.emailAddress,
			name: clerkUser?.firstName,
			errorMessage,
			databaseUrl: process.env.DATABASE_URL ? "configured" : "missing",
			nodeEnv: process.env.NODE_ENV,
			timestamp: new Date().toISOString(),
		};

		console.error("Error setting up user context:", error);
		console.error("Context setup failed with details:", errorDetails);

		// In production, we should throw an error to prevent silent failures
		if (process.env.NODE_ENV === "production") {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Failed to initialize user context: ${errorMessage}. Please try refreshing the page. If the problem persists, contact support.`,
				cause: {
					...errorDetails,
					originalError: error,
				},
			});
		}

		// Continue with base context if sync fails in development
		return baseContext;
	}
};

// Setup global error handling
setupGlobalErrorHandling();

// Initialize tRPC with Clerk context and enhanced error handling
const t = initTRPC.context<ClerkContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error, path }) {
		// Create enhanced error for reporting
		const enhancedError = createEnhancedError(error, {
			endpoint: "trpc",
			operation: path || "unknown",
		});

		// Report error for monitoring (ErrorReporter not implemented)
		console.error("Error:", enhancedError);

		// Convert to user-friendly error
		const userFriendlyError = toUserFriendlyError(error);

		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
				userFriendly: {
					message: userFriendlyError.userMessage,
					suggestedActions: userFriendlyError.suggestedActions,
					retryable: userFriendlyError.retryable,
					retryAfter: userFriendlyError.retryAfter,
					degraded: userFriendlyError.degradedMode,
					contactSupport: userFriendlyError.contactSupport,
				},
				errorId: enhancedError.id,
			},
		};
	},
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Connection middleware for tRPC procedures
const connectionMiddleware = createTRPCConnectionMiddleware();

// Base procedures
// @ts-expect-error - Connection middleware type compatibility issue
export const publicProcedure = t.procedure.use(connectionMiddleware);

// Protected procedure - requires Clerk authentication
export const protectedProcedure = t.procedure
	// @ts-expect-error - Connection middleware type compatibility issue
	.use(connectionMiddleware)
	.use(async ({ ctx, next }) => {
		if (!ctx.auth?.userId || !ctx.dbUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You must be logged in to perform this action",
			});
		}

		if (!ctx.clerkUser) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Clerk user data is missing",
			});
		}

		return next({
			ctx: {
				...ctx,
				// TypeScript now knows these are non-null
				auth: ctx.auth,
				clerkUser: ctx.clerkUser,
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
