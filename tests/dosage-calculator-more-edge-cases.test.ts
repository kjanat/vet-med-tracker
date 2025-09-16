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

describe("DosageCalculator more edge cases", () => {
  test("handles non-dog species with breed", () => {
    const catWithBreed: Animal = {
      species: "cat",
      breed: "Siamese",
      weight: 5,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: catWithBreed,
      medication: { ...baseMedication, species: ["cat"] },
    });
    expect(result.appliedAdjustments).not.toContain("breed");
  });

  test("handles unknown route", () => {
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: baseMedication,
      route: "intranasal",
    });
    expect(result.appliedAdjustments).not.toContain("bioavailability");
  });

  test("handles dose exceeding max daily dose", () => {
    const highDoseMed: Medication = { ...baseMedication, maxDailyDoseMg: 10 };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: highDoseMed,
    });
    expect(result.warnings).toContain(
      "Dose exceeds maximum daily limit (10mg)",
    );
  });

  test("determines calculation method for breed adjustment only", () => {
    const greyhound: Animal = {
      species: "dog",
      breed: "Greyhound",
      weight: 30,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: greyhound,
      medication: { ...baseMedication, species: ["dog"] },
    });
    expect(result.calculationMethod).toBe("breed_adjusted");
  });
});
