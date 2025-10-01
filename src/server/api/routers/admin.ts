import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { vetmedAdministrations as administrations } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  cosign: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        notes: z.string().optional(),
        recordId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(administrations)
        .set({
          coSignUserId: ctx.dbUser.id,
        })
        .where(
          and(
            eq(administrations.id, input.recordId),
            eq(administrations.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        recordId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(administrations)
        .where(
          and(
            eq(administrations.id, input.recordId),
            eq(administrations.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  list: protectedProcedure
    .input(
      z.object({
        endDate: z.string().optional(),
        householdId: z.uuid(),
        startDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(administrations)
        .where(eq(administrations.householdId, input.householdId))
        .orderBy(desc(administrations.recordedAt));
    }),

  undo: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        recordId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Mark as undone by updating status
      await ctx.db
        .update(administrations)
        .set({
          status: "MISSED", // or create an UNDONE status
        })
        .where(
          and(
            eq(administrations.id, input.recordId),
            eq(administrations.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),
});
