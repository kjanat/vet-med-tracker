import { describe, expect, test } from "bun:test";
import {
  getMedicationStatus,
  getStatusConfig,
  STATUS_CONFIGS,
} from "../lib/utils/status-config";

describe("status configuration", () => {
  test("exposes strongly typed design tokens", () => {
    expect.assertions(2);

    const expectedConfigs = ["high", "normal", "prn", "success", "urgent"];

    expect(getStatusConfig("urgent")).toEqual(STATUS_CONFIGS.urgent);
    expect(Object.keys(STATUS_CONFIGS)).toEqual(
      expect.arrayContaining(expectedConfigs),
    );
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
        isOverdue: true,
        isPRN: false,
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
