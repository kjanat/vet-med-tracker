/**
 * Timezone utility functions
 */

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      second: "2-digit",
      timeZone: timezone,
      year: "numeric",
    });

    const parts = formatter.formatToParts(date);
    const dateStr = `${parts[0]?.value}-${parts[2]?.value}-${parts[4]?.value}T${parts[6]?.value}:${parts[8]?.value}:${parts[10]?.value}`;
    return new Date(dateStr);
  } catch {
    return date;
  }
}

export function formatTimeInTimezone(date: Date, timezone: string): string {
  try {
    return date.toLocaleString("en-US", {
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleTimeString();
  }
}

export function localDayISO(date?: Date | string, timezone?: string): string {
  const d = date ? new Date(date) : new Date();
  if (timezone) {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(d);
  }
  return d.toISOString().split("T")[0] || d.toISOString();
}
