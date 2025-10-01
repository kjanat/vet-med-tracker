import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { vetmedNotifications as notifications } from "@/db/schema";
import {
  createTRPCRouter,
  householdProcedure,
  protectedProcedure,
} from "../trpc";

export const notificationsRouter = createTRPCRouter({
  create: householdProcedure
    .input(
      z.object({
        actionUrl: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
        message: z.string(),
        priority: z
          .enum(["low", "medium", "high", "critical"])
          .default("medium"),
        title: z.string(),
        type: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hasAccess = ctx.availableHouseholds.some(
        (h) => h.id === ctx.householdId,
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot create notification for this household",
        });
      }

      const created = await ctx.db
        .insert(notifications)
        .values({
          actionUrl: input.actionUrl,
          data: input.data,
          householdId: ctx.householdId,
          message: input.message,
          priority: input.priority,
          title: input.title,
          type: input.type,
          userId: input.userId,
        })
        .returning();

      return created[0];
    }),

  getUnreadCount: protectedProcedure
    .input(
      z.object({
        householdId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { householdId } = input;

      const conditions = [
        eq(notifications.userId, ctx.dbUser.id),
        eq(notifications.read, false),
      ];

      if (householdId) {
        conditions.push(eq(notifications.householdId, householdId));
      }

      const result = await ctx.db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(notifications)
        .where(and(...conditions));

      return result[0]?.count ?? 0;
    }),

  list: protectedProcedure
    .input(
      z.object({
        householdId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { householdId, unreadOnly, limit, offset } = input;

      const conditions = [eq(notifications.userId, ctx.dbUser.id)];

      if (householdId) {
        conditions.push(eq(notifications.householdId, householdId));
      }

      if (unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      return ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
    }),

  markAsRead: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.dbUser.id),
          ),
        )
        .limit(1);

      if (!notification[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      const updated = await ctx.db
        .update(notifications)
        .set({
          read: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, input.id))
        .returning();

      return updated[0];
    }),
});
