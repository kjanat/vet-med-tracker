import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";
import { type AuthContext, getAuthContext } from "../../auth";
import { db } from "../../db";

// Context type definition
export interface Context extends AuthContext {
	db: typeof db;
	headers: Headers;
	requestedHouseholdId: string | null;
}

// Create context function for Next.js App Router
export const createTRPCContext = async (
	opts: FetchCreateContextFnOptions,
): Promise<Context> => {
	// Extract householdId from headers (sent by the frontend)
	const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;

	// Get auth context
	const authContext = await getAuthContext(
		opts.req.headers,
		requestedHouseholdId,
	);

	return {
		db,
		headers: opts.req.headers,
		requestedHouseholdId,
		...authContext,
	};
};

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
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

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session || !ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			// TypeScript now knows these are non-null
			session: ctx.session,
			user: ctx.user,
		},
	});
});

// Household-scoped procedure - requires household membership
export const householdProcedure = protectedProcedure.use(
	async ({ ctx, next, input }) => {
		// Get householdId from input, context, or headers
		const householdId =
			(input as any)?.householdId ||
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
			membership =
				ctx.session.householdMemberships.find(
					(m) => m.householdId === householdId,
				) || null;
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

// Export types
export type AppRouter = typeof appRouter;

// Placeholder for app router (will be created next)
const appRouter = createTRPCRouter({});
export { appRouter };
