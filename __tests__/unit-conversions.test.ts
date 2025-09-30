import { describe, expect, it } from "bun:test";
import {
  type DosageUnit,
  VetUnitConversions,
  type VolumeUnit,
  type WeightUnit,
} from "../lib/calculators/unit-conversions";

describe("VetUnitConversions.Weight", () => {
  describe("toKg", () => {
    it("should handle kg units (no conversion)", () => {
      expect(VetUnitConversions.Weight.toKg(10, "kg")).toBe(10);
    });

    it("should convert lbs to kg", () => {
      const result = VetUnitConversions.Weight.toKg(22.0462, "lbs");
      expect(result).toBeCloseTo(10, 2);
    });

    it("should convert g to kg", () => {
      expect(VetUnitConversions.Weight.toKg(1000, "g")).toBe(1);
    });

    it("should convert oz to kg", () => {
      const result = VetUnitConversions.Weight.toKg(352.74, "oz");
      expect(result).toBeCloseTo(10, 2);
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Weight.toKg(10, "invalid" as WeightUnit),
      ).toThrow("Unsupported weight unit: invalid");
    });
  });

  describe("fromKg", () => {
    it("should convert kg to kg (no conversion)", () => {
      const result = VetUnitConversions.Weight.fromKg(10, "kg");
      expect(result.value).toBe(10);
      expect(result.unit).toBe("kg");
      expect(result.originalUnit).toBe("kg");
      expect(result.originalValue).toBe(10);
      expect(result.precision).toBe(2);
    });

    it("should convert kg to lbs", () => {
      const result = VetUnitConversions.Weight.fromKg(10, "lbs");
      expect(result.value).toBeCloseTo(22.05, 2);
      expect(result.unit).toBe("lbs");
      expect(result.precision).toBe(2);
    });

    it("should convert kg to g", () => {
      const result = VetUnitConversions.Weight.fromKg(1, "g");
      expect(result.value).toBe(1000);
      expect(result.unit).toBe("g");
      expect(result.precision).toBe(1);
    });

    it("should convert kg to oz", () => {
      const result = VetUnitConversions.Weight.fromKg(1, "oz");
      expect(result.value).toBeCloseTo(35.27, 2);
      expect(result.unit).toBe("oz");
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Weight.fromKg(10, "invalid" as WeightUnit),
      ).toThrow("Unsupported weight unit: invalid");
    });
  });

  describe("convert", () => {
    it("should convert lbs to kg", () => {
      const result = VetUnitConversions.Weight.convert(22.0462, "lbs", "kg");
      expect(result.value).toBeCloseTo(10, 2);
      expect(result.originalUnit).toBe("lbs");
      expect(result.originalValue).toBe(22.0462);
    });

    it("should convert g to oz", () => {
      const result = VetUnitConversions.Weight.convert(100, "g", "oz");
      expect(result.value).toBeCloseTo(3.53, 2);
      expect(result.originalUnit).toBe("g");
    });

    it("should handle same unit conversion", () => {
      const result = VetUnitConversions.Weight.convert(10, "kg", "kg");
      expect(result.value).toBe(10);
    });
  });
});

describe("VetUnitConversions.Volume", () => {
  describe("toMl", () => {
    it("should handle ml units (no conversion)", () => {
      expect(VetUnitConversions.Volume.toMl(100, "ml")).toBe(100);
    });

    it("should convert L to ml", () => {
      expect(VetUnitConversions.Volume.toMl(1, "L")).toBe(1000);
    });

    it("should convert tsp to ml", () => {
      const result = VetUnitConversions.Volume.toMl(1, "tsp");
      expect(result).toBeCloseTo(4.93, 2);
    });

    it("should convert tbsp to ml", () => {
      const result = VetUnitConversions.Volume.toMl(1, "tbsp");
      expect(result).toBeCloseTo(14.79, 2);
    });

    it("should convert fl_oz to ml", () => {
      const result = VetUnitConversions.Volume.toMl(1, "fl_oz");
      expect(result).toBeCloseTo(29.57, 2);
    });

    it("should convert cup to ml", () => {
      const result = VetUnitConversions.Volume.toMl(1, "cup");
      expect(result).toBeCloseTo(236.59, 2);
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Volume.toMl(10, "invalid" as VolumeUnit),
      ).toThrow("Unsupported volume unit: invalid");
    });
  });

  describe("fromMl", () => {
    it("should convert ml to ml (no conversion)", () => {
      const result = VetUnitConversions.Volume.fromMl(100, "ml");
      expect(result.value).toBe(100);
      expect(result.unit).toBe("ml");
      expect(result.precision).toBe(2);
    });

    it("should convert ml to L", () => {
      const result = VetUnitConversions.Volume.fromMl(1000, "L");
      expect(result.value).toBe(1);
      expect(result.unit).toBe("L");
      expect(result.precision).toBe(3);
    });

    it("should convert ml to tsp", () => {
      const result = VetUnitConversions.Volume.fromMl(4.92892, "tsp");
      expect(result.value).toBeCloseTo(1, 2);
    });

    it("should convert ml to tbsp", () => {
      const result = VetUnitConversions.Volume.fromMl(14.7868, "tbsp");
      expect(result.value).toBeCloseTo(1, 2);
    });

    it("should convert ml to fl_oz", () => {
      const result = VetUnitConversions.Volume.fromMl(29.5735, "fl_oz");
      expect(result.value).toBeCloseTo(1, 2);
    });

    it("should convert ml to cup", () => {
      const result = VetUnitConversions.Volume.fromMl(236.588, "cup");
      expect(result.value).toBeCloseTo(1, 2);
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Volume.fromMl(100, "invalid" as VolumeUnit),
      ).toThrow("Unsupported volume unit: invalid");
    });
  });

  describe("convert", () => {
    it("should convert L to tsp", () => {
      const result = VetUnitConversions.Volume.convert(1, "L", "tsp");
      expect(result.value).toBeCloseTo(202.88, 2);
      expect(result.originalUnit).toBe("L");
    });

    it("should convert cup to ml", () => {
      const result = VetUnitConversions.Volume.convert(1, "cup", "ml");
      expect(result.value).toBeCloseTo(236.59, 2);
    });

    it("should handle same unit conversion", () => {
      const result = VetUnitConversions.Volume.convert(100, "ml", "ml");
      expect(result.value).toBe(100);
    });
  });
});

