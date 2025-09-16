import { describe, expect, test } from "bun:test";
import { VetUnitConversions } from "../lib/calculators/unit-conversions";

describe("VetUnitConversions", () => {
  test("converts between weight units with veterinary precision", () => {
    const result = VetUnitConversions.Weight.convert(22.0462, "lbs", "kg");

    expect(result.unit).toBe("kg");
    expect(result.value).toBeCloseTo(10, 2);
    expect(result.originalUnit).toBe("lbs");
    expect(result.precision).toBe(2);
  });

  test("requires a concentration when turning milligrams into milliliters", () => {
    expect(() => VetUnitConversions.Dosage.fromMg(250, "ml")).toThrow(
      "Concentration (mg/mL) is required for mL conversion",
    );

    const converted = VetUnitConversions.Dosage.fromMg(250, "ml", 50);
    expect(converted.value).toBeCloseTo(5, 3);
    expect(converted.unit).toBe("ml");
  });

  test("flags implausible conversions so callers can guard against bad UX", () => {
    expect(VetUnitConversions.Utils.isSafeConversion(250, "kg", "g")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(1501, "kg", "g")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(-5, "kg", "g")).toBe(
      false,
    );
  });

  test("supports the extended weight, volume, and dosage helpers", () => {
    expect(VetUnitConversions.Weight.toKg(1000, "g")).toBeCloseTo(1, 2);
    expect(VetUnitConversions.Weight.fromKg(1, "lbs").value).toBeCloseTo(
      2.2,
      1,
    );

    const teaspoon = VetUnitConversions.Volume.convert(2, "tsp", "ml");
    expect(teaspoon.value).toBeCloseTo(9.86, 2);
    expect(teaspoon.originalUnit).toBe("tsp");

    const dosage = VetUnitConversions.Dosage.convert(2, "g", "mg");
    expect(dosage.value).toBe(2000);
    expect(dosage.unit).toBe("mg");

    const formatted = VetUnitConversions.Utils.formatWithUnit(1.2345, "ml");
    expect(formatted).toBe("1.23 ml");
    expect(VetUnitConversions.Utils.getCommonUnits("dosage")).toContain("mcg");
  });

  test("throws for medication-specific IU conversions", () => {
    expect(() => VetUnitConversions.Dosage.toMg(5, "IU")).toThrow(
      "IU conversion requires medication-specific conversion factor",
    );
    expect(VetUnitConversions.Utils.isSafeConversion(120000, "ml", "L")).toBe(
      false,
    );
  });
});

describe("VetUnitConversions.Weight", () => {
  test("toKg converts from all supported units", () => {
    expect(VetUnitConversions.Weight.toKg(1, "kg")).toBe(1);
    expect(VetUnitConversions.Weight.toKg(2.20462, "lbs")).toBeCloseTo(1, 5);
    expect(VetUnitConversions.Weight.toKg(1000, "g")).toBe(1);
    expect(VetUnitConversions.Weight.toKg(16, "oz")).toBeCloseTo(0.453592, 5);
  });

  test("fromKg converts to all supported units", () => {
    expect(VetUnitConversions.Weight.fromKg(1, "kg").value).toBe(1);
    expect(VetUnitConversions.Weight.fromKg(1, "lbs").value).toBeCloseTo(
      2.2,
      2,
    );
    expect(VetUnitConversions.Weight.fromKg(1, "g").value).toBe(1000);
    expect(VetUnitConversions.Weight.fromKg(1, "oz").value).toBeCloseTo(
      35.27,
      2,
    );
  });

  test("convert performs complex conversions", () => {
    const result = VetUnitConversions.Weight.convert(16, "oz", "g");
    expect(result.unit).toBe("g");
    expect(result.value).toBeCloseTo(453.6, 1);
    expect(result.originalUnit).toBe("oz");
  });
});

