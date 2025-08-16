/**
 * Notification Scheduler
 * Calculates and schedules push notifications for medication regimens
 */

import { and, eq, gte, lte } from "drizzle-orm";
import { DateTime } from "luxon";
import cron from "node-cron";
import type { db } from "@/db/drizzle";
import { notificationQueue } from "@/db/schema";
import { PushNotificationService } from "./push-service";
import {
  type MissedDose,
  RegimenCalculator,
  type ScheduledDose,
} from "./regimen-calculator";

export class NotificationScheduler {
  private db: typeof db;
  private pushService: PushNotificationService;
  private regimenCalculator: RegimenCalculator;
  private jobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();
  private isRunning = false;

  constructor(database: typeof db) {
    this.db = database;
    this.pushService = new PushNotificationService(database);
    this.regimenCalculator = new RegimenCalculator(database);
  }

  /**
   * Start the notification scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log("Notification scheduler is already running");
      return;
    }

    if (!this.pushService.isEnabled()) {
      console.warn(
        "Push notifications are disabled - VAPID keys not configured. Scheduler will run but won't send notifications.",
      );
    }

    console.log("Starting notification scheduler...");

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
  getStatus(): { isRunning: boolean; jobs: string[] } {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
    };
  }

  /**
   * Process medication reminders that are due soon
   */
  private async processMedicationReminders(): Promise<void> {
    try {
      const upcoming = await this.regimenCalculator.calculateScheduledDoses(30); // Next 30 minutes
      console.log(
        `Processing ${upcoming.length} upcoming medication reminders`,
      );

      for (const dose of upcoming) {
        const shouldSend = await this.shouldSendNotification(dose);
        if (shouldSend) {
          await this.sendMedicationReminderNotification(dose);
        }
      }
    } catch (error) {
      console.error("Error processing medication reminders:", error);
    }
  }

  /**
   * Process missed doses and send overdue notifications
   */
  private async processMissedDoses(): Promise<void> {
    try {
      const missed = await this.regimenCalculator.calculateMissedDoses(240); // Last 4 hours
      console.log(`Processing ${missed.length} missed doses`);

      for (const dose of missed) {
        await this.sendMissedDoseNotification(dose);
      }
    } catch (error) {
      console.error("Error processing missed doses:", error);
    }
  }

  /**
   * Process inventory warnings for low stock
   */
  private async processInventoryWarnings(): Promise<void> {
    try {
      // This is a placeholder - would need to implement inventory checking logic
      console.log("Processing inventory warnings (placeholder)");
    } catch (error) {
      console.error("Error processing inventory warnings:", error);
    }
  }

  /**
   * Clean up old notifications from the queue
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = DateTime.utc().minus({ days: 7 }).toISO();

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
   * Check if we should send a notification for this scheduled dose
   */
  private async shouldSendNotification(dose: ScheduledDose): Promise<boolean> {
    const now = DateTime.utc();
    const timeDiff = dose.notificationTime.diff(now, "minutes").minutes;

    // Send if notification time is within the next 5 minutes
    if (timeDiff > 5 || timeDiff < -5) {
      return false;
    }

    // Check if we already sent a notification for this dose
    // Check if we already sent a notification for this dose
    const existing = await this.db
      .select()
      .from(notificationQueue)
      .where(
        and(
          eq(notificationQueue.userId, dose.userId),
          eq(notificationQueue.type, "medication_reminder"),
          gte(
            notificationQueue.scheduledFor,
            dose.scheduledTime.minus({ minutes: 30 }).toISO() ??
              dose.scheduledTime.toString(),
          ),
          lte(
            notificationQueue.scheduledFor,
            dose.scheduledTime.plus({ minutes: 30 }).toISO() ??
              dose.scheduledTime.toString(),
          ),
        ),
      )
      .limit(1);

    return existing.length === 0;
  }

  /**
   * Send medication reminder notification using the new ScheduledDose type
   */
  private async sendMedicationReminderNotification(
    dose: ScheduledDose,
  ): Promise<void> {
    try {
      const result = await this.pushService.sendMedicationReminder(
        dose.userId,
        {
          type: "medication_reminder",
          animalId: dose.animalId,
          animalName: dose.animalName,
          regimenId: dose.regimenId,
          medicationName: dose.medicationName,
          dose: dose.dose,
          dueTime: dose.scheduledTime.toISO() || dose.scheduledTime.toString(),
          isOverdue: false,
        },
      );

      // Log the notification in the queue
      await this.db.insert(notificationQueue).values({
        householdId: dose.householdId,
        userId: dose.userId,
        type: "medication_reminder",
        title: `${dose.animalName} Medication Reminder`,
        body: `Time to give ${dose.medicationName} to ${dose.animalName}`,
        scheduledFor:
          dose.scheduledTime.toISO() || dose.scheduledTime.toString(),
        sentAt: new Date().toISOString(),
      });

      console.log(
        `Sent medication reminder for ${dose.animalName} - ${dose.medicationName} (sent: ${result.sent}, failed: ${result.failed})`,
      );
    } catch (error) {
      console.error(
        `Failed to send medication reminder for ${dose.animalName}:`,
        error,
      );
    }
  }

  /**
   * Send missed dose notification using the new MissedDose type
   */
  private async sendMissedDoseNotification(dose: MissedDose): Promise<void> {
    try {
      const _result = await this.pushService.sendMedicationReminder(
        dose.userId,
        {
          type: "medication_reminder",
          animalId: dose.animalId,
          animalName: dose.animalName,
          regimenId: dose.regimenId,
          medicationName: dose.medicationName,
          dose: dose.dose,
          dueTime: dose.scheduledTime.toISO() || dose.scheduledTime.toString(),
          isOverdue: true,
          minutesLate: dose.minutesOverdue,
        },
      );

      console.log(
        `Sent overdue reminder for ${dose.animalName} - ${dose.medicationName} (${dose.minutesOverdue} minutes late)`,
      );
    } catch (error) {
      console.error(
        `Failed to send overdue reminder for ${dose.animalName}:`,
        error,
      );
    }
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
