/**
 * Regimen Calculation Logic for Push Notifications
 * Handles timing calculations for different types of medication schedules
 */

import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db } from "@/db/drizzle";
import {
  vetmedAdministrations as administrations,
  vetmedAnimals as animals,
  vetmedMemberships as memberships,
  vetmedRegimens as regimens,
  vetmedUsers as users,
} from "@/db/schema";

export interface RegimenSchedule {
  regimenId: string;
  animalId: string;
  animalName: string;
  animalTimezone: string;
  userId: string;
  medicationName: string;
  dose: string;
  scheduleType: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
  times?: string[]; // For FIXED schedules: ["08:00", "20:00"]
  intervalHours?: number; // For INTERVAL schedules
  startDate: string;
  endDate?: string;
  isActive: boolean;
  userLeadTime: number;
  pushNotifications: boolean;
}

export interface ScheduledDose {
  householdId: string;
  regimenId: string;
  animalId: string;
  animalName: string;
  userId: string;
  medicationName: string;
  dose: string;
  scheduledTime: DateTime;
  notificationTime: DateTime;
  timezone: string;
  type: "scheduled" | "interval" | "prn";
}

export interface MissedDose extends ScheduledDose {
  minutesOverdue: number;
  lastAttemptedNotification?: DateTime;
}

export class RegimenCalculator {
  private db: typeof db;

  constructor(db: typeof db) {
    this.db = db;
  }

