import { describe, expect, setSystemTime, test } from "bun:test";
import { DateTime } from "luxon";
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
} from "../lib/utils/dates";

const FIXED_DATE = DateTime.fromISO("2024-03-20T15:30:00", {
  zone: "UTC",
}).toJSDate();

describe("date utilities", () => {
  test("formats dates and times respecting timezone choices", () => {
    const eastern = "America/New_York";
    expect(formatDate(FIXED_DATE, "MMM dd, yyyy", eastern)).toBe(
      "Mar 20, 2024",
    );
    expect(formatTime(FIXED_DATE, false, eastern)).toBe("11:30 AM");
    expect(formatTime(FIXED_DATE, true, eastern)).toBe("11:30");
    expect(formatDateTime(FIXED_DATE, eastern)).toBe(
      "Mar 20, 2024 at 11:30 AM",
    );
    expect(formatDate(null)).toBe("");
  });

  test("calculates dosing cadence helpers", () => {
    const nextDose = calculateNextDose(FIXED_DATE, "BID");
    expect(DateTime.fromJSDate(nextDose).toISO()).toBe(
      DateTime.fromJSDate(FIXED_DATE).plus({ hours: 12 }).toISO(),
    );

    const fiveDaysLater = DateTime.fromJSDate(FIXED_DATE)
      .plus({ days: 5 })
      .toJSDate();
    expect(getDaysBetween(FIXED_DATE, fiveDaysLater)).toBe(5);

    const schedule = generateDoseSchedule(FIXED_DATE, "Q6H", 1, "UTC");
    expect(schedule).toHaveLength(4);
    if (schedule[0] && schedule[1]) {
      const first = DateTime.fromJSDate(schedule[0]);
      const second = DateTime.fromJSDate(schedule[1]);
      expect(second.diff(first, "hours").hours).toBe(6);
    }
  });

  test("handles timezone conversion and comparisons", () => {
    const pacific = "America/Los_Angeles";
    const converted = convertToTimezone(FIXED_DATE, pacific);
    const convertedDt = DateTime.fromJSDate(converted, { zone: pacific });

    expect(convertedDt.hour).toBe(8);
    expect(isSameDay(FIXED_DATE, converted, "UTC")).toBe(true);
    expect(addDays(FIXED_DATE, 2).getUTCDate()).toBe(22);

    const start = startOfDay(FIXED_DATE, pacific);
    const end = endOfDay(FIXED_DATE, pacific);
    expect(DateTime.fromJSDate(start, { zone: pacific }).hour).toBe(0);
    expect(DateTime.fromJSDate(end, { zone: pacific }).hour).toBe(23);
  });

  test("formats durations into friendly strings", () => {
    expect(formatDuration(36 * 60 * 60 * 1000)).toBe("1 day 12 hours");
    expect(formatDuration(45 * 1000)).toBe("45 seconds");
  });

  test("formats durations with only minutes", () => {
    expect(formatDuration(60 * 1000)).toBe("1 minute");
  });

  test("parses standard and custom veterinary frequency codes", () => {
    expect(parseFrequency("bid")).toEqual({ hours: 12, timesPerDay: 2 });
    expect(parseFrequency("Q4H")).toEqual({ hours: 4, timesPerDay: 6 });
    expect(parseFrequency("every 8 hours")).toEqual({
      hours: 8,
      timesPerDay: 3,
    });
    expect(parseFrequency("every 1 hours")).toEqual({
      hours: 1,
      timesPerDay: 24,
    });
    expect(parseFrequency("once daily")).toEqual({ hours: 24, timesPerDay: 1 });
    expect(parseFrequency("twice daily")).toEqual({
      hours: 12,
      timesPerDay: 2,
    });
    expect(parseFrequency("three times daily")).toEqual({
      hours: 8,
      timesPerDay: 3,
    });
    expect(parseFrequency("four times daily")).toEqual({
      hours: 6,
      timesPerDay: 4,
    });
    expect(parseFrequency("every 2 hours")).toEqual({
      hours: 2,
      timesPerDay: 12,
    });
    expect(() => parseFrequency("unknown")).toThrow(
      "Unknown frequency format: unknown",
    );
  });

  test("evaluates overdue, relative time, and range logic", () => {
    setSystemTime(new Date("2024-03-21T00:00:00Z"));

    const pastDose = DateTime.fromISO("2024-03-20T19:00:00Z").toJSDate();
    expect(isOverdue(pastDose, 30)).toBe(true);

    const upcoming = DateTime.fromISO("2024-03-21T00:20:00Z").toJSDate();
    expect(isOverdue(upcoming, 30)).toBe(false);

    expect(formatTimeAgo(pastDose)).toBe("5 hours ago");
    expect(
      formatTimeAgo(DateTime.fromISO("2024-03-21T00:30:00Z").toJSDate()),
    ).toBe("in 30 minutes");
    expect(
      formatTimeAgo(DateTime.fromISO("2024-03-19T00:00:00Z").toJSDate()),
    ).toBe("2 days ago");

    const nearFuture = DateTime.fromISO("2024-03-21T00:10:00Z").toJSDate();
    expect(isWithinRange(nearFuture, 15, "minutes")).toBe(true);
    const farFuture = DateTime.fromISO("2024-03-22T00:00:00Z").toJSDate();
    expect(isWithinRange(farFuture, 12, "hours")).toBe(false);

    setSystemTime();
  });

  test("computes age and upcoming dose occurrences", () => {
    setSystemTime(new Date("2024-03-21T12:00:00Z"));

    const birth = DateTime.fromISO("2020-01-01T00:00:00Z").toJSDate();
    expect(calculateAge(birth)).toEqual({
      months: 2,
      totalMonths: 50,
      years: 4,
    });

    const morning = getNextOccurrence(8, 0, "UTC");
    const morningDt = DateTime.fromJSDate(morning, { zone: "UTC" });
    expect(morningDt.hour).toBe(8);
    expect(morningDt.day).toBe(22);

    const laterToday = getNextOccurrence(13, 0, "UTC");
    const laterDt = DateTime.fromJSDate(laterToday, { zone: "UTC" });
    expect(laterDt.day).toBe(21);
    expect(laterDt.hour).toBe(13);

    setSystemTime();
  });

  test("derives current date in timezone", () => {
    setSystemTime(new Date("2024-03-21T05:00:00Z"));

    const date = getCurrentDateInTimezone("America/New_York");
    const dt = DateTime.fromJSDate(date, { zone: "America/New_York" });
    expect(dt.hour).toBe(1);

    setSystemTime();
  });
});
