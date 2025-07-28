import { createTRPCRouter, publicProcedure } from '../trpc/init';

export const regimenRouter = createTRPCRouter({
  // Placeholder - to be implemented
  list: publicProcedure.query(() => {
    return [];
  }),
});