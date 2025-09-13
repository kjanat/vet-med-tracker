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
        userId,
        success: await this.sendToUser(userId, payload),
      })),
    );

    return results.map((result, index) => {
      const userId = userIds[index];
      if (!userId) {
        throw new Error(`Missing userId at index ${index}`);
      }
      return {
        userId,
        success: result.status === "fulfilled" ? result.value.success : false,
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
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/badge-72x72.png",
        image: payload.image,
        data: {
          ...payload.data,
          url: payload.data?.url || "/",
          timestamp: Date.now(),
        },
        actions: payload.actions || [],
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
      });

      await webpush.sendNotification(
        subscription.subscription,
        notificationPayload,
        {
          urgency: payload.urgency || "normal",
          TTL: payload.ttl || 24 * 60 * 60, // 24 hours default
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
      id: row.id,
      userId: row.userId,
      subscription: {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dhKey,
          auth: row.authKey,
        },
      },
      userAgent: row.userAgent,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      lastUsed: row.lastUsed ? new Date(row.lastUsed) : null,
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
        .set({ lastUsed: new Date().toISOString() })
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
      title: `Medication Reminder: ${data.animalName}`,
      body: `Time to give ${data.medicationName} (${data.dosage})`,
      icon: "/icons/medication-reminder.png",
      badge: "/icons/badge-72x72.png",
      tag: `medication-${data.regimenId}`,
      data: {
        type: "medication_reminder",
        regimenId: data.regimenId,
        animalId: data.animalId,
        url: `/administer/${data.regimenId}`,
      },
      actions: [
        {
          action: "administer",
          title: "Mark as Given",
          icon: "/icons/check.png",
        },
        {
          action: "snooze",
          title: "Snooze 15min",
          icon: "/icons/snooze.png",
        },
      ],
      requireInteraction: true,
      urgency: "high",
    };
  }

  /**
   * Create a medication reminder notification
   */
  createMedicationReminder(data: MedicationReminder): PushNotificationPayload {
    return {
      title: `Medication Reminder: ${data.data.animalName}`,
      body: `Time to give ${data.data.medicationName} (${data.data.dose})`,
      icon: "/icons/medication-reminder.png",
      badge: "/icons/badge-72x72.png",
      tag: `medication-${data.data.regimenId}`,
      data: {
        type: "medication_reminder",
        regimenId: data.data.regimenId,
        animalId: data.data.animalId,
        url: `/administer/${data.data.regimenId}`,
      },
      actions: [
        {
          action: "administer",
          title: "Mark as Given",
          icon: "/icons/check.png",
        },
        {
          action: "snooze",
          title: "Snooze 15min",
          icon: "/icons/snooze.png",
        },
      ],
      requireInteraction: true,
      urgency: "high",
    };
  }

  /**
   * Create a co-sign request notification
   */
  createCosignRequest(data: CosignRequest): PushNotificationPayload {
    return {
      title: "Co-signature Required",
      body: `${data.data.requesterName} needs you to co-sign a ${data.data.medicationName} administration for ${data.data.animalName}`,
      icon: "/icons/cosign-request.png",
      badge: "/icons/badge-72x72.png",
      tag: `cosign-${data.data.cosignRequestId}`,
      data: {
        type: "cosign_request",
        cosignRequestId: data.data.cosignRequestId,
        requesterId: data.data.requesterId,
        url: `/cosign/${data.data.cosignRequestId}`,
      },
      actions: [
        {
          action: "approve",
          title: "Approve",
          icon: "/icons/approve.png",
        },
        {
          action: "view",
          title: "View Details",
          icon: "/icons/view.png",
        },
      ],
      requireInteraction: true,
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
      title: "Low Inventory Warning",
      body: `${data.data.medicationName} is running low (${data.data.daysRemaining} days left)`,
      icon: "/icons/low-inventory.png",
      badge: "/icons/badge-72x72.png",
      tag: `inventory-${data.data.inventoryItemId}`,
      data: {
        type: "low_inventory",
        inventoryItemId: data.data.inventoryItemId,
        medicationId: data.data.inventoryItemId, // Using inventoryItemId as medicationId since it's not in schema
        url: `/inventory/${data.data.inventoryItemId}`,
      },
      actions: [
        {
          action: "reorder",
          title: "Reorder",
          icon: "/icons/reorder.png",
        },
        {
          action: "view",
          title: "View Details",
          icon: "/icons/view.png",
        },
      ],
      urgency: "normal",
    };
  }

  /**
   * Create a system announcement notification
   */
  createSystemAnnouncement(data: SystemAnnouncement): PushNotificationPayload {
    return {
      title: data.title,
      body: data.body,
      icon: "/icons/announcement.png",
      badge: "/icons/badge-72x72.png",
      tag: `announcement-${data.data.announcementId}`,
      data: {
        type: "system_announcement",
        announcementId: data.data.announcementId,
        url: "/", // No actionUrl in the schema
      },
      urgency: data.data.priority === "high" ? "high" : "normal",
      requireInteraction:
        data.data.priority === "high" || data.data.priority === "critical",
    };
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