describe("VetUnitConversions.Dosage", () => {
  describe("toMg", () => {
    it("should handle mg units (no conversion)", () => {
      expect(VetUnitConversions.Dosage.toMg(100, "mg")).toBe(100);
    });

    it("should convert mcg to mg", () => {
      expect(VetUnitConversions.Dosage.toMg(1000, "mcg")).toBe(1);
    });

    it("should convert g to mg", () => {
      expect(VetUnitConversions.Dosage.toMg(1, "g")).toBe(1000);
    });

    it("should throw on IU conversion", () => {
      expect(() => VetUnitConversions.Dosage.toMg(100, "IU")).toThrow(
        "IU conversion requires medication-specific conversion factor",
      );
    });

    it("should throw on ml conversion", () => {
      expect(() => VetUnitConversions.Dosage.toMg(10, "ml")).toThrow(
        "mL to mg conversion requires concentration information",
      );
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Dosage.toMg(10, "invalid" as DosageUnit),
      ).toThrow("Unsupported dosage unit: invalid");
    });
  });

  describe("fromMg", () => {
    it("should convert mg to mg (no conversion)", () => {
      const result = VetUnitConversions.Dosage.fromMg(100, "mg");
      expect(result.value).toBe(100);
      expect(result.unit).toBe("mg");
      expect(result.precision).toBe(3);
    });

    it("should convert mg to mcg", () => {
      const result = VetUnitConversions.Dosage.fromMg(1, "mcg");
      expect(result.value).toBe(1000);
      expect(result.precision).toBe(0);
    });

    it("should convert mg to g", () => {
      const result = VetUnitConversions.Dosage.fromMg(1000, "g");
      expect(result.value).toBe(1);
    });

    it("should convert mg to ml with concentration", () => {
      const result = VetUnitConversions.Dosage.fromMg(100, "ml", 50);
      expect(result.value).toBe(2);
      expect(result.unit).toBe("ml");
    });

    it("should throw on ml conversion without concentration", () => {
      expect(() => VetUnitConversions.Dosage.fromMg(100, "ml")).toThrow(
        "Concentration (mg/mL) is required for mL conversion",
      );
    });

    it("should throw on ml conversion with zero concentration", () => {
      expect(() => VetUnitConversions.Dosage.fromMg(100, "ml", 0)).toThrow(
        "Concentration (mg/mL) is required for mL conversion",
      );
    });

    it("should throw on ml conversion with negative concentration", () => {
      expect(() => VetUnitConversions.Dosage.fromMg(100, "ml", -10)).toThrow(
        "Concentration (mg/mL) is required for mL conversion",
      );
    });

    it("should throw on IU conversion", () => {
      expect(() => VetUnitConversions.Dosage.fromMg(100, "IU")).toThrow(
        "IU conversion requires medication-specific conversion factor",
      );
    });

    it("should throw on unsupported unit", () => {
      expect(() =>
        VetUnitConversions.Dosage.fromMg(100, "invalid" as DosageUnit),
      ).toThrow("Unsupported dosage unit: invalid");
    });
  });

  describe("convert", () => {
    it("should convert g to mcg", () => {
      const result = VetUnitConversions.Dosage.convert(1, "g", "mcg");
      expect(result.value).toBe(1000000);
      expect(result.originalUnit).toBe("g");
    });

    it("should convert mg to ml with concentration", () => {
      const result = VetUnitConversions.Dosage.convert(100, "mg", "ml", 50);
      expect(result.value).toBe(2);
      expect(result.originalUnit).toBe("mg");
      expect(result.originalValue).toBe(100);
    });

    it("should handle same unit conversion", () => {
      const result = VetUnitConversions.Dosage.convert(100, "mg", "mg");
      expect(result.value).toBe(100);
    });
  });
});

