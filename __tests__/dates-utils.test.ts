import { describe, expect, it } from "bun:test";
import {
  addDays,
  calculateAge,
  calculateNextDose,
  convertToTimezone,
  endOfDay,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  formatTimeAgo,
  generateDoseSchedule,
  getCurrentDateInTimezone,
  getDaysBetween,
  getNextOccurrence,
  isOverdue,
  isSameDay,
  isWithinRange,
  parseFrequency,
  startOfDay,
} from "@/lib/utils/dates";

describe("Date Utils", () => {
  describe("formatDate", () => {
    it("formats date with default format", () => {
      const date = new Date("2024-03-15T10:30:00Z");
      const result = formatDate(date);
      expect(result).toContain("2024");
      expect(result).toContain("15");
    });

    it("returns empty string for null date", () => {
      const result = formatDate(null);
      expect(result).toBe("");
    });

    it("formats date with custom format", () => {
      const date = new Date("2024-03-15T10:30:00Z");
      const result = formatDate(date, "yyyy-MM-dd");
      expect(result).toBe("2024-03-15");
    });
  });

  describe("formatTime", () => {
    it("formats time in 12-hour format by default", () => {
      const date = new Date("2024-03-15T14:30:00Z");
      const result = formatTime(date);
      expect(result).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/i);
    });

    it("formats time in 24-hour format when requested", () => {
      const date = new Date("2024-03-15T14:30:00Z");
      const result = formatTime(date, true);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe("formatDateTime", () => {
    it("formats full datetime", () => {
      const date = new Date("2024-03-15T14:30:00Z");
      const result = formatDateTime(date);
      expect(result).toContain("2024");
      expect(result).toContain("at");
    });
  });

  describe("parseFrequency", () => {
    it("parses SID (once daily)", () => {
      const result = parseFrequency("SID");
      expect(result.timesPerDay).toBe(1);
      expect(result.hours).toBe(24);
    });

    it("parses BID (twice daily)", () => {
      const result = parseFrequency("BID");
      expect(result.timesPerDay).toBe(2);
      expect(result.hours).toBe(12);
    });

    it("parses TID (three times daily)", () => {
      const result = parseFrequency("TID");
      expect(result.timesPerDay).toBe(3);
      expect(result.hours).toBe(8);
    });

    it("parses QID (four times daily)", () => {
      const result = parseFrequency("QID");
      expect(result.timesPerDay).toBe(4);
      expect(result.hours).toBe(6);
    });

    it("parses Q4H (every 4 hours)", () => {
      const result = parseFrequency("Q4H");
      expect(result.hours).toBe(4);
      expect(result.timesPerDay).toBe(6);
    });

    it("parses Q6H (every 6 hours)", () => {
      const result = parseFrequency("Q6H");
      expect(result.hours).toBe(6);
      expect(result.timesPerDay).toBe(4);
    });

    it("parses Q8H (every 8 hours)", () => {
      const result = parseFrequency("Q8H");
      expect(result.hours).toBe(8);
      expect(result.timesPerDay).toBe(3);
    });

    it("parses Q12H (every 12 hours)", () => {
      const result = parseFrequency("Q12H");
      expect(result.hours).toBe(12);
      expect(result.timesPerDay).toBe(2);
    });

    it("parses custom 'EVERY X HOURS' format", () => {
      const result = parseFrequency("EVERY 4 HOURS");
      expect(result.hours).toBe(4);
      expect(result.timesPerDay).toBe(6);
    });

    it("parses 'ONCE DAILY' format", () => {
      const result = parseFrequency("ONCE DAILY");
      expect(result.hours).toBe(24);
      expect(result.timesPerDay).toBe(1);
    });

    it("parses 'TWICE DAILY' format", () => {
      const result = parseFrequency("TWICE DAILY");
      expect(result.hours).toBe(12);
      expect(result.timesPerDay).toBe(2);
    });

    it("throws error for unknown format", () => {
      expect(() => parseFrequency("UNKNOWN")).toThrow();
    });

    it("is case-insensitive", () => {
      const result = parseFrequency("bid");
      expect(result.timesPerDay).toBe(2);
    });
  });

  describe("calculateNextDose", () => {
    it("calculates next dose for BID frequency", () => {
      const lastDose = new Date("2024-03-15T08:00:00Z");
      const nextDose = calculateNextDose(lastDose, "BID");
      const expectedTime = new Date("2024-03-15T20:00:00Z");

      expect(nextDose.getTime()).toBe(expectedTime.getTime());
    });

    it("calculates next dose for Q8H frequency", () => {
      const lastDose = new Date("2024-03-15T08:00:00Z");
      const nextDose = calculateNextDose(lastDose, "Q8H");
      const expectedTime = new Date("2024-03-15T16:00:00Z");

      expect(nextDose.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe("getDaysBetween", () => {
    it("calculates days between two dates", () => {
      const start = new Date("2024-03-15");
      const end = new Date("2024-03-20");
      const days = getDaysBetween(start, end);

      expect(days).toBe(5);
    });

    it("returns 0 for same date", () => {
      const date = new Date("2024-03-15");
      const days = getDaysBetween(date, date);

      expect(days).toBe(0);
    });
  });

  describe("isOverdue", () => {
    it("returns true when dose is overdue beyond tolerance", () => {
      const scheduledTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const result = isOverdue(scheduledTime, 30);

      expect(result).toBe(true);
    });

    it("returns false when dose is within tolerance", () => {
      const scheduledTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      const result = isOverdue(scheduledTime, 30);

      expect(result).toBe(false);
    });

    it("returns false for future doses", () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const result = isOverdue(scheduledTime);

      expect(result).toBe(false);
    });
  });

  describe("formatTimeAgo", () => {
    it("formats time in the past", () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = formatTimeAgo(pastDate);

      expect(result).toContain("ago");
      expect(result).toContain("hour");
    });

    it("formats time in the future", () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const result = formatTimeAgo(futureDate);

      expect(result).toContain("in");
      expect(result).toContain("minute");
    });
  });

  describe("convertToTimezone", () => {
    it("converts date to specified timezone", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = convertToTimezone(date, "America/New_York");

      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("isSameDay", () => {
    it("returns true for same day", () => {
      const date1 = new Date("2024-03-15T08:00:00Z");
      const date2 = new Date("2024-03-15T18:00:00Z");

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("returns false for different days", () => {
      const date1 = new Date("2024-03-15T12:00:00Z");
      const date2 = new Date("2024-03-16T12:00:00Z");

      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe("addDays", () => {
    it("adds positive days", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = addDays(date, 5);
      const expected = new Date("2024-03-20T12:00:00Z");

      expect(result.getTime()).toBe(expected.getTime());
    });

    it("subtracts negative days", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = addDays(date, -5);
      const expected = new Date("2024-03-10T12:00:00Z");

      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe("startOfDay and endOfDay", () => {
    it("gets start of day", () => {
      const date = new Date("2024-03-15T14:30:45Z");
      const result = startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("gets end of day", () => {
      const date = new Date("2024-03-15T14:30:45Z");
      const result = endOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe("formatDuration", () => {
    it("formats hours and minutes", () => {
      const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000; // 2.5 hours
      const result = formatDuration(ms);

      expect(result).toContain("hour");
      expect(result).toContain("minute");
    });

    it("formats days and hours", () => {
      const ms = 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000; // 2 days 3 hours
      const result = formatDuration(ms);

      expect(result).toContain("day");
      expect(result).toContain("hour");
    });

    it("formats seconds when duration is very short", () => {
      const ms = 30 * 1000; // 30 seconds
      const result = formatDuration(ms);

      expect(result).toContain("second");
    });
  });

  describe("generateDoseSchedule", () => {
    it("generates schedule for BID frequency", () => {
      const startDate = new Date("2024-03-15T08:00:00Z");
      const schedule = generateDoseSchedule(startDate, "BID", 2);

      expect(schedule.length).toBe(4); // 2 doses per day for 2 days
      expect(schedule[0]?.getTime()).toBe(startDate.getTime());
    });

    it("generates schedule for Q8H frequency", () => {
      const startDate = new Date("2024-03-15T08:00:00Z");
      const schedule = generateDoseSchedule(startDate, "Q8H", 1);

      expect(schedule.length).toBe(3); // 3 doses per day
    });
  });

  describe("getCurrentDateInTimezone", () => {
    it("returns current date in specified timezone", () => {
      const result = getCurrentDateInTimezone("America/New_York");

      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("calculateAge", () => {
    it("calculates age in years and months", () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 3);
      birthDate.setMonth(birthDate.getMonth() - 6);

      const result = calculateAge(birthDate);

      expect(result.years).toBe(3);
      expect(result.months).toBe(6);
      expect(result.totalMonths).toBe(42);
    });
  });

  describe("isWithinRange", () => {
    it("returns true when date is within range", () => {
      const date = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = isWithinRange(date, 60, "minutes");

      expect(result).toBe(true);
    });

    it("returns false when date is outside range", () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = isWithinRange(date, 60, "minutes");

      expect(result).toBe(false);
    });
  });

  describe("getNextOccurrence", () => {
    it("returns next occurrence of target time", () => {
      const result = getNextOccurrence(14, 30); // 2:30 PM

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(0);
    });
  });
});
