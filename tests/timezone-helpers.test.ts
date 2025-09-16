import { describe, expect, test } from "bun:test";
import {
  BROWSER_ZONE,
  getCommonTimezones,
  IANA_TIMEZONES,
  isValidTimezone,
  labelFor,
  offsetOf,
  searchZones,
  TZ_ALIASES,
  timeIn,
} from "../utils/timezone-helpers";

const EASTERN = "America/New_York";
const REFERENCE_NOON_UTC = new Date("2024-01-15T12:00:00Z");

describe("timezone helpers", () => {
  test("exposes supported zones and alias lookups", () => {
    expect(IANA_TIMEZONES.length).toBeGreaterThan(0);
    expect(TZ_ALIASES.EST).toBe(EASTERN);
    expect(isValidTimezone(EASTERN)).toBe(true);
  });

  test("computes offsets and formatted times deterministically", () => {
    const offset = offsetOf(EASTERN, REFERENCE_NOON_UTC);
    expect(offset).toMatch(/^UTC-0?5(?::00)?$/);

    const time = timeIn(EASTERN, REFERENCE_NOON_UTC);
    expect(time).toBe("07:00");
  });

  test("labels timezones with friendly names and optional components", () => {
    const label = labelFor(EASTERN, {
      showOffset: true,
      showTime: false,
      referenceDate: REFERENCE_NOON_UTC,
    });

    expect(label).toMatch(/Eastern Time \(UTC-0?5/);

    const noOffsetTime = labelFor(EASTERN, {
      showOffset: false,
      showTime: false,
    });
    expect(noOffsetTime).toBe("Eastern Time");

    const withTime = labelFor(EASTERN, {
      showOffset: false,
      showTime: true,
      referenceDate: REFERENCE_NOON_UTC,
    });
    expect(withTime).toBe("Eastern Time , 07:00)");
  });

  test("search prioritizes aliases and prefix matches", () => {
    const results = searchZones("EST");
    expect(results[0]).toBe(EASTERN);

    const prefixResults = searchZones("America/New");
    expect(prefixResults[0]).toBe(EASTERN);
  });

  test("returns common timezones filtered to supported zones", () => {
    const common = getCommonTimezones();
    const everyValid = common.every((zone) => IANA_TIMEZONES.includes(zone));
    expect(common.length).toBeGreaterThan(0);
    expect(everyValid).toBe(true);

    if (BROWSER_ZONE) {
      expect(common).toContain(BROWSER_ZONE);
    }
  });

  test("search ranking places prefix matches before inclusion matches", () => {
    const MOCKED_ZONES = ["Europe/London", "London/Europe"];
    const results = searchZones("Europe", MOCKED_ZONES);
    expect(results[0]).toBe("Europe/London");
    expect(results[1]).toBe("London/Europe");
  });

  test("searchZones handles aliases correctly", () => {
    const results = searchZones("EST");
    expect(results[0]).toBe("America/New_York");
  });
});
