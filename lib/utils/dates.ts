/**
 * Date and time utilities for veterinary medication tracking
 * Handles timezone conversions, dose scheduling, and formatting
 */

import { DateTime, type DateTimeMaybeValid } from "luxon";

export type FrequencyCode =
  | "SID"
  | "BID"
  | "TID"
  | "QID"
  | "Q4H"
  | "Q6H"
  | "Q8H"
  | "Q12H";

export interface ParsedFrequency {
  hours: number;
  timesPerDay: number;
}

/**
 * Format a date using the specified format and timezone
 */
export function formatDate(
  date: Date | null | undefined,
  format: string = "MMM d, yyyy",
  timezone?: string,
): string {
  if (!date) return "";

  const dt = DateTime.fromJSDate(date);
  const zonedDt = timezone ? dt.setZone(timezone) : dt;

  return zonedDt.toFormat(format);
}

/**
 * Format time with optional 24-hour format and timezone
 */
export function formatTime(
  date: Date,
  use24Hour: boolean = false,
  timezone?: string,
): string {
  const dt = DateTime.fromJSDate(date);
  const zonedDt = timezone ? dt.setZone(timezone) : dt;

  const format = use24Hour ? "HH:mm" : "h:mm a";
  return zonedDt.toFormat(format);
}

/**
 * Format full date and time
 */
export function formatDateTime(date: Date, timezone?: string): string {
  const dt = DateTime.fromJSDate(date);
  const zonedDt = timezone ? dt.setZone(timezone) : dt;

  return zonedDt.toFormat("MMM d, yyyy 'at' h:mm a");
}

/**
 * Calculate the next dose time based on frequency
 */
export function calculateNextDose(lastDose: Date, frequency: string): Date {
  const parsed = parseFrequency(frequency);
  const dt = DateTime.fromJSDate(lastDose);

  return dt.plus({ hours: parsed.hours }).toJSDate();
}

/**
 * Calculate days between two dates
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  const start = DateTime.fromJSDate(startDate).startOf("day");
  const end = DateTime.fromJSDate(endDate).startOf("day");

  return Math.floor(end.diff(start, "days").days);
}

/**
 * Check if a scheduled dose is overdue
 */
export function isOverdue(
  scheduledTime: Date,
  toleranceMinutes: number = 30,
): boolean {
  const scheduled = DateTime.fromJSDate(scheduledTime);
  const now = DateTime.now();
  const tolerance = toleranceMinutes * 60 * 1000; // Convert to milliseconds

  return now.toMillis() > scheduled.toMillis() + tolerance;
}

/**
 * Format time unit with singular/plural handling
 */
function formatTimeUnit(value: number, unit: string): string {
  return value === 1 ? `1 ${unit}` : `${value} ${unit}s`;
}

/**
 * Format time with direction (ago/in)
 */
function formatTimeWithDirection(
  value: number,
  unit: string,
  isPast: boolean,
): string {
  const timeUnit = formatTimeUnit(value, unit);
  return isPast ? `${timeUnit} ago` : `in ${timeUnit}`;
}

/**
 * Get the largest time unit from diff
 */
function getLargestTimeUnit(diff: {
  days: number;
  hours: number;
  minutes: number;
}): {
  value: number;
  unit: string;
  isPast: boolean;
} {
  if (Math.abs(diff.days) >= 1) {
    return {
      isPast: diff.days < 0,
      unit: "day",
      value: Math.abs(Math.floor(diff.days)),
    };
  }

  if (Math.abs(diff.hours) >= 1) {
    return {
      isPast: diff.hours < 0,
      unit: "hour",
      value: Math.abs(Math.floor(diff.hours)),
    };
  }

  return {
    isPast: diff.minutes < 0,
    unit: "minute",
    value: Math.abs(Math.floor(diff.minutes)),
  };
}

/**
 * Format relative time (e.g., "2 hours ago", "in 30 minutes")
 */
export function formatTimeAgo(date: Date): string {
  const dt = DateTime.fromJSDate(date);
  const now = DateTime.now();
  const diff = dt.diff(now, ["days", "hours", "minutes"]);

  const { value, unit, isPast } = getLargestTimeUnit(diff);
  return formatTimeWithDirection(value, unit, isPast);
}

