// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { addDays } from "date-fns";
import { RegimenSchedulingService } from "@/lib/services/regimen-scheduling.service";

describe("RegimenSchedulingService", () => {
  describe("generateDoseSchedule", () => {
    it("should generate schedule for twice daily dosing", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        2, // twice daily
        "FIXED",
        "09:00",
      );

      expect(result.frequency).toBe(2);
      expect(result.times).toHaveLength(2);
      expect(result.interval).toBe(12); // 24/2 = 12 hours
      expect(result.isOptimal).toBe(true);
      expect(result.times[0]?.time).toBe("09:00");
      expect(result.times[1]?.time).toBe("21:00");
    });

    it("should generate schedule for three times daily dosing", () => {
      const { frequency, interval, times } =
        RegimenSchedulingService.generateDoseSchedule(3, "FIXED", "08:00");

      expect(frequency).toBe(3);
      expect(times).toHaveLength(3);
      expect(interval).toBe(8); // 24/3 = 8 hours
      expect(times[0]?.time).toBe("08:00");
      expect(times[1]?.time).toBe("16:00");
      expect(times[2]?.time).toBe("00:00");
    });

    it("should optimize schedule for meal times", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        2,
        "FIXED",
        "08:30",
        { withFood: true },
      );

      expect(result.warnings).toContain("Schedule optimized for meal times");
      // Should adjust to nearest meal times
      expect(
        result.times.some((t) => t.time === "07:00" || t.time === "18:00"),
      ).toBe(true);
    });

    it("should avoid sleep hours", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        2,
        "FIXED",
        "23:00", // Late start time
        { avoidSleep: true },
      );

      expect(result.warnings).toContain(
        "Schedule adjusted to avoid typical sleep hours",
      );
      // Should move sleep-time doses to 6 AM
      expect(result.times.some((t) => t.time === "06:00")).toBe(true);
    });

    it("should handle PRN medications", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(0, "PRN");

      expect(result.frequency).toBe(0);
      expect(result.times).toHaveLength(0);
      expect(result.warnings).toContain("PRN medication - dose as needed");
    });

    it("should warn about invalid frequency", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        25, // Invalid - more than 24 times per day
        "FIXED",
      );

      expect(result.isOptimal).toBe(false);
      expect(result.warnings).toContain(
        "Invalid frequency - must be between 1 and 24 doses per day",
      );
    });

    it("should warn about minimum interval constraints", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        6, // Every 4 hours
        "FIXED",
        "09:00",
        { minInterval: 6 }, // Minimum 6 hours between doses
      );

      expect(result.isOptimal).toBe(false);
      expect(result.warnings).toContain(
        "Interval too short (4.0h), minimum is 6h",
      );
    });
  });

  describe("checkScheduleConflicts", () => {
    it("should detect exact time overlaps", () => {
      const newSchedule = {
        medicationName: "New Medication",
        times: ["09:00", "21:00"],
      };

      const existingSchedules = [
        {
          highRisk: false,
          medicationName: "Existing Medication",
          times: ["09:00", "18:00"],
        },
      ];

      const conflicts = RegimenSchedulingService.checkScheduleConflicts(
        newSchedule,
        existingSchedules,
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.conflictType).toBe("OVERLAP");
      expect(conflicts[0]?.description).toContain(
        "Time overlap with Existing Medication at 09:00",
      );
      expect(conflicts[0]?.severity).toBe("WARNING");
    });

    it("should escalate severity for high-risk medications", () => {
      const newSchedule = {
        medicationName: "New Medication",
        times: ["09:00"],
      };

      const existingSchedules = [
        {
          highRisk: true,
          medicationName: "High-Risk Medication",
          times: ["09:00"],
        },
      ];

      const conflicts = RegimenSchedulingService.checkScheduleConflicts(
        newSchedule,
        existingSchedules,
      );

      expect(conflicts[0]?.severity).toBe("ERROR");
    });

    it("should detect close intervals", () => {
      const newSchedule = {
        medicationName: "New Medication",
        times: ["09:00"],
      };

      const existingSchedules = [
        {
          highRisk: false,
          medicationName: "Close Medication",
          times: ["09:15"], // 15 minutes apart
        },
      ];

      const conflicts = RegimenSchedulingService.checkScheduleConflicts(
        newSchedule,
        existingSchedules,
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.conflictType).toBe("TIMING");
      expect(conflicts[0]?.description).toContain(
        "Multiple medications scheduled within 30 minutes",
      );
    });

    it("should warn about high frequency dosing", () => {
      const newSchedule = {
        medicationName: "Frequent Medication",
        times: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"], // 6 times daily
      };

      const conflicts = RegimenSchedulingService.checkScheduleConflicts(
        newSchedule,
        [],
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.conflictType).toBe("FREQUENCY");
      expect(conflicts[0]?.description).toContain(
        "High frequency dosing (6+ times daily)",
      );
      expect(conflicts[0]?.suggestion).toContain(
        "extended-release formulation",
      );
    });
  });

  describe("generateReminderSchedule", () => {
    it("should generate reminders for daily schedule", () => {
      const doseTimes = ["09:00", "21:00"];
      const timezone = "America/New_York";
      const startDate = new Date();
      const endDate = addDays(startDate, 7);

      const result = RegimenSchedulingService.generateReminderSchedule(
        "regimen-123",
        doseTimes,
        timezone,
        15, // 15 minutes before
        startDate,
        endDate,
      );

      expect(result.scheduleId).toBe("regimen-123");
      expect(result.timezone).toBe(timezone);
      expect(result.reminderTimes.length).toBeGreaterThan(0);
      expect(result.nextReminder).toBeTruthy();
    });

    it("should handle empty dose times", () => {
      const result = RegimenSchedulingService.generateReminderSchedule(
        "regimen-123",
        [],
        "UTC",
      );

      expect(result.reminderTimes).toHaveLength(0);
      expect(result.nextReminder).toBeNull();
    });
  });

  describe("optimizeScheduleForAdherence", () => {
    it("should optimize based on wake/sleep schedule", () => {
      const currentTimes = ["07:00", "19:00"];
      const preferences = {
        sleepTime: "22:00",
        wakeTime: "08:00",
      };

      const result = RegimenSchedulingService.optimizeScheduleForAdherence(
        currentTimes,
        preferences,
      );

      expect(result.adherenceScore).toBeGreaterThan(50);
      expect(result.improvementReason).toContain("Adjusted for sleep schedule");
      // Should move early dose to wake time
      expect(result.optimizedTimes.some((t) => t.time === "08:00")).toBe(true);
    });

    it("should align with meal times", () => {
      const currentTimes = ["08:30", "20:30"];
      const preferences = {
        mealTimes: ["07:00", "12:00", "18:00"],
      };

      const result = RegimenSchedulingService.optimizeScheduleForAdherence(
        currentTimes,
        preferences,
      );

      expect(result.adherenceScore).toBeGreaterThan(50);
      expect(result.improvementReason).toContain("Aligned with meal times");
      // Should optimize times and remove duplicates
      expect(result.optimizedTimes.length).toBeGreaterThan(0);
      // Just verify the optimization process worked
      expect(result.optimizedTimes.length).toBeLessThanOrEqual(2);
    });

    it("should adjust for work schedule", () => {
      const currentTimes = ["09:00", "15:00"]; // During work hours
      const preferences = {
        workSchedule: { end: "17:00", start: "08:00" },
      };

      const result = RegimenSchedulingService.optimizeScheduleForAdherence(
        currentTimes,
        preferences,
      );

      expect(result.adherenceScore).toBeGreaterThan(50);
      expect(result.improvementReason).toContain("Adjusted for work schedule");
    });
  });

  describe("getNextDoseTime", () => {
    it("should return next dose today", () => {
      const now = new Date();
      now.setHours(10, 0, 0, 0); // 10:00 AM

      const scheduleTimes = ["09:00", "14:00", "21:00"];
      const timezone = "UTC";

      const nextDose = RegimenSchedulingService.getNextDoseTime(
        scheduleTimes,
        timezone,
        now,
      );

      expect(nextDose).toBeTruthy();
      if (nextDose) {
        expect(nextDose.getHours()).toBe(14); // Next dose at 2 PM
      }
    });

    it("should return first dose tomorrow if no more today", () => {
      const now = new Date();
      now.setHours(22, 0, 0, 0); // 10:00 PM

      const scheduleTimes = ["09:00", "21:00"];
      const timezone = "UTC";

      const nextDose = RegimenSchedulingService.getNextDoseTime(
        scheduleTimes,
        timezone,
        now,
      );

      expect(nextDose).toBeTruthy();
      if (nextDose) {
        expect(nextDose.getHours()).toBe(9); // First dose tomorrow at 9 AM
        expect(nextDose.getDate()).toBe(now.getDate() + 1);
      }
    });

    it("should return null for empty schedule", () => {
      const nextDose = RegimenSchedulingService.getNextDoseTime([], "UTC");

      expect(nextDose).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle midnight crossover schedules", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        4,
        "FIXED",
        "22:00", // Starting late at night
      );

      expect(result.times).toHaveLength(4);
      expect(
        result.times.some((t): boolean => {
          return !(12 <= parseInt(t.time.split(":")[0], 10));
        }),
      ).toBe(true); // Some times should be in AM
    });

    it("should handle very frequent dosing", () => {
      const result = RegimenSchedulingService.generateDoseSchedule(
        12, // Every 2 hours
        "FIXED",
        "00:00",
      );

      expect(result.frequency).toBe(12);
      expect(result.interval).toBe(2);
      expect(result.times).toHaveLength(12);
    });
  });
});
