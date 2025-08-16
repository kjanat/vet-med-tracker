/**
 * Unit tests for the Unit Conversion System
 */

import { describe, expect, it } from "vitest";
import {
  DosageConverter,
  VetUnitUtils,
  VolumeConverter,
  WeightConverter,
} from "../unit-conversions";

describe("WeightConverter", () => {
  describe("toKg", () => {
    it("converts kg to kg correctly", () => {
      expect(WeightConverter.toKg(10, "kg")).toBe(10);
    });

    it("converts lbs to kg correctly", () => {
      const result = WeightConverter.toKg(22.0462, "lbs");
      expect(result).toBeCloseTo(10, 2);
    });

    it("converts g to kg correctly", () => {
      expect(WeightConverter.toKg(10000, "g")).toBe(10);
    });

    it("converts oz to kg correctly", () => {
      const result = WeightConverter.toKg(352.739, "oz");
      expect(result).toBeCloseTo(10, 2);
    });

    it("throws error for invalid unit", () => {
      expect(() => WeightConverter.toKg(10, "invalid" as any)).toThrow(
        "Unsupported weight unit: invalid",
      );
    });
  });

  describe("fromKg", () => {
    it("converts kg to lbs correctly", () => {
      const result = WeightConverter.fromKg(10, "lbs");
      expect(result.value).toBeCloseTo(22.05, 2);
      expect(result.unit).toBe("lbs");
      expect(result.originalValue).toBe(10);
      expect(result.originalUnit).toBe("kg");
    });

    it("converts kg to g correctly", () => {
      const result = WeightConverter.fromKg(10, "g");
      expect(result.value).toBe(10000);
      expect(result.unit).toBe("g");
    });

    it("converts kg to oz correctly", () => {
      const result = WeightConverter.fromKg(1, "oz");
      expect(result.value).toBeCloseTo(35.27, 2);
      expect(result.unit).toBe("oz");
    });
  });

  describe("convert", () => {
    it("converts between different weight units", () => {
      const result = WeightConverter.convert(5, "lbs", "kg");
      expect(result.value).toBeCloseTo(2.27, 2);
      expect(result.originalValue).toBe(5);
      expect(result.originalUnit).toBe("lbs");
    });
  });
});

describe("VolumeConverter", () => {
  describe("toMl", () => {
    it("converts ml to ml correctly", () => {
      expect(VolumeConverter.toMl(100, "ml")).toBe(100);
    });

    it("converts L to ml correctly", () => {
      expect(VolumeConverter.toMl(1, "L")).toBe(1000);
    });

    it("converts tsp to ml correctly", () => {
      const result = VolumeConverter.toMl(1, "tsp");
      expect(result).toBeCloseTo(4.929, 2);
    });

    it("converts tbsp to ml correctly", () => {
      const result = VolumeConverter.toMl(1, "tbsp");
      expect(result).toBeCloseTo(14.787, 2);
    });

    it("converts fl_oz to ml correctly", () => {
      const result = VolumeConverter.toMl(1, "fl_oz");
      expect(result).toBeCloseTo(29.574, 2);
    });

    it("converts cup to ml correctly", () => {
      const result = VolumeConverter.toMl(1, "cup");
      expect(result).toBeCloseTo(236.588, 2);
    });
  });

  describe("fromMl", () => {
    it("converts ml to L correctly", () => {
      const result = VolumeConverter.fromMl(1000, "L");
      expect(result.value).toBe(1);
      expect(result.unit).toBe("L");
    });

    it("converts ml to tsp correctly", () => {
      const result = VolumeConverter.fromMl(4.929, "tsp");
      expect(result.value).toBeCloseTo(1, 2);
      expect(result.unit).toBe("tsp");
    });
  });
});

describe("DosageConverter", () => {
  describe("toMg", () => {
    it("converts mg to mg correctly", () => {
      expect(DosageConverter.toMg(100, "mg")).toBe(100);
    });

    it("converts mcg to mg correctly", () => {
      expect(DosageConverter.toMg(1000, "mcg")).toBe(1);
    });

    it("converts g to mg correctly", () => {
      expect(DosageConverter.toMg(1, "g")).toBe(1000);
    });

    it("throws error for IU without conversion factor", () => {
      expect(() => DosageConverter.toMg(100, "IU")).toThrow(
        "IU conversion requires medication-specific conversion factor",
      );
    });

    it("throws error for ml without concentration", () => {
      expect(() => DosageConverter.toMg(100, "ml")).toThrow(
        "mL to mg conversion requires concentration information",
      );
    });
  });

  describe("fromMg", () => {
    it("converts mg to mcg correctly", () => {
      const result = DosageConverter.fromMg(1, "mcg");
      expect(result.value).toBe(1000);
      expect(result.unit).toBe("mcg");
    });

    it("converts mg to g correctly", () => {
      const result = DosageConverter.fromMg(1000, "g");
      expect(result.value).toBe(1);
      expect(result.unit).toBe("g");
    });

    it("converts mg to ml with concentration", () => {
      const result = DosageConverter.fromMg(100, "ml", 50); // 50mg/ml
      expect(result.value).toBe(2);
      expect(result.unit).toBe("ml");
    });

    it("throws error for ml conversion without concentration", () => {
      expect(() => DosageConverter.fromMg(100, "ml")).toThrow(
        "Concentration (mg/mL) is required for mL conversion",
      );
    });

    it("throws error for invalid concentration", () => {
      expect(() => DosageConverter.fromMg(100, "ml", 0)).toThrow(
        "Concentration (mg/mL) is required for mL conversion",
      );
    });
  });
});