/**
 * Convert a date to a specific timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  const dt = DateTime.fromJSDate(date, { zone: "utc" });
  const converted = dt.setZone(timezone);

  return converted.toJSDate();
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(
  date1: Date,
  date2: Date,
  timezone?: string,
): boolean {
  const dt1 = DateTime.fromJSDate(date1);
  const dt2 = DateTime.fromJSDate(date2);

  const zonedDt1 = timezone ? dt1.setZone(timezone) : dt1;
  const zonedDt2 = timezone ? dt2.setZone(timezone) : dt2;

  return (
    zonedDt1.year === zonedDt2.year &&
    zonedDt1.month === zonedDt2.month &&
    zonedDt1.day === zonedDt2.day
  );
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const dt = DateTime.fromJSDate(date);
  return dt.plus({ days }).toJSDate();
}

/**
 * Get start of day for a date
 */
export function startOfDay(date: Date, timezone?: string): Date {
  const dt = DateTime.fromJSDate(date);
  const zonedDt = timezone ? dt.setZone(timezone) : dt;

  return zonedDt.startOf("day").toJSDate();
}

/**
 * Get end of day for a date
 */
export function endOfDay(date: Date, timezone?: string): Date {
  const dt = DateTime.fromJSDate(date);
  const zonedDt = timezone ? dt.setZone(timezone) : dt;

  return zonedDt.endOf("day").toJSDate();
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const diff = calculateTimeDifference(milliseconds);
  const parts = buildDurationParts(diff);
  return parts.slice(0, 2).join(" ");
}

function calculateTimeDifference(milliseconds: number) {
  const duration = DateTime.fromMillis(0).plus({ milliseconds });
  return duration.diff(DateTime.fromMillis(0), [
    "days",
    "hours",
    "minutes",
    "seconds",
  ]);
}

interface DurationDiff {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function buildDurationParts(diff: DurationDiff): string[] {
  const parts: string[] = [];

  addDaysIfPresent(diff, parts);
  addHoursIfPresent(diff, parts);
  addMinutesIfPresent(diff, parts);
  addSecondsIfEmpty(diff, parts);

