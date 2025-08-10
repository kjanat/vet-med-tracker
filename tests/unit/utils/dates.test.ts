/**
 * Unit tests for date utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DateTime } from "luxon";

// Import the date utility functions (these would need to be created in lib/utils/dates.ts)
import {
	formatDate,
	formatTime,
	formatDateTime,
	calculateNextDose,
	getDaysBetween,
	isOverdue,
	formatTimeAgo,
	convertToTimezone,
	isSameDay,
	addDays,
	startOfDay,
	endOfDay,
	formatDuration,
	parseFrequency,
	generateDoseSchedule,
} from "@/lib/utils/dates";

describe("Date Utilities", () => {
	beforeEach(() => {
		// Set a fixed date for consistent testing
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2023-06-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("formatDate", () => {
		it("formats date in default format", () => {
			const date = new Date("2023-06-15T10:30:00Z");
			const result = formatDate(date);

			expect(result).toBe("Jun 15, 2023");
		});

		it("formats date in custom format", () => {
			const date = new Date("2023-06-15T10:30:00Z");
			const result = formatDate(date, "yyyy-MM-dd");

			expect(result).toBe("2023-06-15");
		});

		it("handles timezone conversion", () => {
			const date = new Date("2023-06-15T10:30:00Z");
			const result = formatDate(date, "MMM d, yyyy h:mm a", "America/New_York");

			expect(result).toBe("Jun 15, 2023 6:30 AM");
		});

		it("handles null/undefined dates", () => {
			expect(formatDate(null)).toBe("");
			expect(formatDate(undefined)).toBe("");
		});
	});

	describe("formatTime", () => {
		it("formats time in 12-hour format", () => {
			const date = new Date("2023-06-15T14:30:00Z");
			const result = formatTime(date);

			expect(result).toBe("2:30 PM");
		});

		it("formats time in 24-hour format", () => {
			const date = new Date("2023-06-15T14:30:00Z");
			const result = formatTime(date, true);

			expect(result).toBe("14:30");
		});

		it("handles timezone conversion", () => {
			const date = new Date("2023-06-15T18:30:00Z");
			const result = formatTime(date, false, "America/Los_Angeles");

			expect(result).toBe("11:30 AM");
		});
	});

	describe("formatDateTime", () => {
		it("formats full date and time", () => {
			const date = new Date("2023-06-15T14:30:00Z");
			const result = formatDateTime(date);

			expect(result).toBe("Jun 15, 2023 at 2:30 PM");
		});

		it("handles timezone conversion", () => {
			const date = new Date("2023-06-15T14:30:00Z");
			const result = formatDateTime(date, "America/New_York");

			expect(result).toBe("Jun 15, 2023 at 10:30 AM");
		});
	});

	describe("calculateNextDose", () => {
		it("calculates next dose for twice daily medication", () => {
			const lastDose = new Date("2023-06-15T08:00:00Z");
			const frequency = "BID"; // Twice daily, every 12 hours

			const nextDose = calculateNextDose(lastDose, frequency);

			expect(nextDose).toEqual(new Date("2023-06-15T20:00:00Z"));
		});

		it("calculates next dose for every 8 hours", () => {
			const lastDose = new Date("2023-06-15T08:00:00Z");
			const frequency = "Q8H"; // Every 8 hours

			const nextDose = calculateNextDose(lastDose, frequency);

			expect(nextDose).toEqual(new Date("2023-06-15T16:00:00Z"));
		});

		it("calculates next dose for daily medication", () => {
			const lastDose = new Date("2023-06-15T08:00:00Z");
			const frequency = "SID"; // Once daily

			const nextDose = calculateNextDose(lastDose, frequency);

			expect(nextDose).toEqual(new Date("2023-06-16T08:00:00Z"));
		});

		it("handles custom hourly intervals", () => {
			const lastDose = new Date("2023-06-15T08:00:00Z");
			const frequency = "Q6H"; // Every 6 hours

			const nextDose = calculateNextDose(lastDose, frequency);

			expect(nextDose).toEqual(new Date("2023-06-15T14:00:00Z"));
		});
	});

	describe("getDaysBetween", () => {
		it("calculates days between two dates", () => {
			const startDate = new Date("2023-06-01");
			const endDate = new Date("2023-06-15");

			const days = getDaysBetween(startDate, endDate);

			expect(days).toBe(14);
		});

		it("handles same day", () => {
			const date = new Date("2023-06-15");

			const days = getDaysBetween(date, date);

			expect(days).toBe(0);
		});

		it("handles negative range", () => {
			const startDate = new Date("2023-06-15");
			const endDate = new Date("2023-06-01");

			const days = getDaysBetween(startDate, endDate);

			expect(days).toBe(-14);
		});
	});

	describe("isOverdue", () => {
		it("detects overdue dose", () => {
			const scheduledTime = new Date("2023-06-15T10:00:00Z");
			const currentTime = new Date("2023-06-15T12:30:00Z"); // 2.5 hours late

			vi.setSystemTime(currentTime);

			const result = isOverdue(scheduledTime);

			expect(result).toBe(true);
		});

		it("detects on-time dose", () => {
			const scheduledTime = new Date("2023-06-15T14:00:00Z");
			const currentTime = new Date("2023-06-15T12:00:00Z"); // 2 hours early

			vi.setSystemTime(currentTime);

			const result = isOverdue(scheduledTime);

			expect(result).toBe(false);
		});

		it("uses custom tolerance", () => {
			const scheduledTime = new Date("2023-06-15T12:00:00Z");
			const currentTime = new Date("2023-06-15T12:45:00Z"); // 45 minutes late

			vi.setSystemTime(currentTime);

			// Should not be overdue with 1-hour tolerance
			expect(isOverdue(scheduledTime, 60)).toBe(false);

			// Should be overdue with 30-minute tolerance
			expect(isOverdue(scheduledTime, 30)).toBe(true);
		});
	});

	describe("formatTimeAgo", () => {
		it("formats recent time", () => {
			const pastDate = new Date("2023-06-15T11:30:00Z"); // 30 minutes ago

			const result = formatTimeAgo(pastDate);

			expect(result).toBe("30 minutes ago");
		});

		it("formats hours ago", () => {
			const pastDate = new Date("2023-06-15T09:00:00Z"); // 3 hours ago

			const result = formatTimeAgo(pastDate);

			expect(result).toBe("3 hours ago");
		});

		it("formats days ago", () => {
			const pastDate = new Date("2023-06-13T12:00:00Z"); // 2 days ago

			const result = formatTimeAgo(pastDate);

			expect(result).toBe("2 days ago");
		});

		it("handles future dates", () => {
			const futureDate = new Date("2023-06-15T14:00:00Z"); // 2 hours from now

			const result = formatTimeAgo(futureDate);

			expect(result).toBe("in 2 hours");
		});
	});

	describe("convertToTimezone", () => {
		it("converts UTC to specific timezone", () => {
			const utcDate = new Date("2023-06-15T12:00:00Z");

			const result = convertToTimezone(utcDate, "America/New_York");

			expect(result.toISOString()).toBe("2023-06-15T08:00:00.000Z");
			expect(result.getTimezoneOffset()).not.toBe(utcDate.getTimezoneOffset());
		});

		it("handles DST transitions", () => {
			// Winter time
			const winterDate = new Date("2023-01-15T12:00:00Z");
			const winterResult = convertToTimezone(winterDate, "America/New_York");

			// Summer time
			const summerDate = new Date("2023-07-15T12:00:00Z");
			const summerResult = convertToTimezone(summerDate, "America/New_York");

			// DST should create a 1-hour difference
			expect(summerResult.getHours() - winterResult.getHours()).toBe(1);
		});
	});

	describe("isSameDay", () => {
		it("detects same day", () => {
			const date1 = new Date("2023-06-15T08:00:00Z");
			const date2 = new Date("2023-06-15T20:00:00Z");

			const result = isSameDay(date1, date2);

			expect(result).toBe(true);
		});

		it("detects different days", () => {
			const date1 = new Date("2023-06-15T23:00:00Z");
			const date2 = new Date("2023-06-16T01:00:00Z");

			const result = isSameDay(date1, date2);

			expect(result).toBe(false);
		});

		it("considers timezone", () => {
			const date1 = new Date("2023-06-15T23:00:00Z");
			const date2 = new Date("2023-06-16T03:00:00Z");

			// Different days in UTC
			expect(isSameDay(date1, date2)).toBe(false);

			// Same day in Pacific timezone
			expect(isSameDay(date1, date2, "America/Los_Angeles")).toBe(true);
		});
	});

	describe("parseFrequency", () => {
		it("parses standard veterinary frequencies", () => {
			expect(parseFrequency("SID")).toEqual({ hours: 24, timesPerDay: 1 });
			expect(parseFrequency("BID")).toEqual({ hours: 12, timesPerDay: 2 });
			expect(parseFrequency("TID")).toEqual({ hours: 8, timesPerDay: 3 });
			expect(parseFrequency("QID")).toEqual({ hours: 6, timesPerDay: 4 });
		});

		it("parses hourly intervals", () => {
			expect(parseFrequency("Q4H")).toEqual({ hours: 4, timesPerDay: 6 });
			expect(parseFrequency("Q6H")).toEqual({ hours: 6, timesPerDay: 4 });
			expect(parseFrequency("Q8H")).toEqual({ hours: 8, timesPerDay: 3 });
			expect(parseFrequency("Q12H")).toEqual({ hours: 12, timesPerDay: 2 });
		});

		it("handles custom formats", () => {
			expect(parseFrequency("Every 4 hours")).toEqual({
				hours: 4,
				timesPerDay: 6,
			});
			expect(parseFrequency("Twice daily")).toEqual({
				hours: 12,
				timesPerDay: 2,
			});
			expect(parseFrequency("Once daily")).toEqual({
				hours: 24,
				timesPerDay: 1,
			});
		});

		it("handles invalid frequencies", () => {
			expect(() => parseFrequency("INVALID")).toThrow(
				"Unknown frequency format",
			);
		});
	});

	describe("generateDoseSchedule", () => {
		it("generates daily schedule for BID medication", () => {
			const startDate = new Date("2023-06-15T08:00:00Z");
			const frequency = "BID";
			const days = 3;

			const schedule = generateDoseSchedule(startDate, frequency, days);

			expect(schedule).toHaveLength(6); // 2 doses per day * 3 days
			expect(schedule[0]).toEqual(startDate);
			expect(schedule[1]).toEqual(new Date("2023-06-15T20:00:00Z"));
			expect(schedule[2]).toEqual(new Date("2023-06-16T08:00:00Z"));
		});

		it("generates schedule for Q8H medication", () => {
			const startDate = new Date("2023-06-15T08:00:00Z");
			const frequency = "Q8H";
			const days = 2;

			const schedule = generateDoseSchedule(startDate, frequency, days);

			expect(schedule).toHaveLength(6); // 3 doses per day * 2 days
			expect(schedule[0]).toEqual(new Date("2023-06-15T08:00:00Z"));
			expect(schedule[1]).toEqual(new Date("2023-06-15T16:00:00Z"));
			expect(schedule[2]).toEqual(new Date("2023-06-16T00:00:00Z"));
		});

		it("handles timezone-aware scheduling", () => {
			const startDate = new Date("2023-06-15T08:00:00Z");
			const frequency = "BID";
			const days = 1;
			const timezone = "America/New_York";

			const schedule = generateDoseSchedule(
				startDate,
				frequency,
				days,
				timezone,
			);

			expect(schedule).toHaveLength(2);
			// Times should be adjusted for timezone
			expect(schedule[0]).not.toEqual(startDate);
		});
	});

	describe("formatDuration", () => {
		it("formats duration in minutes", () => {
			expect(formatDuration(30 * 60 * 1000)).toBe("30 minutes");
			expect(formatDuration(1 * 60 * 1000)).toBe("1 minute");
		});

		it("formats duration in hours", () => {
			expect(formatDuration(2 * 60 * 60 * 1000)).toBe("2 hours");
			expect(formatDuration(1.5 * 60 * 60 * 1000)).toBe("1 hour 30 minutes");
		});

		it("formats duration in days", () => {
			expect(formatDuration(24 * 60 * 60 * 1000)).toBe("1 day");
			expect(formatDuration(3 * 24 * 60 * 60 * 1000)).toBe("3 days");
			expect(formatDuration(25 * 60 * 60 * 1000)).toBe("1 day 1 hour");
		});

		it("handles very short durations", () => {
			expect(formatDuration(30 * 1000)).toBe("30 seconds");
			expect(formatDuration(1000)).toBe("1 second");
		});
	});

	describe("Edge cases", () => {
		it("handles leap years correctly", () => {
			const feb28 = new Date("2024-02-28"); // Leap year
			const mar01 = new Date("2024-03-01");

			expect(getDaysBetween(feb28, mar01)).toBe(2); // Feb 29 exists
		});

		it("handles DST transitions in scheduling", () => {
			// Spring forward (2 AM becomes 3 AM)
			const springForward = new Date("2023-03-12T07:00:00Z"); // 2 AM EST
			const nextDose = calculateNextDose(springForward, "BID");

			// Should handle the missing hour gracefully
			expect(nextDose).toBeInstanceOf(Date);
			expect(nextDose > springForward).toBe(true);
		});

		it("handles international date line", () => {
			const date1 = new Date("2023-06-15T12:00:00Z");
			const date2 = convertToTimezone(date1, "Pacific/Auckland");

			expect(date2).toBeInstanceOf(Date);
			expect(Math.abs(date1.getTime() - date2.getTime())).toBeGreaterThan(0);
		});
	});
});
