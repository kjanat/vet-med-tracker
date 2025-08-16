/**
 * Timezone utilities for the timezone combobox component
 * Uses modern Intl APIs for standards-compliant timezone handling
 */

/** All IANA zones supported by the current runtime. */
export const IANA_TIMEZONES: readonly string[] =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone").sort()
    : []; // Runtime-feature test; no try/catch noise

/** Abbreviations → canonical zone. Keep in UPPER-SNAKE to avoid clashes. */
export const TZ_ALIASES = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  GMT: "Europe/London",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  JST: "Asia/Tokyo",
  KST: "Asia/Seoul",
  IST: "Asia/Kolkata",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
} as const;

export type IanaZone = (typeof IANA_TIMEZONES)[number];
export type TzAlias = keyof typeof TZ_ALIASES;

/** Browser's current timezone */
export const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone as
  | IanaZone
  | undefined;

/** Optional map of friendly labels. Expand as needed */
const FRIENDLY = {
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/Phoenix": "Arizona Time",
  "America/Anchorage": "Alaska Time",
  "America/Honolulu": "Hawaii Time",
  "Europe/London": "British Time",
  "Europe/Paris": "Central European Time",
  "Europe/Berlin": "Central European Time",
  "Europe/Amsterdam": "Central European Time",
  "Europe/Madrid": "Central European Time",
  "Europe/Rome": "Central European Time",
  "Asia/Tokyo": "Japan Time",
  "Asia/Shanghai": "China Time",
  "Asia/Hong_Kong": "Hong Kong Time",
  "Asia/Singapore": "Singapore Time",
  "Asia/Seoul": "Korea Time",
  "Asia/Kolkata": "India Time",
  "Australia/Sydney": "Australian Eastern Time",
  "Australia/Melbourne": "Australian Eastern Time",
  "Australia/Perth": "Australian Western Time",
  "Pacific/Auckland": "New Zealand Time",
} as const;

/** Returns offset in "+02:00" form. */
export function offsetOf(zone: IanaZone, epoch: Date = new Date()): string {
  // Always let Intl do the heavy lifting
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(epoch);

  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+02:00"
  return tzPart ? tzPart.replace("GMT", "UTC") : "UTC";
}

/** Get current time in zone */
export function timeIn(zone: IanaZone, when: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(when);
}

/** Generate display label for timezone */
export function labelFor(
  zone: IanaZone,
  opts?: {
    showOffset?: boolean;
    showTime?: boolean;
    referenceDate?: Date; // handy for DST pickers
  },
): string {
  const { showOffset = true, showTime = true, referenceDate } = opts ?? {};
  const offset = showOffset ? offsetOf(zone, referenceDate) : "";
  const time = showTime ? timeIn(zone, referenceDate) : "";

  const parts = [
    FRIENDLY[zone as keyof typeof FRIENDLY] ?? zone, // use alias if we have one
    offset && `(${offset}`,
    time && `, ${time})`,
  ]
    .filter(Boolean)
    .join(" ")
    .replace("( ", "(")
    .replace(", )", ")"); // tidy spacing

  return parts;
}

/** Search zones with ranking */
export function searchZones(query: string): IanaZone[] {
  const q = query.trim().toLowerCase();
  if (!q) return IANA_TIMEZONES as IanaZone[];

  // Expand alias first
  const alias = TZ_ALIASES[q.toUpperCase() as TzAlias];
  if (alias) return [alias, ...IANA_TIMEZONES.filter((z) => z !== alias)];

  // Simple ranking: startsWith > includes
  return IANA_TIMEZONES.filter((z) => z.toLowerCase().includes(q)).sort(
    (a, b) =>
      a.toLowerCase().startsWith(q) === b.toLowerCase().startsWith(q)
        ? a.localeCompare(b)
        : a.toLowerCase().startsWith(q)
          ? -1
          : 1,
  );
}

/** Get most commonly used timezones for quick access */
export function getCommonTimezones(): IanaZone[] {
  const common = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  // Add browser timezone if not already in list
  if (BROWSER_ZONE && !common.includes(BROWSER_ZONE)) {
    common.unshift(BROWSER_ZONE);
  }

  // Filter to only include zones that actually exist in the runtime
  return common.filter((zone) => IANA_TIMEZONES.includes(zone));
}

/** Check if a timezone string is valid */
export function isValidTimezone(zone: string): zone is IanaZone {
  return IANA_TIMEZONES.includes(zone);
}
