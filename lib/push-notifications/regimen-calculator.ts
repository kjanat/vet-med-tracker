/**
 * Regimen Calculation Logic for Push Notifications
 * Handles timing calculations for different types of medication schedules
 */

import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { DateTime } from "luxon";
import type { db as _db } from "@/db/drizzle";
import {
  vetmedAdministrations as administrations,
  vetmedAnimals as animals,
  vetmedMedicationCatalog as medicationCatalog,
  vetmedMemberships as memberships,
  vetmedRegimens as regimens,
  vetmedUsers as users,
} from "@/db/schema";

export interface RegimenSchedule {
  regimenId: string;
  animalId: string;
  animalName: string;
  animalTimezone: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduleType: string;
  timesLocal: string[] | null;
  intervalHours: number | null;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
  householdId: string;
  times: string[]; // Array of time strings like ["08:00", "20:00"]
  caregivers: {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
  }[];
}

export interface UpcomingDose {
  regimenId: string;
  animalId: string;
  animalName: string;
  animalTimezone: string;
  medicationName: string;
  dosage: string;
  scheduledTime: Date;
  timeSlot: string;
  householdId: string;
  caregivers: {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
  }[];
  isOverdue: boolean;
  lastAdministered?: Date | null;
}

// Type aliases for compatibility with notification scheduler
export type ScheduledDose = UpcomingDose;
export type MissedDose = UpcomingDose & { isOverdue: true };

/**
 * Regimen Calculator Service
 */
export class RegimenCalculator {
  /**
   * Get all active regimen schedules for a household
   */
  async getActiveRegimens(householdId: string): Promise<RegimenSchedule[]> {
    const db = (await import("@/db/drizzle")).db;

    const todayString = new Date().toISOString().split("T")[0];

    const result = await db
      .select({
        animalId: animals.id,
        animalName: animals.name,
        animalTimezone: animals.timezone,
        dosage: regimens.dose,
        endDate: regimens.endDate,
        householdId: animals.householdId,
        intervalHours: regimens.intervalHours,
        isActive: regimens.active, // Fixed: use 'active' not 'isActive'
        medicationId: regimens.medicationId,
        medicationName: medicationCatalog.brandName,
        regimenId: regimens.id,
        scheduleType: regimens.scheduleType,
        startDate: regimens.startDate,
        timesLocal: regimens.timesLocal,
      })
      .from(regimens)
      .innerJoin(animals, eq(regimens.animalId, animals.id))
      .leftJoin(
        medicationCatalog,
        eq(regimens.medicationId, medicationCatalog.id),
      )
      .where(
        and(
          eq(animals.householdId, householdId),
          eq(regimens.active, true),
          or(
            isNull(regimens.endDate),
            sql`${regimens.endDate} >= ${todayString}`,
          ),
        ),
      )
      .orderBy(regimens.createdAt);

    // Get caregivers for each regimen
    const regimenSchedules: RegimenSchedule[] = [];

    for (const row of result) {
      const caregivers = await this.getRegimenCaregivers(db, row.householdId);

      regimenSchedules.push({
        animalId: row.animalId,
        animalName: row.animalName,
        animalTimezone: row.animalTimezone,
        caregivers,
        dosage: row.dosage || "",
        endDate: row.endDate ? new Date(row.endDate) : null,
        householdId: row.householdId,
        intervalHours: row.intervalHours,
        isActive: row.isActive,
        medicationId: row.medicationId || "",
        medicationName: row.medicationName || "Unknown Medication",
        regimenId: row.regimenId,
        scheduleType: row.scheduleType,
        startDate: new Date(row.startDate),
        times: this.parseScheduleTimes(row.timesLocal),
        timesLocal: row.timesLocal,
      });
    }

    return regimenSchedules;
  }

  /**
   * Get upcoming doses for a time window
   */
  async getUpcomingDoses(
    householdId: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<UpcomingDose[]> {
    const activeRegimens = await this.getActiveRegimens(householdId);
    const upcomingDoses: UpcomingDose[] = [];

    for (const regimen of activeRegimens) {
      const doses = this.calculateDosesInWindow(
        regimen,
        windowStart,
        windowEnd,
      );
      upcomingDoses.push(...doses);
    }

    // Sort by scheduled time
    upcomingDoses.sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime(),
    );

    return upcomingDoses;
  }

  /**
   * Get overdue doses (past due by more than 30 minutes)
   */
  async getOverdueDoses(householdId: string): Promise<MissedDose[]> {
    const now = new Date();
    const windowStart = DateTime.fromJSDate(now)
      .minus({ hours: 24 })
      .toJSDate();
    const windowEnd = DateTime.fromJSDate(now)
      .minus({ minutes: 30 })
      .toJSDate();

    const doses = await this.getUpcomingDoses(
      householdId,
      windowStart,
      windowEnd,
    );

    // Filter for truly overdue doses (not already administered)
    const overdueDoses = await this.filterUnAdministeredDoses(doses);

    return overdueDoses.map(
      (dose) => ({ ...dose, isOverdue: true }) as MissedDose,
    );
  }

