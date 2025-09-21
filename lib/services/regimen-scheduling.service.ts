/**
 * Scheduling service for veterinary regimens
 * Handles complex dosing calculations, timezone management, and schedule optimization
 */

import { addDays, isAfter, isBefore } from "date-fns";
// Note: Using simplified timezone handling for now - would use date-fns-tz in production

export interface ScheduleTime {
  time: string; // HH:mm format
  label?: string;
}

export interface DoseSchedule {
  times: ScheduleTime[];
  frequency: number; // times per day
  interval?: number; // hours between doses
  isOptimal: boolean;
  warnings: string[];
}

export interface ScheduleConflict {
  conflictType: "TIMING" | "FREQUENCY" | "OVERLAP";
  description: string;
  severity: "INFO" | "WARNING" | "ERROR";
  suggestion?: string;
}

export interface ReminderSchedule {
  scheduleId: string;
  reminderTimes: Date[];
  nextReminder: Date | null;
  timezone: string;
}

export interface ScheduleOptimization {
  optimizedTimes: ScheduleTime[];
  improvementReason: string;
  adherenceScore: number; // 0-100
}

export type ScheduleType = "FIXED" | "PRN" | "INTERVAL" | "TAPER";

const getTimeParts = (time: string): [string, string] => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return [hours, minutes];
};

export class RegimenSchedulingService {
  /**
   * Generate optimal dosing schedule based on frequency and constraints
   */
  static generateDoseSchedule(
    frequency: number,
    scheduleType: ScheduleType,
    startTime: string = "09:00",
    constraints: {
      withFood?: boolean;
      avoidSleep?: boolean;
      minInterval?: number; // minimum hours between doses
      maxInterval?: number; // maximum hours between doses
    } = {},
  ): DoseSchedule {
    const warnings: string[] = [];
    let times: ScheduleTime[] = [];
    let isOptimal = true;

    if (scheduleType === "PRN") {
      return {
        frequency: 0,
        isOptimal: true,
        times: [],
        warnings: ["PRN medication - dose as needed"],
      };
    }

    if (frequency <= 0 || frequency > 24) {
      return {
        frequency: 0,
        isOptimal: false,
        times: [],
        warnings: [
          "Invalid frequency - must be between 1 and 24 doses per day",
        ],
      };
    }

    // Calculate base interval
    const baseInterval = 24 / frequency;

    // Check constraints
    if (constraints.minInterval && baseInterval < constraints.minInterval) {
      warnings.push(
        `Interval too short (${baseInterval.toFixed(1)}h), minimum is ${constraints.minInterval}h`,
      );
      isOptimal = false;
    }

    if (constraints.maxInterval && baseInterval > constraints.maxInterval) {
      warnings.push(
        `Interval too long (${baseInterval.toFixed(1)}h), maximum is ${constraints.maxInterval}h`,
      );
      isOptimal = false;
    }

    // Generate times based on frequency
    const [startHourPart, startMinutePart] = getTimeParts(startTime);
    const startHour = parseInt(startHourPart || "8", 10);
    const startMinute = parseInt(startMinutePart || "0", 10);

    for (let i = 0; i < frequency; i++) {
      const hourOffset = i * baseInterval;
      const hour = (startHour + Math.floor(hourOffset)) % 24;
      const minute = startMinute + (hourOffset % 1) * 60;

      const finalHour = (hour + Math.floor(minute / 60)) % 24;
      const finalMinute = Math.floor(minute % 60);

      const timeString = `${finalHour.toString().padStart(2, "0")}:${finalMinute.toString().padStart(2, "0")}`;

      times.push({
        label: RegimenSchedulingService.getTimeLabel(timeString, constraints),
        time: timeString,
      });
    }

    // Apply constraint optimizations
    if (constraints.withFood) {
      times = RegimenSchedulingService.optimizeForMeals(times);
      warnings.push("Schedule optimized for meal times");
    }

    if (constraints.avoidSleep) {
      times = RegimenSchedulingService.avoidSleepHours(times);
      warnings.push("Schedule adjusted to avoid typical sleep hours");
    }

    return {
      frequency,
      interval: baseInterval,
      isOptimal,
      times,
      warnings,
    };
  }

