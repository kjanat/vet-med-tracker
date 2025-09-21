/**
 * Notification Scheduler
 * Calculates and schedules push notifications for medication regimens
 */

import { lte } from "drizzle-orm";
import { DateTime } from "luxon";
import cron from "node-cron";
import type { db } from "@/db/drizzle";
import { notificationQueue } from "@/db/schema";
import { getNotificationQueueProcessor } from "./notification-queue-processor";

export class NotificationScheduler {
  private db: typeof db;
  private jobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();
  private isRunning = false;
  private queueProcessor: ReturnType<typeof getNotificationQueueProcessor>;

  constructor(database: typeof db) {
    this.db = database;
    this.queueProcessor = getNotificationQueueProcessor(database);
  }

  /**
   * Start the notification scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log("Notification scheduler is already running");
      return;
    }

    // Skip VAPID check since isEnabled method doesn't exist
    console.log("Starting notification scheduler...");

    // Start the notification queue processor
    this.queueProcessor.start();

    // Schedule medication reminders every 5 minutes
    const medicationReminderJob = cron.schedule(
      "*/5 * * * *",
      () => {
        this.processMedicationReminders().catch(console.error);
      },
      {
        timezone: "UTC",
      },
    );

    // Schedule missed dose check every 15 minutes
    const missedDoseJob = cron.schedule(
      "*/15 * * * *",
      () => {
        this.processMissedDoses().catch(console.error);
      },
      {
        timezone: "UTC",
      },
    );

    // Schedule daily inventory check at 9 AM UTC (adjustable per user timezone)
    const inventoryJob = cron.schedule(
      "0 9 * * *",
      () => {
        this.processInventoryWarnings().catch(console.error);
      },
      {
        timezone: "UTC",
      },
    );

    // Schedule cleanup of old notifications at 2 AM UTC daily
    const cleanupJob = cron.schedule(
      "0 2 * * *",
      () => {
        this.cleanupOldNotifications().catch(console.error);
      },
      {
        timezone: "UTC",
      },
    );

    this.jobs.set("medicationReminders", medicationReminderJob);
    this.jobs.set("missedDoses", missedDoseJob);
    this.jobs.set("inventoryWarnings", inventoryJob);
    this.jobs.set("cleanup", cleanupJob);

    // Start all jobs
    for (const [name, job] of this.jobs) {
      job.start();
      console.log(`Started ${name} job`);
    }

    this.isRunning = true;
    console.log("Notification scheduler started successfully");
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("Notification scheduler is not running");
      return;
    }

    console.log("Stopping notification scheduler...");

    // Stop the notification queue processor
    this.queueProcessor.stop();

    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped ${name} job`);
    }

    this.jobs.clear();
    this.isRunning = false;
    console.log("Notification scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    jobs: string[];
    queueProcessor: { isRunning: boolean; processingInterval: number };
  } {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      queueProcessor: this.queueProcessor.getStatus(),
    };
  }

  /**
   * Process medication reminders that are due soon
   */
  private async processMedicationReminders(): Promise<void> {
    try {
      console.log("Processing medication reminders...");

      // Get upcoming doses that need reminders (within the next 30 minutes)
      const now = DateTime.utc();
      const reminderWindow = now.plus({ minutes: 30 });

      // Query for scheduled administrations that are due soon
      const upcomingDoses = await this.db.query.administrations.findMany({
        where: (administrations, { and, gte, lte, isNull }) =>
          and(
            gte(administrations.scheduledFor, now.toJSDate()),
            lte(administrations.scheduledFor, reminderWindow.toJSDate()),
            isNull(administrations.recordedAt), // Not yet administered
          ),
        with: {
          vetmedAnimal: true,
          vetmedHousehold: true,
          vetmedRegimen: {
            with: {
              vetmedMedicationCatalog: true,
            },
          },
        },
      });

      console.log(`Found ${upcomingDoses.length} upcoming doses to process`);

      for (const dose of upcomingDoses) {
        // Check if we've already sent a reminder for this dose
        // Using a combination of type, scheduled time, and animal/regimen IDs to identify duplicates
        const existingNotification =
          await this.db.query.notificationQueue.findFirst({
            where: (notifications, { and, eq, sql }) =>
              and(
                eq(notifications.type, "medication_reminder"),
                eq(
                  notifications.scheduledFor,
                  dose.scheduledFor || now.toJSDate(),
                ),
                sql`${notifications.data}->>'regimenId' = ${dose.regimenId}`,
                sql`${notifications.data}->>'animalId' = ${dose.animalId}`,
              ),
          });

        if (existingNotification) {
          continue; // Skip if reminder already sent
        }

        // Create medication reminder notification
        const medicationName =
          dose.vetmedRegimen.vetmedMedicationCatalog?.genericName ||
          dose.vetmedRegimen.medicationName ||
          dose.vetmedRegimen.name ||
          "Unknown Medication";
        const notificationData = {
          body: `Time to give ${medicationName} to ${dose.vetmedAnimal.name}`,
          data: {
            animalId: dose.animalId,
            animalName: dose.vetmedAnimal.name,
            dose: dose.dose || dose.vetmedRegimen.dose || "as prescribed",
            dueTime: dose.scheduledFor?.toISOString(),
            isOverdue: false,
            medicationName: medicationName,
            regimenId: dose.regimenId,
            type: "medication_reminder" as const,
          },
          title: `Medication Reminder: ${medicationName}`,
          type: "medication_reminder" as const,
        };

        // Queue the notification
        await this.db.insert(notificationQueue).values({
          body: notificationData.body,
          data: notificationData.data,
          householdId: dose.householdId,
          scheduledFor: dose.scheduledFor || now.toJSDate(),
          title: notificationData.title,
          type: "medication_reminder",
          userId: dose.caregiverId, // Use caregiver as the user to notify
        });
      }

      console.log("Medication reminders processing completed");
    } catch (error) {
      console.error("Error processing medication reminders:", error);
    }
  }

  /**
   * Process missed doses and send overdue notifications
   */
  private async processMissedDoses(): Promise<void> {
    try {
      console.log("Processing missed doses...");

      const now = DateTime.utc();
      const overdueThreshold = now.minus({ minutes: 15 }); // 15 minutes past due

      // Query for overdue doses that haven't been administered
      const overdueDoses = await this.db.query.administrations.findMany({
        where: (administrations, { and, lt, isNull }) =>
          and(
            lt(administrations.scheduledFor, overdueThreshold.toJSDate()),
            isNull(administrations.recordedAt), // Not yet administered
          ),
        with: {
          vetmedAnimal: true,
          vetmedHousehold: true,
          vetmedRegimen: {
            with: {
              vetmedMedicationCatalog: true,
            },
          },
        },
      });

      console.log(`Found ${overdueDoses.length} overdue doses to process`);

      for (const dose of overdueDoses) {
        // Check if we've already sent an overdue notification for this dose
        const existingOverdueNotification =
          await this.db.query.notificationQueue.findFirst({
            where: (notifications, { and, eq, sql, isNotNull }) =>
              and(
                eq(notifications.type, "medication_reminder"),
                isNotNull(notifications.sentAt), // Already sent notification
                sql`${notifications.data}->>'regimenId' = ${dose.regimenId}`,
                sql`${notifications.data}->>'animalId' = ${dose.animalId}`,
                sql`${notifications.data}->>'isOverdue' = 'true'`, // Was an overdue notification
              ),
          });

        if (existingOverdueNotification) {
          continue; // Skip if overdue notification already sent
        }

        if (!dose.scheduledFor) {
          console.warn(
            `Skipping overdue notification for regimen ${dose.regimenId} due to missing scheduled time`,
          );
          continue;
        }

        // Calculate how late the dose is
        const scheduledTime = DateTime.fromJSDate(dose.scheduledFor);
        const minutesLate = Math.floor(
          now.diff(scheduledTime, "minutes").minutes,
        );

        // Create overdue notification
        const medicationName =
          dose.vetmedRegimen.vetmedMedicationCatalog?.genericName ||
          dose.vetmedRegimen.medicationName ||
          dose.vetmedRegimen.name ||
          "Unknown Medication";
        const notificationData = {
          body: `${dose.vetmedAnimal.name}'s medication is ${minutesLate} minutes overdue`,
          data: {
            animalId: dose.animalId,
            animalName: dose.vetmedAnimal.name,
            dose: dose.dose || dose.vetmedRegimen.dose || "as prescribed",
            dueTime: scheduledTime.toISO(),
            isOverdue: true,
            medicationName: medicationName,
            minutesLate: minutesLate,
            regimenId: dose.regimenId,
            type: "medication_reminder" as const,
          },
          title: `OVERDUE: ${medicationName}`,
          type: "medication_reminder" as const,
        };

        // Queue the overdue notification
        await this.db.insert(notificationQueue).values({
          body: notificationData.body,
          data: notificationData.data,
          householdId: dose.householdId,
          scheduledFor: now.toJSDate(), // Send immediately
          title: notificationData.title,
          type: "medication_reminder",
          userId: dose.caregiverId, // Use caregiver as the user to notify
        });
      }

      console.log("Missed doses processing completed");
    } catch (error) {
      console.error("Error processing missed doses:", error);
    }
  }

  /**
   * Process inventory warnings for low stock
   */
  private async processInventoryWarnings(): Promise<void> {
    try {
      console.log("Processing inventory warnings...");

      // Query for inventory items with low stock (less than 20% remaining)
      const lowStockItems = await this.db.query.inventoryItems.findMany({
        where: (items, { and, sql, isNull }) =>
          and(
            isNull(items.deletedAt), // Not deleted
            sql`(${items.unitsRemaining} * 100.0 / ${items.quantityUnits}) < 20`, // Less than 20%
          ),
        with: {
          vetmedAnimal: true,
          vetmedHousehold: true,
          vetmedMedicationCatalog: true,
        },
      });

      console.log(`Found ${lowStockItems.length} low stock items to process`);

      for (const item of lowStockItems) {
        // Check if we've already sent a low stock warning for this item recently (within 24 hours)
        const recentWarning = await this.db.query.notificationQueue.findFirst({
          where: (notifications, { and, eq, gte, sql }) =>
            and(
              eq(notifications.type, "low_inventory"),
              sql`${notifications.data}->>'inventoryItemId' = ${item.id}`,
              gte(
                notifications.createdAt,
                DateTime.utc().minus({ hours: 24 }).toJSDate(),
              ),
            ),
        });

        if (recentWarning) {
          continue; // Skip if warning sent within last 24 hours
        }

        // Calculate remaining percentage and estimated days remaining
        const percentRemaining = Math.round(
          ((item.unitsRemaining || 0) / (item.quantityUnits || 1)) * 100,
        );

        // Note: Daily usage tracking not yet implemented
        const daysRemaining = null;

        // Create low inventory notification
        const medicationName =
          item.vetmedMedicationCatalog?.genericName ||
          item.medicationName ||
          "Unknown Medication";
        const _notificationData = {
          body: `Only ${percentRemaining}% remaining${daysRemaining ? ` (≈${daysRemaining} days)` : ""}`,
          data: {
            currentQuantity: item.unitsRemaining,
            daysRemaining: daysRemaining || 0,
            inventoryItemId: item.id,
            lowThreshold: Math.ceil((item.quantityUnits || 1) * 0.2), // 20% threshold
            medicationName: medicationName,
            type: "low_inventory" as const,
          },
          title: `Low Stock Alert: ${medicationName}`,
          type: "low_inventory" as const,
        };

        // TODO: Implement proper user selection from household memberships
        // For now, we need to query memberships to find a user to notify
        // Skip this notification until user selection is implemented
        console.log(
          `Skipping low inventory notification for ${medicationName} - user selection not implemented`,
        );
      }

      console.log("Inventory warnings processing completed");
    } catch (error) {
      console.error("Error processing inventory warnings:", error);
    }
  }

  /**
   * Clean up old notifications from the queue
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = DateTime.utc().minus({ days: 7 }).toJSDate();

      const deleted = await this.db
        .delete(notificationQueue)
        .where(lte(notificationQueue.createdAt, cutoffDate))
        .returning({ id: notificationQueue.id });

      console.log(`Cleaned up ${deleted.length} old notifications`);
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
    }
  }

  /**
   * Get the queue processor instance for manual operations
   */
  getQueueProcessor(): ReturnType<typeof getNotificationQueueProcessor> {
    return this.queueProcessor;
  }
}

// Export singleton instance
let schedulerInstance: NotificationScheduler | null = null;

export function getNotificationScheduler(
  database: typeof db,
): NotificationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new NotificationScheduler(database);
  }
  return schedulerInstance;
}