describe("VetUnitUtils", () => {
  describe("roundToVetPrecision", () => {
    it("rounds kg to 2 decimal places", () => {
      expect(VetUnitUtils.roundToVetPrecision(10.12345, "kg")).toBe(10.12);
    });

    it("rounds lbs to 2 decimal places", () => {
      expect(VetUnitUtils.roundToVetPrecision(22.34567, "lbs")).toBe(22.35);
    });

    it("rounds g to 1 decimal place", () => {
      expect(VetUnitUtils.roundToVetPrecision(1000.67, "g")).toBe(1000.7);
    });

    it("rounds mg to 1 decimal place", () => {
      expect(VetUnitUtils.roundToVetPrecision(50.456, "mg")).toBe(50.5);
    });

    it("rounds mcg to whole number", () => {
      expect(VetUnitUtils.roundToVetPrecision(500.789, "mcg")).toBe(501);
    });

    it("rounds ml to 2 decimal places", () => {
      expect(VetUnitUtils.roundToVetPrecision(5.12345, "ml")).toBe(5.12);
    });

    it("rounds L to 3 decimal places", () => {
      expect(VetUnitUtils.roundToVetPrecision(1.123456, "L")).toBe(1.123);
    });

    it("defaults to 2 decimal places for unknown units", () => {
      expect(VetUnitUtils.roundToVetPrecision(10.12345, "unknown")).toBe(10.12);
    });
  });

  describe("formatWithUnit", () => {
    it("formats value with unit", () => {
      expect(VetUnitUtils.formatWithUnit(10.12345, "kg")).toBe("10.12 kg");
    });

    it("formats value with unit using appropriate precision", () => {
      expect(VetUnitUtils.formatWithUnit(1000.67, "g")).toBe("1000.7 g");
    });
  });

  describe("isSafeConversion", () => {
    it("returns false for zero or negative values", () => {
      expect(VetUnitUtils.isSafeConversion(0, "kg", "g")).toBe(false);
      expect(VetUnitUtils.isSafeConversion(-5, "kg", "g")).toBe(false);
    });

    it("returns false for infinite values", () => {
      expect(VetUnitUtils.isSafeConversion(Infinity, "kg", "g")).toBe(false);
      expect(VetUnitUtils.isSafeConversion(NaN, "kg", "g")).toBe(false);
    });

    it("returns false for extremely large animal weights", () => {
      expect(VetUnitUtils.isSafeConversion(1001, "kg", "g")).toBe(false);
      expect(VetUnitUtils.isSafeConversion(2001, "lbs", "kg")).toBe(false);
    });

    it("returns false for extremely large volumes", () => {
      expect(VetUnitUtils.isSafeConversion(101, "L", "ml")).toBe(false);
      expect(VetUnitUtils.isSafeConversion(100001, "ml", "L")).toBe(false);
    });

    it("returns false for extremely large doses", () => {
      expect(VetUnitUtils.isSafeConversion(101, "g", "mg")).toBe(false);
      expect(VetUnitUtils.isSafeConversion(100001, "mg", "g")).toBe(false);
    });

    it("returns true for safe conversions", () => {
      expect(VetUnitUtils.isSafeConversion(50, "kg", "g")).toBe(true);
      expect(VetUnitUtils.isSafeConversion(100, "lbs", "kg")).toBe(true);
      expect(VetUnitUtils.isSafeConversion(1, "L", "ml")).toBe(true);
      expect(VetUnitUtils.isSafeConversion(500, "mg", "g")).toBe(true);
    });
  });

  describe("getCommonUnits", () => {
    it("returns common weight units", () => {
      const units = VetUnitUtils.getCommonUnits("weight");
      expect(units).toEqual(["kg", "lbs", "g"]);
    });

    it("returns common volume units", () => {
      const units = VetUnitUtils.getCommonUnits("volume");
      expect(units).toEqual(["ml", "L", "tsp", "tbsp"]);
    });

    it("returns common dosage units", () => {
      const units = VetUnitUtils.getCommonUnits("dosage");
      expect(units).toEqual(["mg", "mcg", "g", "ml"]);
    });

    it("returns empty array for unknown unit type", () => {
      const units = VetUnitUtils.getCommonUnits("unknown" as any);
      expect(units).toEqual([]);
    });
  });
});
