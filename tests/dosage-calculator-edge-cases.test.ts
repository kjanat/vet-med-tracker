import { describe, expect, test } from "bun:test";
import {
  type Animal,
  DosageCalculator,
  type Medication,
} from "../lib/calculators/dosage";

const baseMedication: Medication = {
  id: "med-amoxicillin",
  genericName: "Amoxicillin",
  category: "antibiotic",
  formulation: "tablet",
  dosageMinMgKg: 10,
  dosageMaxMgKg: 20,
  dosageTypicalMgKg: 15,
  maxDailyDoseMg: 800,
  concentrationMgMl: 50,
  unitsPerTablet: 125,
  frequencyPerDay: 2,
  duration: "7 days",
  route: "oral",
  species: ["dog", "cat"],
  isControlledSubstance: false,
  prescriptionRequired: true,
};

const caninePatient: Animal = {
  species: "dog",
  weight: 20,
  weightUnit: "kg",
};

describe("DosageCalculator edge cases", () => {
  test("throws error for medication with no typical dosage", () => {
    const noTypicalDosageMed: Medication = {
      ...baseMedication,
      dosageTypicalMgKg: null,
    };
    expect(() =>
      DosageCalculator.calculate({
        animal: caninePatient,
        medication: noTypicalDosageMed,
      }),
    ).toThrow("Medication must have valid dosage information");
  });

  test("handles age in months", () => {
    const youngDog: Animal = { ...caninePatient, ageMonths: 3 };
    const result = DosageCalculator.calculate({
      animal: youngDog,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).toContain("Juvenile dose adjustment");
  });

  test("handles geriatric animal", () => {
    const oldCat: Animal = {
      species: "cat",
      weight: 5,
      weightUnit: "kg",
      ageYears: 14,
    };
    const result = DosageCalculator.calculate({
      animal: oldCat,
      medication: { ...baseMedication, species: ["cat"] },
    });
    expect(result.appliedAdjustments).toContain(
      "Geriatric dose reduction for reduced metabolism",
    );
  });

  test("includes specific medication warnings", () => {
    const warningMed: Medication = {
      ...baseMedication,
      warnings: "May cause drowsiness",
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: warningMed,
    });
    expect(result.warnings).toContain("May cause drowsiness");
  });

  test("handles very small animal", () => {
    const smallAnimal: Animal = { ...caninePatient, weight: 0.5 };
    const result = DosageCalculator.calculate({
      animal: smallAnimal,
      medication: baseMedication,
    });
    expect(result.warnings).toContain(
      "Very small animal - consider dose reduction",
    );
  });

  test("handles pregnancy category warning", () => {
    const pregnantMed: Medication = {
      ...baseMedication,
      pregnancyCategory: "B",
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: pregnantMed,
    });
    expect(result.warnings).toContain(
      "Pregnancy category B - use with caution",
    );
  });

  test("determines calculation method for single adjustment", () => {
    const catPatient: Animal = { species: "cat", weight: 4, weightUnit: "kg" };
    const result = DosageCalculator.calculate({
      animal: catPatient,
      medication: { ...baseMedication, species: ["cat"] },
    });
    expect(result.calculationMethod).toBe("species_adjusted");
  });

  test("handles no alternative formats when concentration and units per tablet are null", () => {
    const noFormatsMed: Medication = {
      ...baseMedication,
      concentrationMgMl: null,
      unitsPerTablet: null,
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noFormatsMed,
    });
    expect(result.alternativeFormats).toHaveLength(0);
  });

  test("handles medication with no max daily dose", () => {
    const noMaxDoseMed: Medication = {
      ...baseMedication,
      maxDailyDoseMg: null,
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noMaxDoseMed,
    });
    expect(result.warnings).not.toContain("Dose exceeds maximum daily limit");
  });

  test("handles medication with no species defined", () => {
    const noSpeciesMed: Medication = { ...baseMedication, species: [] };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noSpeciesMed,
    });
    expect(result.warnings).not.toContain("Not approved for");
  });

  test("handles unknown route", () => {
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: baseMedication,
      route: "unknown",
    });
    expect(result.appliedAdjustments).not.toContain("bioavailability");
  });

  test("handles medication with no min/max dosage", () => {
    const noMinMaxMed: Medication = {
      ...baseMedication,
      dosageMinMgKg: null,
      dosageMaxMgKg: null,
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noMinMaxMed,
    });
    expect(result.minDose).toBe(240);
    expect(result.maxDose).toBe(360);
  });

  test("handles non-special breed", () => {
    const normalBreed: Animal = { ...caninePatient, breed: "Labrador" };
    const result = DosageCalculator.calculate({
      animal: normalBreed,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).not.toContain("breed");
  });

  test("handles adult animal", () => {
    const adultAnimal: Animal = { ...caninePatient, ageYears: 2 };
    const result = DosageCalculator.calculate({
      animal: adultAnimal,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).not.toContain("age");
  });

  test("throws error for unsupported target unit", () => {
    expect(() =>
      DosageCalculator.calculate({
        animal: caninePatient,
        medication: baseMedication,
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
        targetUnit: "gallons" as any,
      }),
    ).toThrow("Unsupported target unit: gallons");
  });

  test("determines calculation method for breed adjustment", () => {
    const greyhound: Animal = {
      species: "dog",
      breed: "Greyhound",
      weight: 30,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: greyhound,
      medication: baseMedication,
    });
    expect(result.calculationMethod).toBe("breed_adjusted");
  });

  test("determines calculation method for age adjustment", () => {
    const neonatalPup: Animal = {
      species: "dog",
      weight: 3,
      weightUnit: "kg",
      age: { value: 6, unit: "weeks" },
    };
    const result = DosageCalculator.calculate({
      animal: neonatalPup,
      medication: baseMedication,
    });
    expect(result.calculationMethod).toBe("age_adjusted");
  });
});