  /**
   * Get all active regimens for users with push notifications enabled
   */
  async getActiveRegimens(): Promise<RegimenSchedule[]> {
    const activeRegimens = await this.db
      .select({
        regimenId: regimens.id,
        animalId: regimens.animalId,
        animalName: animals.name,
        animalTimezone: animals.timezone,
        medicationName: regimens.medicationName,
        dose: regimens.dose,
        scheduleType: regimens.scheduleType,
        times: regimens.timesLocal,
        intervalHours: regimens.intervalHours,
        startDate: regimens.startDate,
        endDate: regimens.endDate,
        active: regimens.active,
        userId: memberships.userId,
        userLeadTime: users.reminderLeadTimeMinutes,
        pushNotifications: users.pushNotifications,
      })
      .from(regimens)
      .innerJoin(animals, eq(regimens.animalId, animals.id))
      .innerJoin(memberships, eq(animals.householdId, memberships.householdId))
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(regimens.active, true),
          eq(users.pushNotifications, true),
          or(
            eq(regimens.endDate, null),
            gte(
              regimens.endDate,
              DateTime.utc().toISO() || DateTime.utc().toString(),
            ),
          ),
        ),
      );

    return activeRegimens.map((r: any) => ({
      ...r,
      scheduleType: r.scheduleType as "FIXED" | "PRN" | "INTERVAL" | "TAPER",
      userLeadTime: parseInt(r.userLeadTime || "15", 10),
      animalTimezone: r.animalTimezone || "America/New_York",
      isActive: r.active, // Map active to isActive for backwards compatibility
    }));
  }

  /**
   * Calculate next scheduled doses within a time window
   */
  async calculateScheduledDoses(
    lookAheadMinutes: number = 60,
  ): Promise<ScheduledDose[]> {
    const now = DateTime.utc();
    const activeRegimens = await this.getActiveRegimens();
    const scheduledDoses: ScheduledDose[] = [];

    for (const regimen of activeRegimens) {
      const doses = await this.getNextDosesForRegimen(
        regimen,
        now,
        lookAheadMinutes,
      );
      scheduledDoses.push(...doses);
    }

    return scheduledDoses.sort(
      (a, b) => a.notificationTime.toMillis() - b.notificationTime.toMillis(),
    );
  }

  /**
   * Calculate missed doses that need overdue notifications
   */
  async calculateMissedDoses(
    lookBackMinutes: number = 240,
  ): Promise<MissedDose[]> {
    const now = DateTime.utc();
    const activeRegimens = await this.getActiveRegimens();
    const missedDoses: MissedDose[] = [];

    for (const regimen of activeRegimens) {
      const missed = await this.getMissedDosesForRegimen(
        regimen,
        now,
        lookBackMinutes,
      );
      missedDoses.push(...missed);
    }

    return missedDoses.sort((a, b) => b.minutesOverdue - a.minutesOverdue);
  }

  /**
   * Get notification summary for a specific user
   */
  async getNotificationSummary(userId: string): Promise<{
    upcomingCount: number;
    overdueCount: number;
    nextNotification?: ScheduledDose;
  }> {
    const [scheduled, missed] = await Promise.all([
      this.calculateScheduledDoses(1440), // Next 24 hours
      this.calculateMissedDoses(1440), // Last 24 hours
    ]);

    const userScheduled = scheduled.filter((d) => d.userId === userId);
    const userMissed = missed.filter((d) => d.userId === userId);

    return {
      upcomingCount: userScheduled.length,
      overdueCount: userMissed.length,
      nextNotification: userScheduled[0],
    };
  }

  /**
   * Get next doses for a specific regimen
   */
  private async getNextDosesForRegimen(
    regimen: RegimenSchedule,
    now: DateTime,
    lookAheadMinutes: number,
  ): Promise<ScheduledDose[]> {
    switch (regimen.scheduleType) {
      case "FIXED":
        return this.calculateFixedScheduleDoses(regimen, now, lookAheadMinutes);
      case "INTERVAL":
        return this.calculateIntervalDoses(regimen, now, lookAheadMinutes);
      case "TAPER":
        return this.calculateTaperDoses(regimen, now, lookAheadMinutes);
      case "PRN":
        return []; // PRN medications don't have scheduled doses
      default:
        return [];
    }
  }

  /**
   * Calculate doses for fixed schedule (e.g., 8:00 AM, 8:00 PM)
   */
  private calculateFixedScheduleDoses(
    regimen: RegimenSchedule,
    now: DateTime,
    lookAheadMinutes: number,
  ): ScheduledDose[] {
    if (!regimen.times || regimen.times.length === 0) {
      return [];
    }

    const doses: ScheduledDose[] = [];
    const animalTz = regimen.animalTimezone;
    const nowInAnimalTz = now.setZone(animalTz);
    const endWindow = now.plus({ minutes: lookAheadMinutes });

    const timeStrings = Array.isArray(regimen.times)
      ? regimen.times
      : [regimen.times];

    for (const timeStr of timeStrings) {
      if (typeof timeStr !== "string") continue;

      try {
        const [hours, minutes] = timeStr.split(":").map(Number);
        if (
          Number.isNaN(hours) ||
          Number.isNaN(minutes) ||
          hours === undefined ||
          minutes === undefined
        )
          continue;

        // Check today
        let scheduledTime = nowInAnimalTz.set({
          hour: hours,
          minute: minutes,
          second: 0,
          millisecond: 0,
        });

        // If today's time has passed, check tomorrow
        if (scheduledTime <= nowInAnimalTz) {
          scheduledTime = scheduledTime.plus({ days: 1 });
        }

        const scheduledTimeUTC = scheduledTime.toUTC();
        const notificationTime = scheduledTimeUTC.minus({
          minutes: regimen.userLeadTime,
        });

        // Only include if within our look-ahead window and notification time is in future
        if (scheduledTimeUTC <= endWindow && notificationTime > now) {
          doses.push({
            regimenId: regimen.regimenId,
            animalId: regimen.animalId,
            animalName: regimen.animalName,
            userId: regimen.userId,
            medicationName: regimen.medicationName,
            dose: regimen.dose,
            scheduledTime: scheduledTimeUTC,
            notificationTime,
            timezone: regimen.animalTimezone,
            type: "scheduled",
          });
        }
      } catch (error) {
        console.error(
          `Error parsing time ${timeStr} for regimen ${regimen.regimenId}:`,
          error,
        );
      }
    }

    return doses;
  }

  /**
   * Calculate doses for interval-based schedule (e.g., every 8 hours)
   */
  private async calculateIntervalDoses(
    regimen: RegimenSchedule,
    now: DateTime,
    lookAheadMinutes: number,
  ): Promise<ScheduledDose[]> {
    if (!regimen.intervalHours || regimen.intervalHours <= 0) {
      return [];
    }

    // Get the last administration to calculate next dose time
    const lastAdmin = await this.db
      .select({
        recordedAt: administrations.recordedAt,
        scheduledFor: administrations.scheduledFor,
      })
      .from(administrations)
      .where(eq(administrations.regimenId, regimen.regimenId))
      .orderBy(desc(administrations.recordedAt))
      .limit(1);

    let nextDoseTime: DateTime;

    if (lastAdmin[0]) {
      // Calculate next dose based on last administration
      const lastDoseTime = DateTime.fromISO(
        lastAdmin[0].scheduledFor || lastAdmin[0].recordedAt,
      );
      nextDoseTime = lastDoseTime.plus({ hours: regimen.intervalHours });
    } else {
      // No previous administrations, use start date or current time
      const startDate = DateTime.fromISO(regimen.startDate);
      nextDoseTime = startDate > now ? startDate : now;
    }

    const endWindow = now.plus({ minutes: lookAheadMinutes });
    const doses: ScheduledDose[] = [];

    // Generate doses within the look-ahead window
    let currentDoseTime = nextDoseTime;
    while (currentDoseTime <= endWindow) {
      const notificationTime = currentDoseTime.minus({
        minutes: regimen.userLeadTime,
      });

      if (notificationTime > now) {
        doses.push({
          regimenId: regimen.regimenId,
          animalId: regimen.animalId,
          animalName: regimen.animalName,
          userId: regimen.userId,
          medicationName: regimen.medicationName,
          dose: regimen.dose,
          scheduledTime: currentDoseTime,
          notificationTime,
          timezone: regimen.animalTimezone,
          type: "interval",
        });
      }

      currentDoseTime = currentDoseTime.plus({ hours: regimen.intervalHours });
    }

    return doses;
  }

  /**
   * Calculate doses for taper schedules (gradual dose reduction)
   */
  private calculateTaperDoses(
    regimen: RegimenSchedule,
    now: DateTime,
    lookAheadMinutes: number,
  ): ScheduledDose[] {
    // Taper schedules are complex and would need more detailed implementation
    // For now, treat them similar to fixed schedules
    return this.calculateFixedScheduleDoses(regimen, now, lookAheadMinutes);
  }

  /**
   * Get missed doses for a specific regimen
   */
  private async getMissedDosesForRegimen(
    regimen: RegimenSchedule,
    now: DateTime,
    lookBackMinutes: number,
  ): Promise<MissedDose[]> {
    const startWindow = now.minus({ minutes: lookBackMinutes });
    const missedDoses: MissedDose[] = [];

    // Get doses that were scheduled in the past but not administered
    const pastDoses = await this.getNextDosesForRegimen(
      regimen,
      startWindow,
      lookBackMinutes + 1440, // Extend to capture past doses
    );

    for (const dose of pastDoses) {
      if (dose.scheduledTime < now) {
        // Check if this dose was administered
        const wasAdministered = await this.wasGiven(
          regimen.regimenId,
          dose.scheduledTime,
          30, // 30-minute window for "close enough"
        );

        if (!wasAdministered) {
          const minutesOverdue = now.diff(
            dose.scheduledTime,
            "minutes",
          ).minutes;

          // Only consider as missed if overdue by more than grace period
          if (minutesOverdue > 15) {
            missedDoses.push({
              ...dose,
              minutesOverdue: Math.round(minutesOverdue),
            });
          }
        }
      }
    }

    return missedDoses;
  }

  /**
   * Check if a dose was administered within a time window
   */
  private async wasGiven(
    regimenId: string,
    scheduledTime: DateTime,
    windowMinutes: number = 30,
  ): Promise<boolean> {
    const startTime =
      scheduledTime.minus({ minutes: windowMinutes }).toISO() ||
      scheduledTime.minus({ minutes: windowMinutes }).toString();
    const endTime =
      scheduledTime.plus({ minutes: windowMinutes }).toISO() ||
      scheduledTime.plus({ minutes: windowMinutes }).toString();

    const adminRecord = await this.db
      .select({ id: administrations.id })
      .from(administrations)
      .where(
        and(
          eq(administrations.regimenId, regimenId),
          gte(administrations.scheduledFor, startTime),
          lte(administrations.scheduledFor, endTime),
        ),
      )
      .limit(1);

    return adminRecord.length > 0;
  }
}