  /**
   * Calculate doses within a time window for a specific regimen
   */
  private calculateDosesInWindow(
    regimen: RegimenSchedule,
    windowStart: Date,
    windowEnd: Date,
  ): UpcomingDose[] {
    const doses: UpcomingDose[] = [];
    const timezone = regimen.animalTimezone;

    let currentDate = DateTime.fromJSDate(windowStart, {
      zone: timezone,
    }).startOf("day");
    const endDate = DateTime.fromJSDate(windowEnd, { zone: timezone });

    while (currentDate <= endDate) {
      // Skip dates before the regimen start date
      if (currentDate.toJSDate() < regimen.startDate) {
        currentDate = currentDate.plus({ days: 1 });
        continue;
      }

      // Skip dates after the regimen end date
      if (regimen.endDate && currentDate.toJSDate() > regimen.endDate) {
        break;
      }

      for (const timeSlot of regimen.times) {
        const [hours, minutes] = timeSlot.split(":").map(Number);
        const scheduledTime = currentDate
          .set({ hour: hours, minute: minutes })
          .toJSDate();

        // Only include doses within the window
        if (scheduledTime >= windowStart && scheduledTime <= windowEnd) {
          doses.push({
            animalId: regimen.animalId,
            animalName: regimen.animalName,
            animalTimezone: regimen.animalTimezone,
            caregivers: regimen.caregivers,
            dosage: regimen.dosage,
            householdId: regimen.householdId,
            isOverdue: false,
            medicationName: regimen.medicationName,
            regimenId: regimen.regimenId,
            scheduledTime,
            timeSlot,
          });
        }
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return doses;
  }

  /**
   * Parse schedule times from timesLocal array or fallback to default
   */
  private parseScheduleTimes(timesLocal: string[] | null): string[] {
    if (timesLocal && Array.isArray(timesLocal) && timesLocal.length > 0) {
      return timesLocal;
    }

    // Default fallback for common schedules
    return ["08:00"]; // Default to morning dose
  }

  /**
   * Get caregivers for a household
   */
  private async getRegimenCaregivers(
    db: typeof _db,
    householdId: string,
  ): Promise<
    {
      userId: string;
      userName: string;
      userEmail: string;
      role: string;
    }[]
  > {
    const result = await db
      .select({
        role: memberships.role,
        userEmail: users.email,
        userId: users.id,
        userName: users.name,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.householdId, householdId));

    return result.map((row) => ({
      role: row.role,
      userEmail: row.userEmail || "",
      userId: row.userId,
      userName: row.userName || row.userEmail || "Unknown User",
    }));
  }

  /**
   * Filter out doses that have already been administered
   */
  private async filterUnAdministeredDoses(
    doses: UpcomingDose[],
  ): Promise<UpcomingDose[]> {
    const db = (await import("@/db/drizzle")).db;
    const unAdministered: UpcomingDose[] = [];

    for (const dose of doses) {
      // Check if this specific dose time has been administered
      const windowStartStr = DateTime.fromJSDate(dose.scheduledTime)
        .minus({ minutes: 15 })
        .toISO();
      const windowEndStr = DateTime.fromJSDate(dose.scheduledTime)
        .plus({ minutes: 15 })
        .toISO();

      if (!windowStartStr || !windowEndStr) {
        // Skip if DateTime conversion failed
        continue;
      }

      const administered = await db
        .select()
        .from(administrations)
        .where(
          and(
            eq(administrations.regimenId, dose.regimenId),
            eq(administrations.animalId, dose.animalId),
            gte(administrations.recordedAt, windowStartStr),
            lte(administrations.recordedAt, windowEndStr),
          ),
        )
        .limit(1);

      if (administered.length === 0) {
        // Get the last administration for context
        const lastAdmin = await db
          .select({
            recordedAt: administrations.recordedAt,
          })
          .from(administrations)
          .where(
            and(
              eq(administrations.regimenId, dose.regimenId),
              eq(administrations.animalId, dose.animalId),
            ),
          )
          .orderBy(desc(administrations.recordedAt))
          .limit(1);

        unAdministered.push({
          ...dose,
          lastAdministered: lastAdmin[0]?.recordedAt
            ? new Date(lastAdmin[0].recordedAt)
            : null,
        });
      }
    }

    return unAdministered;
  }
}

// Export singleton instance
export const regimenCalculator = new RegimenCalculator();
