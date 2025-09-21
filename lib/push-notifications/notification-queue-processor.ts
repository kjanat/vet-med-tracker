/**
 * Notification Queue Processor
 * Processes queued notifications and sends them via PushNotificationService
 */

import { and, eq, isNull, lte } from "drizzle-orm";
import { DateTime } from "luxon";
import cron from "node-cron";
import type { db } from "@/db/drizzle";
import { notificationQueue } from "@/db/schema";
import type { PushNotificationPayload } from "@/lib/schemas/push-notifications";
import { pushNotificationService } from "./push-service";

interface QueuedNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  userId: string;
  householdId: string;
  scheduledFor: Date;
  attempts: number;
  error?: string | null;
}

export class NotificationQueueProcessor {
  private db: typeof db;
  private processingJob: ReturnType<typeof cron.schedule> | null = null;
  private isRunning = false;
  private processingInterval = 30; // seconds

  constructor(database: typeof db) {
    this.db = database;
  }

  /**
   * Start the notification queue processor
   */
  start(): void {
    if (this.isRunning) {
      console.log("Notification queue processor is already running");
      return;
    }

    console.log("Starting notification queue processor...");

    // Process notification queue every 30 seconds
    this.processingJob = cron.schedule(
      `*/${this.processingInterval} * * * * *`,
      () => {
        this.processQueue().catch(console.error);
      },
      {
        timezone: "UTC",
      },
    );

    this.processingJob.start();
    this.isRunning = true;
    console.log("Notification queue processor started successfully");
  }

  /**
   * Stop the notification queue processor
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("Notification queue processor is not running");
      return;
    }

    console.log("Stopping notification queue processor...");

    if (this.processingJob) {
      this.processingJob.stop();
      this.processingJob = null;
    }

    this.isRunning = false;
    console.log("Notification queue processor stopped");
  }

  /**
   * Get processor status
   */
  getStatus(): { isRunning: boolean; processingInterval: number } {
    return {
      isRunning: this.isRunning,
      processingInterval: this.processingInterval,
    };
  }

