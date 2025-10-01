import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const auditRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx }) => {
      // Simplified audit log - return mock data
      return [
        {
          action: "READ",
          details: {},
          id: "1",
          resource: "animal",
          resourceId: "test",
          timestamp: new Date(),
          userId: ctx.dbUser.id,
        },
      ];
    }),

  log: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        details: z.record(z.string(), z.any()).optional(),
        resource: z.string(),
        resourceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Log audit event (simplified)
      console.log("[AUDIT]", {
        ...input,
        timestamp: new Date(),
        userId: ctx.dbUser.id,
      });
      return { success: true };
    }),
});
