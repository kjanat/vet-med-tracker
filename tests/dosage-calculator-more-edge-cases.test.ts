import { describe, expect, test } from "bun:test";
import {
  type Animal,
  DosageCalculator,
  type Medication,
} from "../lib/calculators/dosage";

const baseMedication: Medication = {
  category: "antibiotic",
  concentrationMgMl: 50,
  dosageMaxMgKg: 20,
  dosageMinMgKg: 10,
  dosageTypicalMgKg: 15,
  duration: "7 days",
  formulation: "tablet",
  frequencyPerDay: 2,
  genericName: "Amoxicillin",
  id: "med-amoxicillin",
  isControlledSubstance: false,
  maxDailyDoseMg: 800,
  prescriptionRequired: true,
  route: "oral",
  species: ["dog", "cat"],
  unitsPerTablet: 125,
};

const caninePatient: Animal = {
  species: "dog",
  weight: 20,
  weightUnit: "kg",
};

describe("DosageCalculator more edge cases", () => {
  test("handles non-dog species with breed", () => {
    const catWithBreed: Animal = {
      breed: "Siamese",
      species: "cat",
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
      breed: "Greyhound",
      species: "dog",
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