  return parts;
}

function addDaysIfPresent(diff: DurationDiff, parts: string[]) {
  if (diff.days >= 1) {
    const days = Math.floor(diff.days);
    parts.push(days === 1 ? "1 day" : `${days} days`);
  }
}

function addHoursIfPresent(diff: DurationDiff, parts: string[]) {
  if (diff.hours >= 1) {
    const hours = Math.floor(diff.hours % 24);
    if (hours > 0) {
      parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
    }
  }
}

function addMinutesIfPresent(diff: DurationDiff, parts: string[]) {
  if (diff.minutes >= 1 && parts.length < 2) {
    const minutes = Math.floor(diff.minutes % 60);
    if (minutes > 0) {
      parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
    }
  }
}

function addSecondsIfEmpty(diff: DurationDiff, parts: string[]) {
  if (parts.length === 0) {
    const seconds = Math.floor(diff.seconds);
    parts.push(seconds === 1 ? "1 second" : `${seconds} seconds`);
  }
}

/**
 * Parse veterinary frequency codes into hours and times per day
 */
export function parseFrequency(frequency: string): ParsedFrequency {
  const normalized = frequency.toUpperCase().trim();

  // Try standard frequencies first
  const standardResult = tryParseStandardFrequency(normalized);
  if (standardResult) return standardResult;

  // Try hourly intervals next
  const hourlyResult = tryParseHourlyInterval(normalized);
  if (hourlyResult) return hourlyResult;

  // Try custom formats
  const customResult = tryParseCustomFormats(normalized);
  if (customResult) return customResult;

  throw new Error(`Unknown frequency format: ${frequency}`);
}

/**
 * Try to parse standard veterinary frequency codes
 */
function tryParseStandardFrequency(normalized: string): ParsedFrequency | null {
  const standardFrequencies: Record<string, ParsedFrequency> = {
    BID: { hours: 12, timesPerDay: 2 }, // Twice daily
    QID: { hours: 6, timesPerDay: 4 }, // Four times daily
    SID: { hours: 24, timesPerDay: 1 }, // Once daily
    TID: { hours: 8, timesPerDay: 3 }, // Three times daily
  };

  return standardFrequencies[normalized] || null;
}

/**
 * Try to parse hourly interval patterns (Q4H, Q6H, etc.)
 */
function tryParseHourlyInterval(normalized: string): ParsedFrequency | null {
  const hourlyMatch = normalized.match(/Q(\d+)H/);
  if (!hourlyMatch) return null;

  const hoursStr = hourlyMatch[1];
  if (!hoursStr) return null;
  const hours = parseInt(hoursStr, 10);
  return {
    hours,
    timesPerDay: Math.floor(24 / hours),
  };
}

/**
 * Try to parse custom format patterns
 */
function tryParseCustomFormats(normalized: string): ParsedFrequency | null {
  const customPatterns = [
    { multiplier: 1, pattern: /EVERY (\d+) HOURS?/ },
    { hours: 12, pattern: /TWICE DAILY/, timesPerDay: 2 },
    { hours: 24, pattern: /ONCE DAILY/, timesPerDay: 1 },
    { hours: 8, pattern: /THREE TIMES DAILY/, timesPerDay: 3 },
    { hours: 6, pattern: /FOUR TIMES DAILY/, timesPerDay: 4 },
  ];

  for (const patternConfig of customPatterns) {
    const result = tryMatchCustomPattern(normalized, patternConfig);
    if (result) return result;
  }

  return null;
}

/**
 * Try to match a single custom pattern configuration
 */
function tryMatchCustomPattern(
  normalized: string,
  config: {
    pattern: RegExp;
    multiplier?: number;
    hours?: number;
    timesPerDay?: number;
  },
): ParsedFrequency | null {
  const match = normalized.match(config.pattern);
  if (!match) return null;

  if (config.multiplier) {
    const hoursStr = match[1];
    if (!hoursStr) return null;
    const parsedHours = parseInt(hoursStr, 10);
    return {
      hours: parsedHours,
      timesPerDay: Math.floor(24 / parsedHours),
    };
  }

  if (config.hours && config.timesPerDay) {
    return { hours: config.hours, timesPerDay: config.timesPerDay };
  }

  return null;
}

/**
 * Generate a dose schedule for a given frequency and duration
 */
export function generateDoseSchedule(
  startDate: Date,
  frequency: string,
  days: number,
  timezone?: string,
): Date[] {
  const parsed = parseFrequency(frequency);
  const schedule: Date[] = [];

  let currentDate = DateTime.fromJSDate(startDate);
  if (timezone) {
    currentDate = currentDate.setZone(timezone);
  }

  const endDate = currentDate.plus({ days });

  while (currentDate < endDate) {
    schedule.push(currentDate.toJSDate());
    currentDate = currentDate.plus({ hours: parsed.hours });
  }

  return schedule;
}

/**
 * Get the current date adjusted for animal's timezone
 */
export function getCurrentDateInTimezone(timezone: string): Date {
  return DateTime.now().setZone(timezone).toJSDate();
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): {
  years: number;
  months: number;
  totalMonths: number;
} {
  const now = DateTime.now();
  const birth = DateTime.fromJSDate(dateOfBirth);
  const diff = now.diff(birth, ["years", "months"]);

  return {
    months: Math.floor(diff.months % 12),
    totalMonths: Math.floor(now.diff(birth, "months").months),
    years: Math.floor(diff.years),
  };
}

/**
 * Check if a date is within a certain range from now
 */
export function isWithinRange(
  date: Date,
  value: number,
  unit: "minutes" | "hours" | "days",
): boolean {
  const dt = DateTime.fromJSDate(date);
  const now = DateTime.now();
  const diff = Math.abs(dt.diff(now, unit).as(unit));

  return diff <= value;
}

/**
 * Get the next occurrence of a specific time today or tomorrow
 */
export function getNextOccurrence(
  targetHour: number,
  targetMinute: number = 0,
  timezone?: string,
): Date {
  let dt: DateTimeMaybeValid = DateTime.now();
  if (timezone) {
    dt = dt.setZone(timezone);
  }

  let target = dt.set({
    hour: targetHour,
    millisecond: 0,
    minute: targetMinute,
    second: 0,
  });

  // If the target time has already passed today, move to tomorrow
  if (target <= dt) {
    target = target.plus({ days: 1 });
  }

  return target.toJSDate();
}