  /**
   * Process queued notifications that are ready to be sent
   */
  async processQueue(): Promise<void> {
    try {
      console.log("Processing notification queue...");

      const now = DateTime.utc().toJSDate();

      // Get notifications that are ready to be sent
      const pendingNotifications =
        await this.db.query.notificationQueue.findMany({
          limit: 50, // Process in batches
          orderBy: (notifications, { asc }) => [
            asc(notifications.scheduledFor),
          ],
          where: (notifications, { and, isNull, lte, lt }) =>
            and(
              isNull(notifications.sentAt), // Not yet sent
              lte(notifications.scheduledFor, now), // Scheduled time has passed
              lt(notifications.attempts, 3), // Haven't exceeded max retry attempts
            ),
        });

      console.log(
        `Found ${pendingNotifications.length} notifications to process`,
      );

      if (pendingNotifications.length === 0) {
        return;
      }

      // Process each notification
      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }

      console.log("Notification queue processing completed");
    } catch (error) {
      console.error("Error processing notification queue:", error);
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(
    notification: QueuedNotification,
  ): Promise<void> {
    try {
      console.log(
        `Processing notification ${notification.id} for user ${notification.userId}`,
      );

      // Create push notification payload
      const payload = this.createPushPayload(notification);

      // Attempt to send notification
      const success = await pushNotificationService.sendToUser(
        notification.userId,
        payload,
        notification.householdId,
      );

      if (success) {
        // Mark as sent
        await this.markAsSent(notification.id);
        console.log(`Successfully sent notification ${notification.id}`);
      } else {
        // Increment attempts and set error
        await this.markAsFailed(
          notification.id,
          "Failed to send push notification",
        );
        console.log(`Failed to send notification ${notification.id}`);
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);

      // Increment attempts and set error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.markAsFailed(notification.id, errorMessage);
    }
  }

  /**
   * Create push notification payload from queued notification
   */
  private createPushPayload(
    notification: QueuedNotification,
  ): PushNotificationPayload {
    // Safely cast data to a structured record
    const notificationData =
      notification.data && typeof notification.data === "object"
        ? (notification.data as Record<string, unknown>)
        : {};

    const basePayload: PushNotificationPayload = {
      body: notification.body,
      data: {
        ...notificationData,
        notificationId: notification.id,
        timestamp: Date.now(),
      },
      tag: `${notification.type}-${notification.id}`,
      title: notification.title,
    };

    // Add type-specific enhancements
    switch (notification.type) {
      case "medication_reminder":
        return {
          ...basePayload,
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
          data: {
            ...basePayload.data,
            url: `/medication/${notificationData?.regimenId || ""}`,
          },
          icon: "/icons/medication-reminder.png",
          requireInteraction: true,
          urgency: notificationData?.isOverdue ? "high" : "normal",
        };

      case "low_inventory":
        return {
          ...basePayload,
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
          data: {
            ...basePayload.data,
            url: `/inventory/${notificationData?.inventoryItemId || ""}`,
          },
          icon: "/icons/low-inventory.png",
          urgency: "normal",
        };

      case "cosign_request":
        return {
          ...basePayload,
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
          data: {
            ...basePayload.data,
            url: `/cosign/${notificationData?.cosignRequestId || ""}`,
          },
          icon: "/icons/cosign-request.png",
          requireInteraction: true,
          urgency: "high",
        };

      case "system_announcement":
        return {
          ...basePayload,
          badge: "/icons/badge-72x72.png",
          data: {
            ...basePayload.data,
            url: "/",
          },
          icon: "/icons/announcement.png",
          requireInteraction:
            notificationData?.priority === "high" ||
            notificationData?.priority === "critical",
          urgency: notificationData?.priority === "high" ? "high" : "normal",
        };

      default:
        return {
          ...basePayload,
          badge: "/icons/badge-72x72.png",
          data: {
            ...basePayload.data,
            url: "/",
          },
          icon: "/icons/notification.png",
          urgency: "normal",
        };
    }
  }

  /**
   * Mark notification as successfully sent
   */
  private async markAsSent(notificationId: string): Promise<void> {
    try {
      await this.db
        .update(notificationQueue)
        .set({
          error: null, // Clear any previous error
          sentAt: new Date(),
        })
        .where(eq(notificationQueue.id, notificationId));
    } catch (error) {
      console.error(
        `Failed to mark notification ${notificationId} as sent:`,
        error,
      );
    }
  }

  /**
   * Mark notification as failed and increment attempts
   */
  private async markAsFailed(
    notificationId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      // Get current attempts count
      const current = await this.db.query.notificationQueue.findFirst({
        columns: { attempts: true },
        where: (notifications, { eq }) => eq(notifications.id, notificationId),
      });

      const newAttempts = (current?.attempts || 0) + 1;
      const updateData: Partial<typeof notificationQueue.$inferInsert> = {
        attempts: newAttempts,
        error: errorMessage,
      };

      // If max attempts reached, mark as failed
      if (newAttempts >= 3) {
        updateData.failedAt = new Date();
      }

      await this.db
        .update(notificationQueue)
        .set(updateData)
        .where(eq(notificationQueue.id, notificationId));

      console.log(
        `Marked notification ${notificationId} as failed (attempt ${newAttempts}/3)`,
      );
    } catch (error) {
      console.error(
        `Failed to mark notification ${notificationId} as failed:`,
        error,
      );
    }
  }

  /**
   * Retry failed notifications (manual operation)
   */
  async retryFailedNotifications(maxAge: number = 24): Promise<number> {
    try {
      const cutoffTime = DateTime.utc().minus({ hours: maxAge }).toJSDate();

      // Reset failed notifications that aren't too old
      const result = await this.db
        .update(notificationQueue)
        .set({
          attempts: 0,
          error: null,
          failedAt: null,
        })
        .where(
          and(
            isNull(notificationQueue.sentAt), // Not sent
            lte(notificationQueue.failedAt, cutoffTime), // Failed but not too old
            eq(notificationQueue.attempts, 3), // At max attempts
          ),
        )
        .returning({ id: notificationQueue.id });

      console.log(`Reset ${result.length} failed notifications for retry`);
      return result.length;
    } catch (error) {
      console.error("Error retrying failed notifications:", error);
      return 0;
    }
  }

  /**
   * Clean up old processed notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = DateTime.utc().minus({ days: daysOld }).toJSDate();

      const deleted = await this.db
        .delete(notificationQueue)
        .where(
          and(
            lte(notificationQueue.createdAt, cutoffDate),
            // Only delete sent or permanently failed notifications
            isNull(notificationQueue.sentAt)
              ? eq(notificationQueue.attempts, 3)
              : eq(notificationQueue.attempts, notificationQueue.attempts),
          ),
        )
        .returning({ id: notificationQueue.id });

      console.log(`Cleaned up ${deleted.length} old notifications`);
      return deleted.length;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      return 0;
    }
  }
}

// Export singleton instance
let processorInstance: NotificationQueueProcessor | null = null;

export function getNotificationQueueProcessor(
  database: typeof db,
): NotificationQueueProcessor {
  if (!processorInstance) {
    processorInstance = new NotificationQueueProcessor(database);
  }
  return processorInstance;
}
