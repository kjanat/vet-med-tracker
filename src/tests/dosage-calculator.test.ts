import { describe, expect, it } from "bun:test";
import {
  type Animal,
  DosageCalculator,
  type Medication,
} from "@/lib/calculators/dosage.ts";

describe("DosageCalculator", () => {
  const mockMedication: Medication = {
    brandName: "TestBrand",
    category: "antibiotic",
    concentrationMgMl: 50,
    contraindications: null,
    dosageMaxMgKg: 12,
    dosageMinMgKg: 8,
    dosageTypicalMgKg: 10,
    duration: "7 days",
    formulation: "tablet",
    frequencyPerDay: 2,
    genericName: "Test Medication",
    id: "test-med-1",
    isControlledSubstance: false,
    maxDailyDoseMg: 1000,
    pregnancyCategory: null,
    prescriptionRequired: true,
    route: "oral",
    sideEffects: null,
    species: ["dog", "cat"],
    unitsPerTablet: 100,
    warnings: null,
  };

  const mockAnimal: Animal = {
    age: { unit: "years", value: 5 },
    breed: "Labrador",
    species: "dog",
    weight: 20,
    weightUnit: "kg",
  };

  describe("calculate", () => {
    it("calculates basic dosage for dog", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
        targetUnit: "mg",
      });

      expect(result.dose).toBeGreaterThan(0);
      expect(result.unit).toBe("mg");
      expect(result.minDose).toBeLessThan(result.dose);
      expect(result.maxDose).toBeGreaterThan(result.dose);
      expect(result.weightInKg).toBe(20);
      expect(result.safetyLevel).toBe("safe");
    });

    it("converts dosage to ml", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
        targetUnit: "ml",
      });

      expect(result.unit).toBe("mL");
      expect(result.dose).toBeGreaterThan(0);
    });

    it("converts dosage to tablets", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
        targetUnit: "tablets",
      });

      expect(result.unit).toBe("tablets");
      expect(result.dose).toBeGreaterThan(0);
    });

    it("applies species adjustment for cat", () => {
      const catAnimal: Animal = {
        ...mockAnimal,
        species: "cat",
      };

      const result = DosageCalculator.calculate({
        animal: catAnimal,
        medication: mockMedication,
      });

      expect(result.appliedAdjustments.length).toBeGreaterThan(0);
      expect(result.calculationMethod).not.toBe("basic_weight");
    });

    it("applies age adjustment for juvenile", () => {
      const youngAnimal: Animal = {
        ...mockAnimal,
        age: { unit: "months", value: 3 },
      };

      const result = DosageCalculator.calculate({
        animal: youngAnimal,
        medication: mockMedication,
      });

      expect(result.appliedAdjustments).toContain("Juvenile dose adjustment");
    });

    it("applies age adjustment for geriatric", () => {
      const oldAnimal: Animal = {
        ...mockAnimal,
        age: { unit: "years", value: 12 },
      };

      const result = DosageCalculator.calculate({
        animal: oldAnimal,
        medication: mockMedication,
      });

      expect(result.appliedAdjustments).toContain(
        "Geriatric dose reduction for reduced metabolism",
      );
    });

    it("applies breed adjustment for sighthounds", () => {
      const greyhound: Animal = {
        ...mockAnimal,
        breed: "Greyhound",
      };

      const result = DosageCalculator.calculate({
        animal: greyhound,
        medication: mockMedication,
      });

      expect(result.appliedAdjustments).toContain(
        "Sighthound metabolism adjustment",
      );
    });

    it("generates warnings for unapproved species", () => {
      const birdAnimal: Animal = {
        ...mockAnimal,
        species: "bird",
      };

      const result = DosageCalculator.calculate({
        animal: birdAnimal,
        medication: mockMedication,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.safetyLevel).toBe("caution");
    });

    it("generates warnings for controlled substances", () => {
      const controlledMed: Medication = {
        ...mockMedication,
        isControlledSubstance: true,
      };

      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: controlledMed,
      });

      expect(result.warnings).toContain(
        "Controlled substance - requires DEA compliance",
      );
    });

    it("includes alternative formats in result", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
      });

      expect(result.alternativeFormats).toBeDefined();
      expect(result.alternativeFormats!.length).toBeGreaterThan(0);
    });

    it("includes pharmacokinetic information", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
      });

      expect(result.dailyInfo).toBeDefined();
      expect(result.dailyInfo!.dosesPerDay).toBe(2);
      expect(result.dailyInfo!.timeBetweenDoses).toBe("12 hours");
    });

    it("calculates safety margin", () => {
      const result = DosageCalculator.calculate({
        animal: mockAnimal,
        medication: mockMedication,
      });

      expect(result.metadata.safetyMargin).toBeDefined();
      expect(result.metadata.safetyMargin.percentOfMax).toBeGreaterThan(0);
      expect(result.metadata.safetyMargin.percentOfMax).toBeLessThanOrEqual(
        100,
      );
    });
  });

  describe("input validation", () => {
    it("throws error for missing species", () => {
      const invalidAnimal: Animal = {
        ...mockAnimal,
        species: "",
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: invalidAnimal,
          medication: mockMedication,
        });
      }).toThrow("Animal species is required");
    });

    it("throws error for invalid weight", () => {
      const invalidAnimal: Animal = {
        ...mockAnimal,
        weight: 0,
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: invalidAnimal,
          medication: mockMedication,
        });
      }).toThrow("Animal weight must be a positive number");
    });

    it("throws error for invalid weight unit", () => {
      const invalidAnimal = {
        ...mockAnimal,
        weightUnit: "invalid" as any,
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: invalidAnimal,
          medication: mockMedication,
        });
      }).toThrow("Weight unit must be 'kg' or 'lbs'");
    });

    it("throws error for missing dosage information", () => {
      const invalidMed: Medication = {
        ...mockMedication,
        dosageTypicalMgKg: null,
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: mockAnimal,
          medication: invalidMed,
        });
      }).toThrow();
    });
  });

  describe("unit conversions", () => {
    it("handles lbs to kg conversion", () => {
      const lbsAnimal: Animal = {
        ...mockAnimal,
        weight: 44,
        weightUnit: "lbs",
      };

      const result = DosageCalculator.calculate({
        animal: lbsAnimal,
        medication: mockMedication,
      });

      expect(result.weightInKg).toBeCloseTo(20, 1);
    });

    it("throws error when ml conversion requested without concentration", () => {
      const medWithoutConcentration: Medication = {
        ...mockMedication,
        concentrationMgMl: null,
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: mockAnimal,
          medication: medWithoutConcentration,
          targetUnit: "ml",
        });
      }).toThrow("concentration");
    });

    it("throws error when tablet conversion requested without units per tablet", () => {
      const medWithoutUnits: Medication = {
        ...mockMedication,
        unitsPerTablet: null,
      };

      expect(() => {
        DosageCalculator.calculate({
          animal: mockAnimal,
          medication: medWithoutUnits,
          targetUnit: "tablets",
        });
      }).toThrow("Units per tablet");
    });
  });
});
