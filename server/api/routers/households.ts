import { createTRPCRouter, publicProcedure } from "../trpc/init";

export const householdRouter = createTRPCRouter({
	// Placeholder - to be implemented
	list: publicProcedure.query(() => {
		return [];
	}),
});
