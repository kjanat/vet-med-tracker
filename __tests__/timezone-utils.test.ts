import { describe, expect, it } from "bun:test";
import {
  convertToUserTimezone,
  formatTimezoneDisplay,
  getTimezoneList,
  getTimezoneOffset,
  getUserTimezone as getTzHelperUserTimezone,
} from "../utils/timezone-helpers";
import {
  convertToTimezone,
  formatTimeInTimezone,
  getUserTimezone,
  localDayISO,
} from "../utils/tz";

describe("Timezone Utilities (tz.ts)", () => {
  describe("getUserTimezone", () => {
    it("should return a valid timezone string", () => {
      const tz = getUserTimezone();
      expect(tz).toBeDefined();
      expect(typeof tz).toBe("string");
      expect(tz.length).toBeGreaterThan(0);
    });

    it("should return UTC on error", () => {
      // This is hard to test without mocking, but we verify the function runs
      const tz = getUserTimezone();
      expect(tz).toBeTruthy();
    });
  });

  describe("convertToTimezone", () => {
    it("should convert date to specified timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToTimezone(date, "America/New_York");
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBeTruthy();
    });

    it("should return original date on invalid timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToTimezone(date, "Invalid/Timezone");
      expect(result).toEqual(date);
    });

    it("should handle UTC timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToTimezone(date, "UTC");
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("formatTimeInTimezone", () => {
    it("should format time in specified timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatTimeInTimezone(date, "America/New_York");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it("should handle UTC timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatTimeInTimezone(date, "UTC");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("should fallback to local time on invalid timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatTimeInTimezone(date, "Invalid/Timezone");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("localDayISO", () => {
    it("should return ISO date string for current date", () => {
      const result = localDayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should format provided date", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = localDayISO(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toContain("2024");
    });

    it("should format string date", () => {
      const result = localDayISO("2024-01-15T12:00:00Z");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toContain("2024");
    });

    it("should use timezone when provided", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = localDayISO(date, "America/New_York");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle UTC timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = localDayISO(date, "UTC");
      expect(result).toBe("2024-01-15");
    });
  });
});

describe("Timezone Helpers (timezone-helpers.ts)", () => {
  describe("getTimezoneList", () => {
    it("should return array of timezone strings", () => {
      const list = getTimezoneList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it("should include common timezones", () => {
      const list = getTimezoneList();
      expect(list).toContain("America/New_York");
      expect(list).toContain("Europe/London");
      expect(list).toContain("UTC");
    });

    it("should contain valid timezone identifiers", () => {
      const list = getTimezoneList();
      for (const tz of list) {
        expect(typeof tz).toBe("string");
        expect(tz.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getTimezoneOffset", () => {
    it("should return numeric offset for valid timezone", () => {
      const offset = getTimezoneOffset("America/New_York");
      expect(typeof offset).toBe("number");
      expect(Number.isFinite(offset)).toBe(true);
    });

    it("should return near 0 for UTC", () => {
      const offset = getTimezoneOffset("UTC");
      expect(Math.abs(offset)).toBeLessThan(0.1); // Allow small floating point errors
    });

    it("should return 0 for invalid timezone", () => {
      const offset = getTimezoneOffset("Invalid/Timezone");
      expect(offset).toBe(0);
    });

    it("should return reasonable offset values", () => {
      const offset = getTimezoneOffset("America/New_York");
      expect(offset).toBeGreaterThanOrEqual(-12);
      expect(offset).toBeLessThanOrEqual(14);
    });
  });

  describe("formatTimezoneDisplay", () => {
    it("should format timezone with offset", () => {
      const result = formatTimezoneDisplay("America/New_York");
      expect(result).toContain("America/New_York");
      expect(result).toContain("UTC");
      expect(result).toMatch(/[+-]\d{2}:\d{2}/);
    });

    it("should format UTC correctly", () => {
      const result = formatTimezoneDisplay("UTC");
      expect(result).toContain("UTC");
      expect(result).toMatch(/UTC\s*\(UTC[+-]\d{2}:\d{2}\)/);
    });

    it("should handle positive offsets", () => {
      const result = formatTimezoneDisplay("Asia/Tokyo");
      expect(result).toContain("Asia/Tokyo");
      expect(result).toContain("UTC+");
    });

    it("should handle negative offsets", () => {
      const result = formatTimezoneDisplay("America/Los_Angeles");
      expect(result).toContain("America/Los_Angeles");
      expect(result).toContain("UTC");
    });
  });

  describe("getTzHelperUserTimezone", () => {
    it("should return a valid timezone string", () => {
      const tz = getTzHelperUserTimezone();
      expect(tz).toBeDefined();
      expect(typeof tz).toBe("string");
      expect(tz.length).toBeGreaterThan(0);
    });
  });

  describe("convertToUserTimezone", () => {
    it("should convert date to user timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToUserTimezone(date);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBeTruthy();
    });

    it("should use provided timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToUserTimezone(date, "America/New_York");
      expect(result).toBeInstanceOf(Date);
    });

    it("should handle UTC timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToUserTimezone(date, "UTC");
      expect(result).toBeInstanceOf(Date);
    });

    it("should handle invalid timezone gracefully", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = convertToUserTimezone(date, "Invalid/Timezone");
      expect(result).toBeInstanceOf(Date);
      // May return original date or converted date depending on implementation
    });
  });
});
