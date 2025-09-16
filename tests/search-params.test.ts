import { describe, expect, it } from "bun:test";
import {
  createTypedQueryString,
  getTypedSearchParams,
  hasSearchParamValues,
  isValidHistoryStatus,
  isValidHistoryType,
  isValidHistoryView,
  isValidISODate,
  isValidSettingsTab,
  isValidUUID,
  parseTypedSearchParams,
  removeSearchParams,
  updateSearchParams,
} from "@/lib/utils/search-params";

describe("createTypedQueryString", () => {
  it("should create query string from object", () => {
    const result = createTypedQueryString({
      animalId: "123",
      type: "scheduled",
    });
    expect(result).toBe("animalId=123&type=scheduled");
  });

  it("should handle undefined values by removing them", () => {
    const result = createTypedQueryString({
      animalId: "123",
      type: undefined,
      status: "all",
    });
    expect(result).toBe("animalId=123&status=all");
  });

  it("should handle null values by removing them", () => {
    const result = createTypedQueryString({
      animalId: "123",
      type: null,
      status: "all",
    });
    expect(result).toBe("animalId=123&status=all");
  });

  it("should handle empty strings by removing them", () => {
    const result = createTypedQueryString({
      animalId: "123",
      type: "",
      status: "all",
    });
    expect(result).toBe("animalId=123&status=all");
  });

  it("should merge with existing URLSearchParams", () => {
    const existing = new URLSearchParams("existing=value");
    const result = createTypedQueryString({ animalId: "123" }, existing);
    expect(result).toBe("existing=value&animalId=123");
  });

  it("should override existing values", () => {
    const existing = new URLSearchParams("animalId=old");
    const result = createTypedQueryString({ animalId: "new" }, existing);
    expect(result).toBe("animalId=new");
  });

  it("should return empty string for empty object", () => {
    const result = createTypedQueryString({});
    expect(result).toBe("");
  });
});

describe("parseTypedSearchParams", () => {
  it("should parse history search params correctly", () => {
    const searchParams = new URLSearchParams(
      "animalId=123&type=scheduled&status=all",
    );
    const result = parseTypedSearchParams(searchParams, "history");

    expect(result).toEqual({
      animalId: "123",
      type: "scheduled",
      status: "all",
    });
  });

  it("should parse settings search params correctly", () => {
    const searchParams = new URLSearchParams("tab=preferences");
    const result = parseTypedSearchParams(searchParams, "settings");

    expect(result).toEqual({
      tab: "preferences",
    });
  });

  it("should validate date format for insights params", () => {
    const searchParams = new URLSearchParams("from=2024-01-01&to=2024-12-31");
    const result = parseTypedSearchParams(searchParams, "insights");

    expect(result).toEqual({
      from: "2024-01-01",
      to: "2024-12-31",
    });
  });

  it("should return empty object for invalid date format", () => {
    const searchParams = new URLSearchParams("from=invalid-date");
    const result = parseTypedSearchParams(searchParams, "insights");

    expect(result).toEqual({});
  });

  it("should handle missing parameters", () => {
    const searchParams = new URLSearchParams("");
    const result = parseTypedSearchParams(searchParams, "history");

    expect(result).toEqual({});
  });

  it("should handle invalid enum values", () => {
    const searchParams = new URLSearchParams("type=invalid");
    const result = parseTypedSearchParams(searchParams, "history");

    expect(result).toEqual({});
  });
});

describe("updateSearchParams", () => {
  it("should update existing search params", () => {
    const current = new URLSearchParams("animalId=123&type=all");
    const result = updateSearchParams(current, {
      type: "scheduled",
      status: "on-time",
    });

    expect(result).toBe("animalId=123&type=scheduled&status=on-time");
  });

  it("should remove undefined values", () => {
    const current = new URLSearchParams("animalId=123&type=all&status=on-time");
    const result = updateSearchParams(current, { type: undefined });

    expect(result).toBe("animalId=123&status=on-time");
  });
});

describe("getTypedSearchParams", () => {
  it("should merge parsed params with defaults", () => {
    const searchParams = new URLSearchParams("animalId=123");
    const result = getTypedSearchParams(searchParams, "history", {
      type: "all",
      view: "list",
    });

    expect(result).toEqual({
      animalId: "123",
      type: "all",
      view: "list",
    });
  });

  it("should prioritize parsed params over defaults", () => {
    const searchParams = new URLSearchParams("type=scheduled");
    const result = getTypedSearchParams(searchParams, "history", {
      type: "all",
      view: "list",
    });

    expect(result).toEqual({
      type: "scheduled",
      view: "list",
    });
  });
});

