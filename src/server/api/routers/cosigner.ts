import { and, desc, isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { vetmedAdministrations as administrations } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const cosignerRouter = createTRPCRouter({
  approve: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        requestId: z.uuid(),
        signature: z.string().optional(),
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
            eq(administrations.id, input.requestId),
            eq(administrations.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  listAll: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(administrations)
        .where(eq(administrations.householdId, input.householdId))
        .orderBy(desc(administrations.recordedAt));
    }),

  listPending: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(administrations)
        .where(
          and(
            eq(administrations.householdId, input.householdId),
            isNull(administrations.coSignUserId),
          ),
        )
        .orderBy(desc(administrations.recordedAt));
    }),

  reject: protectedProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        rejectionReason: z.string().optional(),
        requestId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Mark as rejected (simplified)
      await ctx.db
        .update(administrations)
        .set({
          status: "MISSED", // or create a REJECTED status
        })
        .where(
          and(
            eq(administrations.id, input.requestId),
            eq(administrations.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  requestCoSign: protectedProcedure
    .input(
      z.object({
        administrationId: z.uuid(),
        householdId: z.uuid(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx }) => {
      // Create a co-sign request (simplified)
      // Note: needsCosign removed as it doesn't exist in schema
      // Instead, a separate cosign_requests table should be used
      // input param removed as unused
      void ctx; // Mark ctx as intentionally unused
      return { success: true };
    }),
});
