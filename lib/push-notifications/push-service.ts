/**
 * Push Notification Service
 * Handles sending push notifications to subscribed users
 */

import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import type { db as _db } from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import type {
  CosignRequest,
  LowInventoryWarning,
  MedicationReminder,
  PushNotificationPayload,
  SystemAnnouncement,
} from "@/lib/schemas/push-notifications";
import { getVAPIDConfig } from "./vapid-config";

export interface PushSubscriptionData {
  id: string;
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string | null;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date | null;
}

/**
 * Push Notification Service Class
 */
export class PushNotificationService {
  private vapidConfig: ReturnType<typeof getVAPIDConfig>;

  constructor() {
    this.vapidConfig = getVAPIDConfig();
    if (this.vapidConfig) {
      this.setupWebPush();
    }
  }

  private setupWebPush() {
    if (!this.vapidConfig) return;

    webpush.setVapidDetails(
      this.vapidConfig.subject,
      this.vapidConfig.publicKey,
      this.vapidConfig.privateKey,
    );
  }

  /**
   * Check if push notifications are enabled
   */
  isEnabled(): boolean {
    return this.vapidConfig !== null;
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    _householdId?: string,
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      console.warn("Push notifications are disabled - VAPID not configured");
      return false;
    }

    try {
      const db = (await import("@/db/drizzle")).db;

      // Get active subscriptions for the user
      const subscriptions = await this.getUserSubscriptions(db, userId);

      if (subscriptions.length === 0) {
        console.log(`No active subscriptions found for user ${userId}`);
        return false;
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub) => this.sendNotification(sub, payload)),
      );

      // Count successful sends
      const successCount = results.filter(
        (result) => result.status === "fulfilled" && result.value,
      ).length;

      console.log(
        `Sent ${successCount}/${subscriptions.length} notifications to user ${userId}`,
      );

      return successCount > 0;
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send a push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    _householdId?: string,
  ): Promise<{ userId: string; success: boolean }[]> {
    const results = await Promise.allSettled(
      userIds.map(async (userId) => ({
        success: await this.sendToUser(userId, payload),
        userId,
      })),
    );

    return results.map((result, index) => {
      const userId = userIds[index];
      if (!userId) {
        throw new Error(`Missing userId at index ${index}`);
      }
      return {
        success: result.status === "fulfilled" ? result.value.success : false,
        userId,
      };
    });
  }

  /**
   * Send a push notification to all users in a household
   * Note: This is a placeholder since the schema doesn't support household-level subscriptions
   */
  async sendToHousehold(
    _householdId: string,
    _payload: PushNotificationPayload,
    _excludeUserId?: string,
  ): Promise<number> {
    if (!this.isEnabled()) {
      console.warn("Push notifications are disabled - VAPID not configured");
      return 0;
    }

    console.warn(
      "sendToHousehold not implemented - push subscriptions are user-level only",
    );
    return 0;
  }

  /**
   * Send a single push notification to a subscription
   */
  private async sendNotification(
    subscription: PushSubscriptionData,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const notificationPayload = JSON.stringify({
        actions: payload.actions || [],
        badge: payload.badge || "/icons/badge-72x72.png",
        body: payload.body,
        data: {
          ...payload.data,
          timestamp: Date.now(),
          url: payload.data?.url || "/",
        },
        icon: payload.icon || "/icons/icon-192x192.png",
        image: payload.image,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag,
        title: payload.title,
      });

      await webpush.sendNotification(
        subscription.subscription,
        notificationPayload,
        {
          TTL: payload.ttl || 24 * 60 * 60, // 24 hours default
          urgency: payload.urgency || "normal",
        },
      );

      // Update last used timestamp
      await this.updateSubscriptionLastUsed(subscription.id);

      return true;
    } catch (error: unknown) {
      console.error(
        `Failed to send notification to subscription ${subscription.id}:`,
        error,
      );

      // Handle invalid/expired subscriptions
      if (
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        (error.statusCode === 410 || error.statusCode === 404)
      ) {
        await this.removeInvalidSubscription(subscription.id);
      }

      return false;
    }
  }

  /**
   * Get active subscriptions for a user
   */
  private async getUserSubscriptions(
    db: typeof _db,
    userId: string,
  ): Promise<PushSubscriptionData[]> {
    const result = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true),
        ),
      );

    return result.map((row) => ({
      createdAt: new Date(row.createdAt),
      id: row.id,
      isActive: row.isActive,
      lastUsed: row.lastUsed ? new Date(row.lastUsed) : null,
      subscription: {
        endpoint: row.endpoint,
        keys: {
          auth: row.authKey,
          p256dh: row.p256dhKey,
        },
      },
      userAgent: row.userAgent,
      userId: row.userId,
    }));
  }

  /**
   * Update subscription last used timestamp
   */
  private async updateSubscriptionLastUsed(
    subscriptionId: string,
  ): Promise<void> {
    try {
      const db = (await import("@/db/drizzle")).db;
      await db
        .update(pushSubscriptions)
        .set({ lastUsed: new Date() })
        .where(eq(pushSubscriptions.id, subscriptionId));
    } catch (error) {
      console.error(
        `Failed to update subscription last used: ${subscriptionId}`,
        error,
      );
    }
  }

  /**
   * Remove invalid subscription from database
   */
  private async removeInvalidSubscription(
    subscriptionId: string,
  ): Promise<void> {
    try {
      const db = (await import("@/db/drizzle")).db;
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscriptionId));
      console.log(`Removed invalid subscription: ${subscriptionId}`);
    } catch (error) {
      console.error(
        `Failed to remove invalid subscription: ${subscriptionId}`,
        error,
      );
    }
  }

  /**
   * Create a medication reminder notification from data properties
   * Helper method that accepts individual properties instead of full MedicationReminder type
   */
  createMedicationReminderFromData(data: {
    animalId: string;
    animalName: string;
    regimenId: string;
    medicationName: string;
    dosage: string;
  }): PushNotificationPayload {
    return {
      actions: [
        {
          action: "administer",
          icon: "/icons/check.png",
          title: "Mark as Given",
        },
        {
          action: "snooze",
          icon: "/icons/snooze.png",
          title: "Snooze 15min",
        },
      ],
      badge: "/icons/badge-72x72.png",
      body: `Time to give ${data.medicationName} (${data.dosage})`,
      data: {
        animalId: data.animalId,
        regimenId: data.regimenId,
        type: "medication_reminder",
        url: `/administer/${data.regimenId}`,
      },
      icon: "/icons/medication-reminder.png",
      requireInteraction: true,
      tag: `medication-${data.regimenId}`,
      title: `Medication Reminder: ${data.animalName}`,
      urgency: "high",
    };
  }

  /**
   * Create a medication reminder notification
   */
  createMedicationReminder(data: MedicationReminder): PushNotificationPayload {
    return {
      actions: [
        {
          action: "administer",
          icon: "/icons/check.png",
          title: "Mark as Given",
        },
        {
          action: "snooze",
          icon: "/icons/snooze.png",
          title: "Snooze 15min",
        },
      ],
      badge: "/icons/badge-72x72.png",
      body: `Time to give ${data.data.medicationName} (${data.data.dose})`,
      data: {
        animalId: data.data.animalId,
        regimenId: data.data.regimenId,
        type: "medication_reminder",
        url: `/administer/${data.data.regimenId}`,
      },
      icon: "/icons/medication-reminder.png",
      requireInteraction: true,
      tag: `medication-${data.data.regimenId}`,
      title: `Medication Reminder: ${data.data.animalName}`,
      urgency: "high",
    };
  }

  /**
   * Create a co-sign request notification
   */
  createCosignRequest(data: CosignRequest): PushNotificationPayload {
    return {
      actions: [
        {
          action: "approve",
          icon: "/icons/approve.png",
          title: "Approve",
        },
        {
          action: "view",
          icon: "/icons/view.png",
          title: "View Details",
        },
      ],
      badge: "/icons/badge-72x72.png",
      body: `${data.data.requesterName} needs you to co-sign a ${data.data.medicationName} administration for ${data.data.animalName}`,
      data: {
        cosignRequestId: data.data.cosignRequestId,
        requesterId: data.data.requesterId,
        type: "cosign_request",
        url: `/cosign/${data.data.cosignRequestId}`,
      },
      icon: "/icons/cosign-request.png",
      requireInteraction: true,
      tag: `cosign-${data.data.cosignRequestId}`,
      title: "Co-signature Required",
      urgency: "high",
    };
  }

  /**
   * Create a low inventory warning notification
   */
  createLowInventoryWarning(
    data: LowInventoryWarning,
  ): PushNotificationPayload {
    return {
      actions: [
        {
          action: "reorder",
          icon: "/icons/reorder.png",
          title: "Reorder",
        },
        {
          action: "view",
          icon: "/icons/view.png",
          title: "View Details",
        },
      ],
      badge: "/icons/badge-72x72.png",
      body: `${data.data.medicationName} is running low (${data.data.daysRemaining} days left)`,
      data: {
        inventoryItemId: data.data.inventoryItemId,
        medicationId: data.data.inventoryItemId, // Using inventoryItemId as medicationId since it's not in schema
        type: "low_inventory",
        url: `/inventory/${data.data.inventoryItemId}`,
      },
      icon: "/icons/low-inventory.png",
      tag: `inventory-${data.data.inventoryItemId}`,
      title: "Low Inventory Warning",
      urgency: "normal",
    };
  }

  /**
   * Create a system announcement notification
   */
  createSystemAnnouncement(data: SystemAnnouncement): PushNotificationPayload {
    return {
      badge: "/icons/badge-72x72.png",
      body: data.body,
      data: {
        announcementId: data.data.announcementId,
        type: "system_announcement",
        url: "/", // No actionUrl in the schema
      },
      icon: "/icons/announcement.png",
      requireInteraction:
        data.data.priority === "high" || data.data.priority === "critical",
      tag: `announcement-${data.data.announcementId}`,
      title: data.title,
      urgency: data.data.priority === "high" ? "high" : "normal",
    };
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
