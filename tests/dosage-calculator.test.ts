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

describe("DosageCalculator.calculate", () => {
  test("computes mg dosing for a standard canine regimen", () => {
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: baseMedication,
    });

    expect(result.dose).toBe(300);
    expect(result.minDose).toBe(200);
    expect(result.maxDose).toBe(400);
    expect(result.unit).toBe("mg");
    expect(result.calculationMethod).toBe("basic_weight");
    expect(result.appliedAdjustments).toHaveLength(0);
    expect(result.safetyLevel).toBe("safe");
    expect(result.alternativeFormats).toEqual([
      { description: "Liquid volume", dose: 6, unit: "mL" },
      { description: "Number of tablets", dose: 2.4, unit: "tablets" },
    ]);
  });

  test("adjusts cat dosing and converts to mL when requested", () => {
    const catPatient: Animal = { species: "cat", weight: 4, weightUnit: "kg" };

    const result = DosageCalculator.calculate({
      animal: catPatient,
      medication: baseMedication,
      targetUnit: "ml",
    });

    expect(result.dose).toBeCloseTo(1.08, 2);
    expect(result.unit).toBe("mL");
    expect(result.calculationMethod).toBe("species_adjusted");
    expect(result.appliedAdjustments).toEqual([
      "Feline hepatic metabolism adjustment",
    ]);
    expect(result.weightInKg).toBe(4);
    expect(result.finalDoseMgKg).toBeCloseTo(13.5, 1);
  });

  test("rejects non-positive weights to prevent bad calculations", () => {
    const underWeight: Animal = { species: "dog", weight: 0, weightUnit: "kg" };

    expect(() =>
      DosageCalculator.calculate({
        animal: underWeight,
        medication: baseMedication,
      }),
    ).toThrow("Animal weight must be a positive number");
  });

  test("reduces dosage for sighthounds and surfaces dosing warnings", () => {
    const regulationHeavyMedication: Medication = {
      ...baseMedication,
      isControlledSubstance: true,
      maxDailyDoseMg: 100,
      pregnancyCategory: "D",
      warnings: "Use with caution for MDR1 variants",
    };

    const greyhound: Animal = {
      breed: "Greyhound",
      species: "dog",
      weight: 30,
      weightUnit: "kg",
    };

    const result = DosageCalculator.calculate({
      animal: greyhound,
      medication: regulationHeavyMedication,
    });

    expect(result.calculationMethod).toBe("breed_adjusted");
    expect(result.appliedAdjustments).toEqual([
      "Sighthound metabolism adjustment",
    ]);
    expect(result.dose).toBeCloseTo(360, 1);
    expect(result.safetyLevel).toBe("danger");
    expect(result.warnings).toEqual([
      "Dose exceeds maximum daily limit (100mg)",
      "Controlled substance - requires DEA compliance",
      "Use with caution for MDR1 variants",
      "Pregnancy category D - use with caution",
    ]);
  });

  test("applies pediatric adjustment when age is supplied in different units", () => {
    const neonatalPup: Animal = {
      age: { unit: "weeks", value: 6 },
      species: "dog",
      weight: 3,
      weightUnit: "kg",
    };

    const result = DosageCalculator.calculate({
      animal: neonatalPup,
      medication: baseMedication,
    });

    expect(result.calculationMethod).toBe("age_adjusted");
    expect(result.finalDoseMgKg).toBeCloseTo(9, 1);
  });

  test("treats unsupported species conservatively and warns clinicians", () => {
    const reptile: Animal = {
      species: "iguana",
      weight: 0.8,
      weightUnit: "kg",
    };

    const medForMammals: Medication = {
      ...baseMedication,
      species: ["dog"],
    };

    const result = DosageCalculator.calculate({
      animal: reptile,
      medication: medForMammals,
    });

    expect(result.calculationMethod).toBe("species_adjusted");
    expect(result.appliedAdjustments).toEqual([
      "Species not specifically approved - reduced dosage",
    ]);
    expect(result.warnings).toContain(
      "Not approved for iguana - use with veterinary guidance",
    );
    expect(result.warnings).toContain(
      "Very small animal - consider dose reduction",
    );
  });

  test("lowers IV dosing and converts to tablets when requested", () => {
    const adultDog: Animal = {
      species: "dog",
      weight: 25,
      weightUnit: "kg",
    };

    const result = DosageCalculator.calculate({
      animal: adultDog,
      medication: baseMedication,
      route: "IV bolus",
      targetUnit: "tablets",
    });

    expect(result.calculationMethod).toBe("complex_multi_factor");
    expect(result.appliedAdjustments).toEqual([
      "100% bioavailability - reduced dose",
    ]);
    expect(result.unit).toBe("tablets");
    expect(result.dose).toBeCloseTo(2.4, 2);
  });

  test("requires tablet metadata when converting dosages to tablets", () => {
    const tabletLessMedication: Medication = {
      ...baseMedication,
      unitsPerTablet: null,
    };

    expect(() =>
      DosageCalculator.calculate({
        animal: caninePatient,
        medication: tabletLessMedication,
        targetUnit: "tablets",
      }),
    ).toThrow("Units per tablet is required for tablet dosing");
  });
});