  /**
   * Check for scheduling conflicts between multiple regimens
   */
  static checkScheduleConflicts(
    newSchedule: { times: string[]; medicationName: string },
    existingSchedules: {
      times: string[];
      medicationName: string;
      highRisk: boolean;
    }[],
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    existingSchedules.forEach((existing) => {
      // Check for exact time overlaps
      const timeOverlaps = newSchedule.times.filter((newTime) =>
        existing.times.includes(newTime),
      );

      if (timeOverlaps.length > 0) {
        conflicts.push({
          conflictType: "OVERLAP",
          description: `Time overlap with ${existing.medicationName} at ${timeOverlaps.join(", ")}`,
          severity: existing.highRisk ? "ERROR" : "WARNING",
          suggestion:
            "Consider staggering administration times by 15-30 minutes",
        });
      }

      // Check for frequency conflicts (too many doses close together)
      const closeIntervals = RegimenSchedulingService.findCloseIntervals(
        newSchedule.times,
        existing.times,
      );
      if (closeIntervals.length > 0) {
        conflicts.push({
          conflictType: "TIMING",
          description: `Multiple medications scheduled within 30 minutes: ${closeIntervals.join(", ")}`,
          severity: "WARNING",
          suggestion:
            "Space medications at least 30 minutes apart when possible",
        });
      }
    });

    // Check for excessive frequency
    if (newSchedule.times.length >= 6) {
      conflicts.push({
        conflictType: "FREQUENCY",
        description:
          "High frequency dosing (6+ times daily) may impact compliance",
        severity: "INFO",
        suggestion: "Consider extended-release formulation if available",
      });
    }

    return conflicts;
  }

  /**
   * Generate timezone-aware reminder schedule
   */
  static generateReminderSchedule(
    regimenId: string,
    doseTimes: string[],
    timezone: string,
    reminderMinutes: number = 15,
    startDate: Date = new Date(),
    endDate?: Date,
  ): ReminderSchedule {
    const reminderTimes: Date[] = [];
    const now = new Date();

    // Generate reminders for next 30 days or until end date
    const scheduleEndDate = endDate || addDays(startDate, 30);

    for (
      let date = startDate;
      isBefore(date, scheduleEndDate);
      date = addDays(date, 1)
    ) {
      doseTimes.forEach((timeString) => {
        // Convert dose time to full datetime in specified timezone
        const [hours, minutes] = timeString.split(":").map(Number);
        const doseDateTime = new Date(date);
        doseDateTime.setHours(hours || 0, minutes || 0, 0, 0);

        // Convert to UTC for storage
        // Simplified - would use proper timezone conversion in production
        const utcDoseTime = doseDateTime;

        // Calculate reminder time
        const reminderTime = new Date(
          utcDoseTime.getTime() - reminderMinutes * 60 * 1000,
        );

        // Only add future reminders
        if (isAfter(reminderTime, now)) {
          reminderTimes.push(reminderTime);
        }
      });
    }

    // Sort reminders chronologically
    reminderTimes.sort((a, b) => a.getTime() - b.getTime());

    return {
      nextReminder: reminderTimes.length > 0 ? reminderTimes[0] || null : null,
      reminderTimes,
      scheduleId: regimenId,
      timezone,
    };
  }

