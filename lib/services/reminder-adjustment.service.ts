/**
 * Reminder Adjustment Service
 * Handles quick adjustments to medication reminders
 * Provides common reminder patterns and time modifications
 */

export interface ReminderTime {
  hours: number;
  minutes: number;
  label?: string;
}

export interface ReminderAdjustment {
  regimenId: string;
  newTimes: string[]; // Array of "HH:MM" format times
  reason?: string;
  temporary?: boolean; // If true, adjustment is for today only
}

export interface QuickAdjustmentOption {
  id: string;
  label: string;
  description: string;
  timeModification: (currentTimes: string[]) => string[];
}

export class ReminderAdjustmentService {
  private static getTimeParts(time: string): [number, number] {
    const [hours = "0", minutes = "0"] = time.split(":");
    return [Number(hours), Number(minutes)];
  }

  /**
   * Common quick adjustment options
   */
  static getQuickAdjustmentOptions(): QuickAdjustmentOption[] {
    return [
      {
        description: "Push all reminders 30 minutes later",
        id: "delay-30min",
        label: "Delay 30 minutes",
        timeModification: (times) =>
          times.map((time) =>
            ReminderAdjustmentService.addMinutesToTime(time, 30),
          ),
      },
      {
        description: "Push all reminders 1 hour later",
        id: "delay-1hour",
        label: "Delay 1 hour",
        timeModification: (times) =>
          times.map((time) =>
            ReminderAdjustmentService.addMinutesToTime(time, 60),
          ),
      },
      {
        description: "Move all reminders 30 minutes earlier",
        id: "advance-30min",
        label: "Advance 30 minutes",
        timeModification: (times) =>
          times.map((time) =>
            ReminderAdjustmentService.addMinutesToTime(time, -30),
          ),
      },
      {
        description: "Move to standard morning times (8 AM, 2 PM, 8 PM)",
        id: "morning-shift",
        label: "Morning shift",
        timeModification: () => ["08:00", "14:00", "20:00"],
      },
      {
        description: "Move to standard evening times (9 AM, 5 PM, 11 PM)",
        id: "evening-shift",
        label: "Evening shift",
        timeModification: () => ["09:00", "17:00", "23:00"],
      },
      {
        description: "Adjust for 9-5 schedule (7 AM, 12 PM, 7 PM)",
        id: "working-hours",
        label: "Working hours",
        timeModification: () => ["07:00", "12:00", "19:00"],
      },
    ];
  }

  /**
   * Add or subtract minutes from a time string
   */
  private static addMinutesToTime(
    timeStr: string,
    minutesToAdd: number,
  ): string {
    const [hours, minutes] = ReminderAdjustmentService.getTimeParts(timeStr);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;

    // Handle day overflow/underflow
    let adjustedMinutes = totalMinutes;
    if (adjustedMinutes < 0) {
      adjustedMinutes += 24 * 60; // Add 24 hours
    } else if (adjustedMinutes >= 24 * 60) {
      adjustedMinutes -= 24 * 60; // Subtract 24 hours
    }

    const newHours = Math.floor(adjustedMinutes / 60);
    const newMinutes = adjustedMinutes % 60;

    return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
  }

  /**
   * Validate time format (HH:MM)
   */
  static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Format time for display (12-hour format)
   */
  static formatTimeForDisplay(time: string): string {
    const [hours, minutes] = ReminderAdjustmentService.getTimeParts(time);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  /**
   * Parse 12-hour format to 24-hour format
   */
  static parse12HourTo24Hour(time: string): string {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      throw new Error("Invalid time format. Expected format: H:MM AM/PM");
    }

    const hoursStr = match[1] ?? "0";
    const minutesStr = match[2] ?? "0";
    const period = (match[3] ?? "AM").toUpperCase();

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  /**
   * Get suggested times based on frequency
   */
  static getSuggestedTimes(frequency: number): string[] {
    const suggestions: { [key: number]: string[] } = {
      1: ["08:00"], // Once daily
      2: ["08:00", "20:00"], // Twice daily (12 hours apart)
      3: ["08:00", "14:00", "20:00"], // Three times daily (6-8 hours apart)
      4: ["08:00", "14:00", "20:00", "02:00"], // Four times daily (6 hours apart)
    };

    return suggestions[frequency] || ["08:00"];
  }

  /**
   * Calculate time intervals between doses
   */
  static calculateIntervals(times: string[]): number[] {
    if (times.length < 2) return [];

    const sortedTimes = [...times].sort();
    const intervals: number[] = [];

    for (let i = 1; i < sortedTimes.length; i++) {
      const prevTime = sortedTimes[i - 1];
      const currTime = sortedTimes[i];
      if (prevTime && currTime) {
        const [prevHours, prevMinutes] =
          ReminderAdjustmentService.getTimeParts(prevTime);
        const [currHours, currMinutes] =
          ReminderAdjustmentService.getTimeParts(currTime);

        const prevTotalMinutes = prevHours * 60 + prevMinutes;
        const currTotalMinutes = currHours * 60 + currMinutes;

        intervals.push(currTotalMinutes - prevTotalMinutes);
      }
    }

    // Add interval from last dose to first dose of next day
    const firstTime = sortedTimes[0];
    const lastTime = sortedTimes[sortedTimes.length - 1];

    if (firstTime && lastTime) {
      const [firstHours, firstMinutes] =
        ReminderAdjustmentService.getTimeParts(firstTime);
      const [lastHours, lastMinutes] =
        ReminderAdjustmentService.getTimeParts(lastTime);

      const firstTotalMinutes = firstHours * 60 + firstMinutes;
      const lastTotalMinutes = lastHours * 60 + lastMinutes;

      intervals.push(24 * 60 - lastTotalMinutes + firstTotalMinutes);
    }

    return intervals;
  }

  /**
   * Check if times are evenly spaced
   */
  static areTimesEvenlySpaced(
    times: string[],
    toleranceMinutes: number = 30,
  ): boolean {
    const intervals = ReminderAdjustmentService.calculateIntervals(times);
    if (intervals.length === 0) return true;

    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return intervals.every(
      (interval) => Math.abs(interval - averageInterval) <= toleranceMinutes,
    );
  }

  /**
   * Generate evenly spaced times for given frequency
   */
  static generateEvenlySpacedTimes(
    frequency: number,
    startTime: string = "08:00",
  ): string[] {
    const [startHours, startMinutes] =
      ReminderAdjustmentService.getTimeParts(startTime);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const intervalMinutes = Math.floor((24 * 60) / frequency);

    const times: string[] = [];

    for (let i = 0; i < frequency; i++) {
      const totalMinutes =
        (startTotalMinutes + i * intervalMinutes) % (24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      times.push(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
      );
    }

    return times.sort();
  }

  /**
   * Get time adjustment preview
   */
  static getAdjustmentPreview(
    currentTimes: string[],
    adjustment: QuickAdjustmentOption,
  ): {
    before: string[];
    after: string[];
    description: string;
  } {
    const newTimes = adjustment.timeModification(currentTimes);

    return {
      after: newTimes.map((time) =>
        ReminderAdjustmentService.formatTimeForDisplay(time),
      ),
      before: currentTimes.map((time) =>
        ReminderAdjustmentService.formatTimeForDisplay(time),
      ),
      description: adjustment.description,
    };
  }
}
