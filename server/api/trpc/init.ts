import { initTRPC, TRPCError } from "@trpc/server";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "../../db";
import type { User } from "../../db/schema";

// Context type definition
export interface Context {
	db: typeof db;
	user: User | null;
	householdId: string | null;
	session: {
		userId?: string;
	} | null;
	headers: Headers;
}

// Create context function for Next.js App Router
export const createTRPCContext = async (
	opts: FetchCreateContextFnOptions,
): Promise<Context> => {
	// TODO: Get session from NextAuth
	const session = null; // await getServerSession();
	const user = null; // await getUserFromSession(session);

	// Extract householdId from headers or default
	const householdId = opts.req.headers.get("x-household-id") || null;

	return {
		db,
		user,
		householdId,
		session,
		headers: opts.req.headers,
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
	if (!ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			...ctx,
			user: ctx.user, // user is non-null in protected procedures
		},
	});
});

// Household-scoped procedure - requires household membership
export const householdProcedure = protectedProcedure.use(
	async ({ ctx, next, input }) => {
		// Get householdId from input or context
		const householdId = (input as any)?.householdId || ctx.householdId;

		if (!householdId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "householdId is required",
			});
		}

		// TODO: Check membership
		// const membership = await ctx.db.query.memberships.findFirst({
		//   where: and(
		//     eq(memberships.userId, ctx.user.id),
		//     eq(memberships.householdId, householdId)
		//   ),
		// });

		// if (!membership) {
		//   throw new TRPCError({
		//     code: 'FORBIDDEN',
		//     message: 'Not a member of this household'
		//   });
		// }

		return next({
			ctx: {
				...ctx,
				householdId,
				// membership,
			},
		});
	},
);

// Export types
export type AppRouter = typeof appRouter;

// Placeholder for app router (will be created next)
const appRouter = createTRPCRouter({});
export { appRouter };