  /**
   * Optimize schedule for better adherence
   */
  static optimizeScheduleForAdherence(
    currentTimes: string[],
    patientPreferences: {
      wakeTime?: string;
      sleepTime?: string;
      mealTimes?: string[];
      workSchedule?: { start: string; end: string };
    } = {},
  ): ScheduleOptimization {
    let optimizedTimes = [...currentTimes];
    let improvementReason = "";
    let adherenceScore = 50; // baseline

    // Optimize based on wake/sleep schedule
    if (patientPreferences.wakeTime && patientPreferences.sleepTime) {
      const wakeHour = parseInt(
        patientPreferences.wakeTime.split(":")[0] || "7",
        10,
      );
      const sleepHour = parseInt(
        patientPreferences.sleepTime.split(":")[0] || "22",
        10,
      );

      optimizedTimes = optimizedTimes.map((time) => {
        const [hourPart, minutePart] = getTimeParts(time);
        const hour = parseInt(hourPart || "8", 10);

        // Adjust times that fall during sleep hours
        if (sleepHour < wakeHour) {
          // Sleep crosses midnight
          if (hour >= sleepHour || hour < wakeHour) {
            const adjustedHour = wakeHour;
            return `${adjustedHour.toString().padStart(2, "0")}:${minutePart}`;
          }
        } else {
          // Normal sleep schedule
          if (hour >= sleepHour || hour < wakeHour) {
            const adjustedHour = wakeHour;
            return `${adjustedHour.toString().padStart(2, "0")}:${minutePart}`;
          }
        }

        return time;
      });

      adherenceScore += 20;
      improvementReason += "Adjusted for sleep schedule. ";
    }

    // Optimize based on meal times
    if (
      patientPreferences.mealTimes &&
      patientPreferences.mealTimes.length > 0
    ) {
      const mealHours = patientPreferences.mealTimes.map((time) => {
        const [hourPart] = getTimeParts(time);
        return parseInt(hourPart || "8", 10);
      });

      optimizedTimes = optimizedTimes.map((time) => {
        const [hourPart, minutePart] = getTimeParts(time);
        const hour = parseInt(hourPart || "8", 10);

        // Find closest meal time
        const closestMealHour = mealHours.reduce((closest, mealHour) => {
          return Math.abs(mealHour - hour) < Math.abs(closest - hour)
            ? mealHour
            : closest;
        });

        // If within 2 hours of a meal, align to meal time
        if (Math.abs(closestMealHour - hour) <= 2) {
          return `${closestMealHour.toString().padStart(2, "0")}:${minutePart}`;
        }

        return time;
      });

      adherenceScore += 15;
      improvementReason += "Aligned with meal times. ";
    }

    // Optimize based on work schedule
    if (patientPreferences.workSchedule) {
      const workStart = parseInt(
        patientPreferences.workSchedule.start.split(":")[0] || "9",
        10,
      );
      const workEnd = parseInt(
        patientPreferences.workSchedule.end.split(":")[0] || "17",
        10,
      );

      optimizedTimes = optimizedTimes.map((time) => {
        const hour = parseInt(time.split(":")[0] || "8", 10);

        // Avoid mid-work hours
        if (hour > workStart && hour < workEnd - 1) {
          // Move to lunch time or before work
          const lunchHour = Math.floor((workStart + workEnd) / 2);
          return `${lunchHour.toString().padStart(2, "0")}:00`;
        }

        return time;
      });

      adherenceScore += 10;
      improvementReason += "Adjusted for work schedule. ";
    }

    // Remove duplicates and sort
    optimizedTimes = [...new Set(optimizedTimes)].sort();

    return {
      adherenceScore: Math.min(adherenceScore, 100),
      improvementReason:
        improvementReason.trim() || "No significant improvements needed",
      optimizedTimes: optimizedTimes.map((time) => ({ time })),
    };
  }

