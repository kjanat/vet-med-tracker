import { describe, expect, test } from "bun:test";
import {
  getMedicationStatus,
  getStatusConfig,
  STATUS_CONFIGS,
} from "../lib/utils/status-config";

describe("status configuration", () => {
  test("exposes strongly typed design tokens", () => {
    expect(getStatusConfig("urgent")).toEqual(STATUS_CONFIGS.urgent);
    expect(Object.keys(STATUS_CONFIGS)).toEqual([
      "urgent",
      "high",
      "normal",
      "success",
      "prn",
    ]);
  });

  test("maps regimen traits onto display intent", () => {
    expect(
      getMedicationStatus({
        isPRN: true,
        section: "prn",
      }),
    ).toBe("prn");

    expect(
      getMedicationStatus({
        isPRN: false,
        isOverdue: true,
        section: "due",
      }),
    ).toBe("urgent");

    expect(
      getMedicationStatus({
        isPRN: false,
        section: "due",
      }),
    ).toBe("high");

    expect(
      getMedicationStatus({
        isPRN: false,
        section: "later",
      }),
    ).toBe("normal");
  });
});