describe("VetUnitConversions.Volume", () => {
  test("toMl converts from all supported units", () => {
    expect(VetUnitConversions.Volume.toMl(1, "ml")).toBe(1);
    expect(VetUnitConversions.Volume.toMl(1, "L")).toBe(1000);
    expect(VetUnitConversions.Volume.toMl(1, "tsp")).toBeCloseTo(4.93, 2);
    expect(VetUnitConversions.Volume.toMl(1, "tbsp")).toBeCloseTo(14.79, 2);
    expect(VetUnitConversions.Volume.toMl(1, "fl_oz")).toBeCloseTo(29.57, 2);
    expect(VetUnitConversions.Volume.toMl(1, "cup")).toBeCloseTo(236.59, 2);
  });

  test("fromMl converts to all supported units", () => {
    expect(VetUnitConversions.Volume.fromMl(1, "ml").value).toBe(1);
    expect(VetUnitConversions.Volume.fromMl(1000, "L").value).toBe(1);
    expect(VetUnitConversions.Volume.fromMl(5, "tsp").value).toBeCloseTo(
      1.01,
      2,
    );
    expect(VetUnitConversions.Volume.fromMl(15, "tbsp").value).toBeCloseTo(
      1.01,
      2,
    );
    expect(VetUnitConversions.Volume.fromMl(30, "fl_oz").value).toBeCloseTo(
      1.01,
      2,
    );
    expect(VetUnitConversions.Volume.fromMl(240, "cup").value).toBeCloseTo(
      1.01,
      2,
    );
  });

  test("convert performs complex conversions", () => {
    const result = VetUnitConversions.Volume.convert(1, "L", "cup");
    expect(result.unit).toBe("cup");
    expect(result.value).toBeCloseTo(4.23, 2);
    expect(result.originalUnit).toBe("L");
  });
});

describe("VetUnitConversions.Dosage", () => {
  test("toMg converts from all supported units", () => {
    expect(VetUnitConversions.Dosage.toMg(1, "mg")).toBe(1);
    expect(VetUnitConversions.Dosage.toMg(1000, "mcg")).toBe(1);
    expect(VetUnitConversions.Dosage.toMg(0.001, "g")).toBe(1);
  });

  test("fromMg converts to all supported units", () => {
    expect(VetUnitConversions.Dosage.fromMg(1, "mg").value).toBe(1);
    expect(VetUnitConversions.Dosage.fromMg(1, "mcg").value).toBe(1000);
    expect(VetUnitConversions.Dosage.fromMg(1000, "g").value).toBe(1);
  });

  test("convert performs complex conversions", () => {
    const result = VetUnitConversions.Dosage.convert(1, "g", "mcg");
    expect(result.unit).toBe("mcg");
    expect(result.value).toBe(1000000);
    expect(result.originalUnit).toBe("g");
  });

  test("toMg throws for ml without concentration", () => {
    expect(() => VetUnitConversions.Dosage.toMg(1, "ml")).toThrow(
      "mL to mg conversion requires concentration information",
    );
  });

  test("fromMg throws for IU without conversion factor", () => {
    expect(() => VetUnitConversions.Dosage.fromMg(1, "IU")).toThrow(
      "IU conversion requires medication-specific conversion factor",
    );
  });
});

describe("VetUnitConversions.Utils", () => {
  test("roundToVetPrecision rounds correctly", () => {
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "kg")).toBe(
      1.23,
    );
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "lbs")).toBe(
      1.23,
    );
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "g")).toBe(1.2);
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "mg")).toBe(
      1.2,
    );
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "mcg")).toBe(1);
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "ml")).toBe(
      1.23,
    );
    expect(VetUnitConversions.Utils.roundToVetPrecision(1.2345, "L")).toBe(
      1.234,
    );
    expect(
      VetUnitConversions.Utils.roundToVetPrecision(1.2345, "unknown"),
    ).toBe(1.23);
  });

  test("formatWithUnit formats correctly", () => {
    expect(VetUnitConversions.Utils.formatWithUnit(1.2345, "kg")).toBe(
      "1.23 kg",
    );
  });

  test("isSafeConversion handles various scenarios", () => {
    expect(VetUnitConversions.Utils.isSafeConversion(1000, "kg", "g")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(1001, "kg", "g")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(1000000, "g", "kg")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(1000001, "g", "kg")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(2000, "lbs", "kg")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(2001, "lbs", "kg")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100, "L", "ml")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(101, "L", "ml")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100000, "ml", "L")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100001, "ml", "L")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100, "g", "mg")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(101, "g", "mg")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100000, "mg", "g")).toBe(
      true,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(100001, "mg", "g")).toBe(
      false,
    );
    expect(VetUnitConversions.Utils.isSafeConversion(0, "kg", "g")).toBe(false);
    expect(VetUnitConversions.Utils.isSafeConversion(Infinity, "kg", "g")).toBe(
      false,
    );
  });

  test("getCommonUnits returns correct units", () => {
    expect(VetUnitConversions.Utils.getCommonUnits("weight")).toEqual([
      "kg",
      "lbs",
      "g",
    ]);
    expect(VetUnitConversions.Utils.getCommonUnits("volume")).toEqual([
      "ml",
      "L",
      "tsp",
      "tbsp",
    ]);
    expect(VetUnitConversions.Utils.getCommonUnits("dosage")).toEqual([
      "mg",
      "mcg",
      "g",
      "ml",
    ]);
  });
});