  /**
   * Calculate next dose time
   */
  static getNextDoseTime(
    scheduleTimes: string[],
    _timezone: string,
    currentTime: Date = new Date(),
  ): Date | null {
    if (scheduleTimes.length === 0) return null;

    const today = new Date(currentTime);
    const tomorrow = addDays(today, 1);

    // Check remaining times today
    for (const timeString of scheduleTimes) {
      const [hours, minutes] = timeString.split(":").map(Number);
      const doseTime = new Date(today);
      doseTime.setHours(hours || 0, minutes || 0, 0, 0);

      // Simplified timezone handling - would use proper conversion in production
      if (isAfter(doseTime, currentTime)) {
        return doseTime;
      }
    }

    // If no more doses today, get first dose tomorrow
    const firstSchedule = scheduleTimes[0];
    if (!firstSchedule) {
      return null;
    }
    const [hourPart, minutePart] = getTimeParts(firstSchedule);
    const hours = parseInt(hourPart, 10);
    const minutes = parseInt(minutePart, 10);
    const tomorrowDose = new Date(tomorrow);
    tomorrowDose.setHours(hours, minutes, 0, 0);

    return tomorrowDose; // Simplified - would use proper timezone conversion in production
  }

  // Helper methods
  private static getTimeLabel(
    time: string,
    constraints: {
      withFood?: boolean;
      avoidSleep?: boolean;
      minInterval?: number;
      maxInterval?: number;
    },
  ): string | undefined {
    if (constraints.withFood) {
      const [hourPart] = getTimeParts(time);
      const hour = parseInt(hourPart, 10);
      if (hour >= 6 && hour <= 9) return "With breakfast";
      if (hour >= 11 && hour <= 14) return "With lunch";
      if (hour >= 17 && hour <= 20) return "With dinner";
    }
    return undefined;
  }

  private static optimizeForMeals(times: ScheduleTime[]): ScheduleTime[] {
    const mealTimes = ["07:00", "12:00", "18:00"]; // Typical meal times

    return times.map((scheduleTime) => {
      const [hourPart] = getTimeParts(scheduleTime.time);
      const hour = parseInt(hourPart, 10);

      // Find closest meal time
      const closestMeal = mealTimes.reduce((closest, mealTime) => {
        const [mealHourPart] = getTimeParts(mealTime);
        const [closestHourPart] = getTimeParts(closest);
        const mealHour = parseInt(mealHourPart, 10);
        const closestHour = parseInt(closestHourPart, 10);

        return Math.abs(mealHour - hour) < Math.abs(closestHour - hour)
          ? mealTime
          : closest;
      });

      // If within 2 hours of a meal, adjust to meal time
      const [closestMealHourPart] = getTimeParts(closestMeal);
      const mealHour = parseInt(closestMealHourPart, 10);
      if (Math.abs(mealHour - hour) <= 2) {
        return {
          label: scheduleTime.label || "With meal",
          time: closestMeal,
        };
      }

      return scheduleTime;
    });
  }

  private static avoidSleepHours(times: ScheduleTime[]): ScheduleTime[] {
    const sleepStart = 22; // 10 PM
    const sleepEnd = 6; // 6 AM

    return times.map((scheduleTime) => {
      const [hourPart] = getTimeParts(scheduleTime.time);
      const hour = parseInt(hourPart, 10);

      // If time falls during sleep hours, adjust
      if (hour >= sleepStart || hour < sleepEnd) {
        // Move to 6 AM or nearest available time
        return {
          label: scheduleTime.label,
          time: "06:00",
        };
      }

      return scheduleTime;
    });
  }

  private static findCloseIntervals(
    times1: string[],
    times2: string[],
  ): string[] {
    const closeIntervals: string[] = [];

    times1.forEach((time1) => {
      times2.forEach((time2) => {
        const [hourPart1, minutePart1] = getTimeParts(time1);
        const [hourPart2, minutePart2] = getTimeParts(time2);
        const hour1 = parseInt(hourPart1, 10);
        const minute1 = parseInt(minutePart1, 10);
        const hour2 = parseInt(hourPart2, 10);
        const minute2 = parseInt(minutePart2, 10);

        const totalMinutes1 = hour1 * 60 + minute1;
        const totalMinutes2 = hour2 * 60 + minute2;

        const diff = Math.abs(totalMinutes1 - totalMinutes2);

        // If within 30 minutes
        if (diff > 0 && diff <= 30) {
          closeIntervals.push(`${time1} and ${time2}`);
        }
      });
    });

    return closeIntervals;
  }
}
