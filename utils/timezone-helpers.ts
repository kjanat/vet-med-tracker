// Timezone helper functions

export function getTimezoneList(): string[] {
  return [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Australia/Sydney",
    "UTC",
  ];
}

export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    // Get UTC time
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const utcDate = new Date(utcStr);
    // Get target timezone time
    const targetStr = now.toLocaleString("en-US", { timeZone: timezone });
    const targetDate = new Date(targetStr);
    // Calculate offset in hours
    return (targetDate.getTime() - utcDate.getTime()) / 3600000;
  } catch {
    return 0;
  }
}

export function formatTimezoneDisplay(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.abs(Math.floor(offset));
  const minutes = Math.round(Math.abs((offset % 1) * 60));

  return `${timezone} (UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")})`;
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function convertToUserTimezone(date: Date, timezone?: string): Date {
  const targetTimezone = timezone || getUserTimezone();
  try {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + getTimezoneOffset(targetTimezone) * 3600000);
  } catch {
    return date;
  }
}