describe("VetUnitConversions.Utils", () => {
  describe("roundToVetPrecision", () => {
    it("should round kg to 2 decimals", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(10.12345, "kg")).toBe(
        10.12,
      );
    });

    it("should round lbs to 2 decimals", () => {
      expect(
        VetUnitConversions.Utils.roundToVetPrecision(22.34567, "lbs"),
      ).toBe(22.35);
    });

    it("should round g to 1 decimal", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(100.56, "g")).toBe(
        100.6,
      );
    });

    it("should round mg to 1 decimal", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(25.78, "mg")).toBe(
        25.8,
      );
    });

    it("should round mcg to 0 decimals", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(1000.9, "mcg")).toBe(
        1001,
      );
    });

    it("should round ml to 2 decimals", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(5.123, "ml")).toBe(
        5.12,
      );
    });

    it("should round L to 3 decimals", () => {
      expect(VetUnitConversions.Utils.roundToVetPrecision(1.23456, "L")).toBe(
        1.235,
      );
    });

    it("should default to 2 decimals for unknown units", () => {
      expect(
        VetUnitConversions.Utils.roundToVetPrecision(Math.PI, "unknown"),
      ).toBe(3.14);
    });
  });

  describe("formatWithUnit", () => {
    it("should format value with unit", () => {
      expect(VetUnitConversions.Utils.formatWithUnit(10.12345, "kg")).toBe(
        "10.12 kg",
      );
    });

    it("should handle different units", () => {
      expect(VetUnitConversions.Utils.formatWithUnit(1000.9, "mcg")).toBe(
        "1001 mcg",
      );
    });
  });

  describe("isSafeConversion", () => {
    it("should accept valid weight conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(10, "kg", "lbs")).toBe(
        true,
      );
    });

    it("should reject zero values", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(0, "kg", "lbs")).toBe(
        false,
      );
    });

    it("should reject negative values", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(-10, "kg", "lbs")).toBe(
        false,
      );
    });

    it("should reject infinite values", () => {
      expect(
        VetUnitConversions.Utils.isSafeConversion(Infinity, "kg", "lbs"),
      ).toBe(false);
    });

    it("should reject excessive kg to g conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(1001, "kg", "g")).toBe(
        false,
      );
    });

    it("should accept safe kg to g conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(999, "kg", "g")).toBe(
        true,
      );
    });

    it("should reject excessive g to kg conversions", () => {
      expect(
        VetUnitConversions.Utils.isSafeConversion(1000001, "g", "kg"),
      ).toBe(false);
    });

    it("should accept safe g to kg conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(999999, "g", "kg")).toBe(
        true,
      );
    });

    it("should reject excessive lbs conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(2001, "lbs", "kg")).toBe(
        false,
      );
    });

    it("should accept safe lbs conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(1999, "lbs", "kg")).toBe(
        true,
      );
    });

    it("should reject excessive L to ml conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(101, "L", "ml")).toBe(
        false,
      );
    });

    it("should accept safe L to ml conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(99, "L", "ml")).toBe(
        true,
      );
    });

    it("should reject excessive ml conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(100001, "ml", "L")).toBe(
        false,
      );
    });

    it("should accept safe ml conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(99999, "ml", "L")).toBe(
        true,
      );
    });

    it("should reject excessive g to mg conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(101, "g", "mg")).toBe(
        false,
      );
    });

    it("should accept safe g to mg conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(99, "g", "mg")).toBe(
        true,
      );
    });

    it("should reject excessive mg conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(100001, "mg", "g")).toBe(
        false,
      );
    });

    it("should accept safe mg conversions", () => {
      expect(VetUnitConversions.Utils.isSafeConversion(99999, "mg", "g")).toBe(
        true,
      );
    });
  });

  describe("getCommonUnits", () => {
    it("should return common weight units", () => {
      const units = VetUnitConversions.Utils.getCommonUnits("weight");
      expect(units).toEqual(["kg", "lbs", "g"]);
    });

    it("should return common volume units", () => {
      const units = VetUnitConversions.Utils.getCommonUnits("volume");
      expect(units).toEqual(["ml", "L", "tsp", "tbsp"]);
    });

    it("should return common dosage units", () => {
      const units = VetUnitConversions.Utils.getCommonUnits("dosage");
      expect(units).toEqual(["mg", "mcg", "g", "ml"]);
    });

    it("should return empty array for unknown type", () => {
      const units = VetUnitConversions.Utils.getCommonUnits(
        "unknown" as "weight",
      );
      expect(units).toEqual([]);
    });
  });
});
