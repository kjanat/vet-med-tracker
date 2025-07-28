import { createTRPCRouter, publicProcedure } from '../trpc/init';

export const adminRouter = createTRPCRouter({
  // Placeholder - to be implemented
  recordAdministration: publicProcedure.mutation(() => {
    return { success: true };
  }),
});