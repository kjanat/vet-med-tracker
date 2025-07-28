import { createTRPCRouter, publicProcedure } from "../trpc/init";

export const inventoryRouter = createTRPCRouter({
	// Placeholder - to be implemented
	list: publicProcedure.query(() => {
		return [];
	}),
});
