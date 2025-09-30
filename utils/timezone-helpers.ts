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
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const target = new Date(
      utc.toLocaleString("en-US", { timeZone: timezone }),
    );
    return (target.getTime() - utc.getTime()) / 3600000; // Convert to hours
  } catch {
    return 0;
  }
}

export function formatTimezoneDisplay(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.abs(Math.floor(offset));
  const minutes = Math.abs((offset % 1) * 60);

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
    const targetTime = new Date(
      utcTime + getTimezoneOffset(targetTimezone) * 3600000,
    );
    return targetTime;
  } catch {
    return date;
  }
}