describe("hasSearchParamValues", () => {
  it("should return true when all checks pass", () => {
    const searchParams = new URLSearchParams("animalId=123&type=scheduled");
    const result = hasSearchParamValues(searchParams, {
      animalId: "123",
      type: "scheduled",
    });

    expect(result).toBe(true);
  });

  it("should return false when any check fails", () => {
    const searchParams = new URLSearchParams("animalId=123&type=all");
    const result = hasSearchParamValues(searchParams, {
      animalId: "123",
      type: "scheduled",
    });

    expect(result).toBe(false);
  });

  it("should return false when param is missing", () => {
    const searchParams = new URLSearchParams("animalId=123");
    const result = hasSearchParamValues(searchParams, {
      animalId: "123",
      type: "scheduled",
    });

    expect(result).toBe(false);
  });
});

describe("removeSearchParams", () => {
  it("should remove specified keys", () => {
    const current = new URLSearchParams(
      "animalId=123&type=scheduled&status=all",
    );
    const result = removeSearchParams(current, ["type", "status"]);

    expect(result).toBe("animalId=123");
  });

  it("should handle non-existent keys", () => {
    const current = new URLSearchParams("animalId=123&type=scheduled");
    const result = removeSearchParams(current, ["nonexistent"]);

    expect(result).toBe("animalId=123&type=scheduled");
  });

  it("should return empty string when all params are removed", () => {
    const current = new URLSearchParams("animalId=123");
    const result = removeSearchParams(current, ["animalId"]);

    expect(result).toBe("");
  });
});

describe("Type Guards", () => {
  describe("isValidHistoryType", () => {
    it("should return true for valid types", () => {
      expect(isValidHistoryType("all")).toBe(true);
      expect(isValidHistoryType("scheduled")).toBe(true);
      expect(isValidHistoryType("prn")).toBe(true);
    });

    it("should return false for invalid types", () => {
      expect(isValidHistoryType("invalid")).toBe(false);
      expect(isValidHistoryType(undefined)).toBe(false);
      expect(isValidHistoryType("")).toBe(false);
    });
  });

  describe("isValidHistoryStatus", () => {
    it("should return true for valid statuses", () => {
      expect(isValidHistoryStatus("on-time")).toBe(true);
      expect(isValidHistoryStatus("late")).toBe(true);
      expect(isValidHistoryStatus("missed")).toBe(true);
      expect(isValidHistoryStatus("all")).toBe(true);
    });

    it("should return false for invalid statuses", () => {
      expect(isValidHistoryStatus("invalid")).toBe(false);
      expect(isValidHistoryStatus(undefined)).toBe(false);
    });
  });

  describe("isValidHistoryView", () => {
    it("should return true for valid views", () => {
      expect(isValidHistoryView("list")).toBe(true);
      expect(isValidHistoryView("calendar")).toBe(true);
    });

    it("should return false for invalid views", () => {
      expect(isValidHistoryView("invalid")).toBe(false);
      expect(isValidHistoryView(undefined)).toBe(false);
    });
  });

  describe("isValidSettingsTab", () => {
    it("should return true for valid tabs", () => {
      expect(isValidSettingsTab("data")).toBe(true);
      expect(isValidSettingsTab("preferences")).toBe(true);
      expect(isValidSettingsTab("notifications")).toBe(true);
      expect(isValidSettingsTab("household")).toBe(true);
    });

    it("should return false for invalid tabs", () => {
      expect(isValidSettingsTab("invalid")).toBe(false);
      expect(isValidSettingsTab(undefined)).toBe(false);
    });
  });
});

describe("Validation Helpers", () => {
  describe("isValidISODate", () => {
    it("should return true for valid ISO dates", () => {
      expect(isValidISODate("2024-01-01")).toBe(true);
      expect(isValidISODate("2024-12-31")).toBe(true);
      expect(isValidISODate("2024-02-29")).toBe(true); // Valid leap year
    });

    it("should return false for invalid dates", () => {
      expect(isValidISODate("2024-13-01")).toBe(false); // Invalid month
      expect(isValidISODate("2024-01-32")).toBe(false); // Invalid day
      expect(isValidISODate("2024-01-1")).toBe(false); // Missing leading zero
      expect(isValidISODate("24-01-01")).toBe(false); // Wrong year format
      expect(isValidISODate("2024/01/01")).toBe(false); // Wrong separator
      expect(isValidISODate("")).toBe(false);
      expect(isValidISODate("invalid")).toBe(false);
      // Note: Some invalid dates like 2023-02-29 may be parsed leniently by Date.parse
      // The regex validation catches most format issues
    });
  });

  describe("isValidUUID", () => {
    it("should return true for valid UUIDs", () => {
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("should return false for invalid UUIDs", () => {
      expect(isValidUUID("invalid")).toBe(false);
      expect(isValidUUID("123e4567-e89b-12d3-a456")).toBe(false); // Too short
      expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000-extra")).toBe(
        false,
      ); // Too long
      expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400g")).toBe(false); // Invalid character
      expect(isValidUUID("")).toBe(false);
    });
  });
});
