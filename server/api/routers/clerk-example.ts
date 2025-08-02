import {
	protectedProcedure,
	publicProcedure,
	router,
} from "../trpc/clerk-trpc";

export const exampleRouter = router({
	hello: publicProcedure.query(({ ctx }) => {
		const { userId } = ctx.auth;

		if (!userId) {
			return {
				greeting: "Hello! You are not signed in.",
			};
		}

		return {
			greeting: `Hello ${userId}!`,
		};
	}),

	secret: protectedProcedure.query(({ ctx }) => {
		const { userId } = ctx.auth;

		return {
			secret: `${userId} is using a protected procedure`,
		};
	}),
});

export type ExampleRouter = typeof exampleRouter;
