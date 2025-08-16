import { describe, expect, it } from "vitest";
import {
  createTypedQueryString,
  getTypedSearchParams,
  type HistorySearchParams,
  hasSearchParamValues,
  isValidHistoryStatus,
  isValidHistoryType,
  isValidHistoryView,
  isValidISODate,
  isValidSettingsTab,
  isValidUUID,
  parseTypedSearchParams,
  removeSearchParams,
  type SettingsSearchParams,
  updateSearchParams,
} from "./search-params";

describe("search-params", () => {
  describe("createTypedQueryString", () => {
    it("should create query string from parameters", () => {
      const result = createTypedQueryString({
        animalId: "123",
        type: "scheduled",
        from: undefined, // Should be removed
      });

      expect(result).toBe("animalId=123&type=scheduled");
    });

    it("should merge with existing parameters", () => {
      const existing = new URLSearchParams("existing=value&type=all");
      const result = createTypedQueryString(
        { animalId: "123", type: "scheduled" },
        existing,
      );

      expect(result).toBe("existing=value&type=scheduled&animalId=123");
    });

    it("should remove empty values", () => {
      const result = createTypedQueryString({
        animalId: "123",
        type: "",
        view: undefined,
      });

      expect(result).toBe("animalId=123");
    });
  });

  describe("parseTypedSearchParams", () => {
    it("should parse valid history parameters", () => {
      const searchParams = new URLSearchParams(
        "animalId=123&type=scheduled&from=2024-01-01",
      );
      const result = parseTypedSearchParams<HistorySearchParams>(
        searchParams,
        "history",
      );

      expect(result).toEqual({
        animalId: "123",
        type: "scheduled",
        from: "2024-01-01",
      });
    });

    it("should handle invalid parameters gracefully", () => {
      const searchParams = new URLSearchParams(
        "animalId=invalid-uuid&type=invalid&from=invalid-date",
      );
      const result = parseTypedSearchParams<HistorySearchParams>(
        searchParams,
        "history",
      );

      // Should return empty object on validation failure
      expect(result).toEqual({});
    });

    it("should parse valid settings parameters", () => {
      const searchParams = new URLSearchParams("tab=preferences");
      const result = parseTypedSearchParams<SettingsSearchParams>(
        searchParams,
        "settings",
      );

      expect(result).toEqual({
        tab: "preferences",
      });
    });
  });

  describe("updateSearchParams", () => {
    it("should update specific parameters while preserving others", () => {
      const current = new URLSearchParams("existing=value&type=all");
      const result = updateSearchParams(current, {
        animalId: "123",
        type: "scheduled",
      });

      expect(result).toBe("existing=value&type=scheduled&animalId=123");
    });

    it("should remove parameters with undefined values", () => {
      const current = new URLSearchParams("animalId=123&type=all&view=list");
      const result = updateSearchParams(current, {
        type: undefined,
        view: "calendar",
      });

      expect(result).toBe("animalId=123&view=calendar");
    });
  });

  describe("getTypedSearchParams", () => {
    it("should merge parsed parameters with defaults", () => {
      const searchParams = new URLSearchParams("animalId=123");
      const result = getTypedSearchParams<HistorySearchParams>(
        searchParams,
        "history",
        { type: "all", view: "list" },
      );

      expect(result).toEqual({
        animalId: "123",
        type: "all",
        view: "list",
      });
    });

    it("should override defaults with parsed values", () => {
      const searchParams = new URLSearchParams("type=scheduled&view=calendar");
      const result = getTypedSearchParams<HistorySearchParams>(
        searchParams,
        "history",
        { type: "all", view: "list" },
      );

      expect(result).toEqual({
        type: "scheduled",
        view: "calendar",
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
      const searchParams = new URLSearchParams("animalId=123&type=scheduled");
      const result = hasSearchParamValues(searchParams, {
        animalId: "123",
        type: "all", // Different value
      });

      expect(result).toBe(false);
    });
  });

  describe("removeSearchParams", () => {
    it("should remove specified parameters", () => {
      const current = new URLSearchParams(
        "animalId=123&type=scheduled&view=list",
      );
      const result = removeSearchParams(current, ["type", "view"]);

      expect(result).toBe("animalId=123");
    });

    it("should handle non-existent parameters", () => {
      const current = new URLSearchParams("animalId=123");
      const result = removeSearchParams(current, ["nonexistent", "type"]);

      expect(result).toBe("animalId=123");
    });
  });

  describe("type guards", () => {
    describe("isValidHistoryType", () => {
      it("should validate correct history types", () => {
        expect(isValidHistoryType("all")).toBe(true);
        expect(isValidHistoryType("scheduled")).toBe(true);
        expect(isValidHistoryType("prn")).toBe(true);
      });

      it("should reject invalid history types", () => {
        expect(isValidHistoryType("invalid")).toBe(false);
        expect(isValidHistoryType(undefined)).toBe(false);
        expect(isValidHistoryType("")).toBe(false);
      });
    });

    describe("isValidHistoryStatus", () => {
      it("should validate correct history statuses", () => {
        expect(isValidHistoryStatus("on-time")).toBe(true);
        expect(isValidHistoryStatus("late")).toBe(true);
        expect(isValidHistoryStatus("missed")).toBe(true);
        expect(isValidHistoryStatus("all")).toBe(true);
      });

      it("should reject invalid history statuses", () => {
        expect(isValidHistoryStatus("invalid")).toBe(false);
        expect(isValidHistoryStatus(undefined)).toBe(false);
      });
    });

    describe("isValidHistoryView", () => {
      it("should validate correct history views", () => {
        expect(isValidHistoryView("list")).toBe(true);
        expect(isValidHistoryView("calendar")).toBe(true);
      });

      it("should reject invalid history views", () => {
        expect(isValidHistoryView("invalid")).toBe(false);
        expect(isValidHistoryView(undefined)).toBe(false);
      });
    });

    describe("isValidSettingsTab", () => {
      it("should validate correct settings tabs", () => {
        expect(isValidSettingsTab("data")).toBe(true);
        expect(isValidSettingsTab("preferences")).toBe(true);
        expect(isValidSettingsTab("notifications")).toBe(true);
        expect(isValidSettingsTab("household")).toBe(true);
      });

      it("should reject invalid settings tabs", () => {
        expect(isValidSettingsTab("invalid")).toBe(false);
        expect(isValidSettingsTab(undefined)).toBe(false);
      });
    });
  });

  describe("format validators", () => {
    describe("isValidISODate", () => {
      it("should validate correct ISO dates", () => {
        expect(isValidISODate("2024-01-01")).toBe(true);
        expect(isValidISODate("2024-12-31")).toBe(true);
        expect(isValidISODate("2000-02-29")).toBe(true); // Leap year
      });

      it("should reject invalid ISO dates", () => {
        expect(isValidISODate("2024-1-1")).toBe(false); // Wrong format
        expect(isValidISODate("2024/01/01")).toBe(false); // Wrong separators
        expect(isValidISODate("invalid")).toBe(false);
        expect(isValidISODate("2024-13-01")).toBe(false); // Invalid month
        expect(isValidISODate("2024-01-32")).toBe(false); // Invalid day
      });
    });

    describe("isValidUUID", () => {
      it("should validate correct UUIDs", () => {
        expect(isValidUUID("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
        expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
      });

      it("should reject invalid UUIDs", () => {
        expect(isValidUUID("invalid")).toBe(false);
        expect(isValidUUID("123")).toBe(false);
        expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // Too short
        expect(isValidUUID("123e4567-e89b-12d3-a456-4266141740000")).toBe(
          false,
        ); // Too long
      });
    });
  });
});