describe("DosageCalculator species adjustments", () => {
  test("applies correct adjustment for rabbit", () => {
    const rabbit: Animal = { species: "rabbit", weight: 2, weightUnit: "kg" };
    const result = DosageCalculator.calculate({
      animal: rabbit,
      medication: { ...baseMedication, species: ["rabbit"] },
    });
    expect(result.appliedAdjustments).toContain(
      "Higher metabolic rate adjustment",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(16.5, 1);
  });

  test("applies correct adjustment for ferret", () => {
    const ferret: Animal = { species: "ferret", weight: 1, weightUnit: "kg" };
    const result = DosageCalculator.calculate({
      animal: ferret,
      medication: { ...baseMedication, species: ["ferret"] },
    });
    expect(result.appliedAdjustments).toContain("Rapid metabolism adjustment");
    expect(result.finalDoseMgKg).toBeCloseTo(18, 1);
  });

  test("applies correct adjustment for bird", () => {
    const bird: Animal = { species: "bird", weight: 0.5, weightUnit: "kg" };
    const result = DosageCalculator.calculate({
      animal: bird,
      medication: { ...baseMedication, species: ["bird"] },
    });
    expect(result.appliedAdjustments).toContain(
      "Avian metabolic rate adjustment",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(19.5, 1);
  });

  test("applies correct adjustment for reptile", () => {
    const reptile: Animal = { species: "reptile", weight: 1, weightUnit: "kg" };
    const result = DosageCalculator.calculate({
      animal: reptile,
      medication: { ...baseMedication, species: ["reptile"] },
    });
    expect(result.appliedAdjustments).toContain(
      "Lower metabolic rate adjustment",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(10.5, 1);
  });
});

describe("DosageCalculator breed and age adjustments", () => {
  test("applies giant breed adjustment", () => {
    const greatDane: Animal = {
      breed: "Great Dane",
      species: "dog",
      weight: 70,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: greatDane,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).toContain("Giant breed dose adjustment");
    expect(result.finalDoseMgKg).toBeCloseTo(13.5, 1);
  });

  test("applies toy breed adjustment", () => {
    const chihuahua: Animal = {
      breed: "Chihuahua",
      species: "dog",
      weight: 2,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: chihuahua,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).toContain(
      "Toy breed metabolism adjustment",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(16.5, 1);
  });

  test("applies geriatric adjustment", () => {
    const oldDog: Animal = {
      ageYears: 12,
      species: "dog",
      weight: 20,
      weightUnit: "kg",
    };
    const result = DosageCalculator.calculate({
      animal: oldDog,
      medication: baseMedication,
    });
    expect(result.appliedAdjustments).toContain(
      "Geriatric dose reduction for reduced metabolism",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(12.8, 1);
  });
});

describe("DosageCalculator route and error handling", () => {
  test("applies IM route adjustment", () => {
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: baseMedication,
      route: "IM",
    });
    expect(result.appliedAdjustments).toContain(
      "High bioavailability - slight reduction",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(13.5, 1);
  });

  test("applies topical route adjustment", () => {
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: baseMedication,
      route: "Topical",
    });
    expect(result.appliedAdjustments).toContain(
      "Lower absorption - increased dose",
    );
    expect(result.finalDoseMgKg).toBeCloseTo(18, 1);
  });

  test("throws error for missing species", () => {
    const noSpecies: Animal = { ...caninePatient, species: "" };
    expect(() =>
      DosageCalculator.calculate({
        animal: noSpecies,
        medication: baseMedication,
      }),
    ).toThrow("Animal species is required for dosage calculation");
  });

  test("throws error for invalid weight unit", () => {
    const invalidUnit: Animal = {
      ...caninePatient,
      weightUnit: "grams" as any,
    };
    expect(() =>
      DosageCalculator.calculate({
        animal: invalidUnit,
        medication: baseMedication,
      }),
    ).toThrow("Weight unit must be 'kg' or 'lbs'");
  });

  test("throws error for missing typical dosage", () => {
    const noDosageMed: Medication = {
      ...baseMedication,
      dosageTypicalMgKg: null,
    };
    expect(() =>
      DosageCalculator.calculate({
        animal: caninePatient,
        medication: noDosageMed,
      }),
    ).toThrow("Medication must have valid dosage information");
  });

  test("throws error for non-positive frequency", () => {
    const zeroFreqMed: Medication = { ...baseMedication, frequencyPerDay: 0 };
    expect(() =>
      DosageCalculator.calculate({
        animal: caninePatient,
        medication: zeroFreqMed,
      }),
    ).toThrow("Medication frequency must be positive");
  });

  test("handles medication with no specific warnings", () => {
    const noWarningsMed: Medication = { ...baseMedication, warnings: null };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noWarningsMed,
    });
    expect(result.warnings).not.toContain(null);
  });

  test("handles very large animal warning", () => {
    const largeAnimal: Animal = { ...caninePatient, weight: 60 };
    const result = DosageCalculator.calculate({
      animal: largeAnimal,
      medication: baseMedication,
    });
    expect(result.warnings).toContain(
      "Large animal - verify dose scaling appropriateness",
    );
  });

  test("handles no alternative formats", () => {
    const noConcentrationMed: Medication = {
      ...baseMedication,
      concentrationMgMl: null,
      unitsPerTablet: null,
    };
    const result = DosageCalculator.calculate({
      animal: caninePatient,
      medication: noConcentrationMed,
    });
    expect(result.alternativeFormats).toHaveLength(0);
  });
});
