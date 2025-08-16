import { and, desc, eq, inArray, sql } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";
import { notifications, pushSubscriptions } from "@/db/schema";
import { getVAPIDConfig } from "@/lib/push-notifications/vapid-config";
import { pushSubscriptionWithDeviceSchema } from "@/lib/schemas/push-notifications";
import {
  createTRPCRouter,
  householdProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

export const notificationsRouter = createTRPCRouter({
  // List notifications for the current user, optionally filtered by household
  list: protectedProcedure
    .input(
      z.object({
        householdId: z.string().optional(),
        unreadOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { householdId, unreadOnly, limit, offset } = input;

      // Build where conditions
      const conditions = [eq(notifications.userId, ctx.dbUser.id)];

      if (householdId) {
        conditions.push(eq(notifications.householdId, householdId));
      }

      if (unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      const notificationList = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return notificationList;
    }),

  // Get unread count for the current user, optionally scoped to a household
  getUnreadCount: protectedProcedure
    .input(
      z.object({
        householdId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { householdId } = input;

      // Build where conditions
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

  // Mark a single notification as read
  markAsRead: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to the user
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
        throw new Error("Notification not found");
      }

      // Update the notification
      const updated = await ctx.db
        .update(notifications)
        .set({
          read: true,
          readAt: new Date().toISOString(),
        })
        .where(eq(notifications.id, input.id))
        .returning();

      return updated[0];
    }),

  // Mark multiple notifications as read
  markMultipleAsRead: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all notifications belong to the user
      const userNotifications = await ctx.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            inArray(notifications.id, input.ids),
            eq(notifications.userId, ctx.dbUser.id),
          ),
        );

      const validIds = userNotifications.map((n) => n.id);

      if (validIds.length === 0) {
        throw new Error("No valid notifications found");
      }

      // Update the notifications
      const updated = await ctx.db
        .update(notifications)
        .set({
          read: true,
          readAt: new Date().toISOString(),
        })
        .where(inArray(notifications.id, validIds))
        .returning();

      return updated;
    }),

  // Mark all notifications as read for the current user, optionally scoped to a household
  markAllAsRead: protectedProcedure
    .input(
      z.object({
        householdId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { householdId } = input;

      // Build where conditions
      const conditions = [
        eq(notifications.userId, ctx.dbUser.id),
        eq(notifications.read, false),
      ];

      if (householdId) {
        conditions.push(eq(notifications.householdId, householdId));
      }

      const updated = await ctx.db
        .update(notifications)
        .set({
          read: true,
          readAt: new Date().toISOString(),
        })
        .where(and(...conditions))
        .returning();

      return updated;
    }),

  // Dismiss (soft delete) a notification
  dismiss: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to the user
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
        throw new Error("Notification not found");
      }

      // Update the notification
      const updated = await ctx.db
        .update(notifications)
        .set({
          dismissed: true,
          dismissedAt: new Date().toISOString(),
        })
        .where(eq(notifications.id, input.id))
        .returning();

      return updated[0];
    }),

  // Delete a notification permanently
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the notification belongs to the user
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
        throw new Error("Notification not found");
      }

      // Delete the notification
      const deleted = await ctx.db
        .delete(notifications)
        .where(eq(notifications.id, input.id))
        .returning();

      return deleted[0];
    }),

  // Create a notification (typically used by system/background jobs)
  create: householdProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        priority: z
          .enum(["low", "medium", "high", "critical"])
          .default("medium"),
        actionUrl: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the target user has access to this household
      const hasAccess = ctx.availableHouseholds.some(
        (h) => h.id === ctx.householdId,
      );

      if (!hasAccess) {
        throw new Error("Cannot create notification for this household");
      }

      const created = await ctx.db
        .insert(notifications)
        .values({
          userId: input.userId,
          householdId: ctx.householdId,
          type: input.type,
          title: input.title,
          message: input.message,
          priority: input.priority,
          actionUrl: input.actionUrl,
          data: input.data,
        })
        .returning();

      return created[0];
    }),

  // Bulk create notifications (for system notifications to multiple users)
  createBulk: householdProcedure
    .input(
      z.object({
        userIds: z.array(z.string()).min(1),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        priority: z
          .enum(["low", "medium", "high", "critical"])
          .default("medium"),
        actionUrl: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the household access
      const hasAccess = ctx.availableHouseholds.some(
        (h) => h.id === ctx.householdId,
      );

      if (!hasAccess) {
        throw new Error("Cannot create notifications for this household");
      }

      // Create notifications for all users
      const notificationsToCreate = input.userIds.map((userId) => ({
        userId,
        householdId: ctx.householdId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority,
        actionUrl: input.actionUrl,
        data: input.data,
      }));

      const created = await ctx.db
        .insert(notifications)
        .values(notificationsToCreate)
        .returning();

      return created;
    }),

  // Push notification subscription management
  subscribeToPush: protectedProcedure
    .input(pushSubscriptionWithDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      const { endpoint, keys, deviceInfo } = input;

      // Check if subscription already exists
      const existingSubscription = await ctx.db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, endpoint))
        .limit(1);

      if (existingSubscription[0]) {
        // Update existing subscription
        const updated = await ctx.db
          .update(pushSubscriptions)
          .set({
            userId: ctx.dbUser.id,
            p256dhKey: keys.p256dh,
            authKey: keys.auth,
            userAgent: deviceInfo?.userAgent || null,
            deviceName: deviceInfo?.deviceName || null,
            isActive: true,
            lastUsed: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pushSubscriptions.endpoint, endpoint))
          .returning();

        return updated[0];
      }

      // Create new subscription
      const created = await ctx.db
        .insert(pushSubscriptions)
        .values({
          userId: ctx.dbUser.id,
          endpoint,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
          userAgent: deviceInfo?.userAgent || null,
          deviceName: deviceInfo?.deviceName || null,
        })
        .returning();

      return created[0];
    }),

  unsubscribeFromPush: protectedProcedure
    .input(z.object({ endpoint: z.url() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(pushSubscriptions)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(pushSubscriptions.endpoint, input.endpoint),
            eq(pushSubscriptions.userId, ctx.dbUser.id),
          ),
        )
        .returning();

      return updated[0] || null;
    }),

  listPushSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, ctx.dbUser.id),
          eq(pushSubscriptions.isActive, true),
        ),
      )
      .orderBy(desc(pushSubscriptions.lastUsed));

    return subscriptions;
  }),

  deletePushSubscription: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify subscription belongs to user
      const subscription = await ctx.db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.id, input.id),
            eq(pushSubscriptions.userId, ctx.dbUser.id),
          ),
        )
        .limit(1);

      if (!subscription[0]) {
        throw new Error("Push subscription not found");
      }

      const deleted = await ctx.db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, input.id))
        .returning();

      return deleted[0];
    }),

  sendTestNotification: protectedProcedure.mutation(async ({ ctx }) => {
    // Get user's active push subscriptions
    const userSubscriptions = await ctx.db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, ctx.dbUser.id),
          eq(pushSubscriptions.isActive, true),
        ),
      );

    if (userSubscriptions.length === 0) {
      throw new Error("No active push subscriptions found");
    }

    // Configure web-push
    const vapidConfig = getVAPIDConfig();
    if (!vapidConfig) {
      throw new Error("VAPID configuration not available");
    }
    webpush.setVapidDetails(
      vapidConfig.subject,
      vapidConfig.publicKey,
      vapidConfig.privateKey,
    );

    const payload = {
      title: "VetMed Tracker Test",
      body: "Push notifications are working correctly!",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "test-notification",
      data: {
        type: "test",
        timestamp: Date.now(),
      },
    };

    const results = [];

    for (const subscription of userSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          },
          JSON.stringify(payload),
          {
            TTL: 3600, // 1 hour
            urgency: "normal",
          },
        );

        // Update last used timestamp
        await ctx.db
          .update(pushSubscriptions)
          .set({
            lastUsed: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pushSubscriptions.id, subscription.id));

        results.push({ success: true, subscriptionId: subscription.id });
      } catch (error) {
        console.error("Push notification failed:", error);

        // If subscription is invalid, mark as inactive
        if (
          error instanceof Error &&
          "statusCode" in error &&
          error.statusCode === 410
        ) {
          await ctx.db
            .update(pushSubscriptions)
            .set({
              isActive: false,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(pushSubscriptions.id, subscription.id));
        }

        results.push({
          success: false,
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }),

  getVAPIDPublicKey: protectedProcedure.query(() => {
    const vapidConfig = getVAPIDConfig();
    if (!vapidConfig) {
      throw new Error("VAPID configuration not available");
    }
    return { publicKey: vapidConfig.publicKey };
  }),
});
