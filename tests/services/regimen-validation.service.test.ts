// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { RegimenValidationService } from "@/lib/services/regimen-validation.service";

describe("RegimenValidationService", () => {
  describe("validateDosage", () => {
    it("should validate safe dosage range for dogs", () => {
      const result = RegimenValidationService.validateDosage(
        "amoxicillin",
        "150 mg",
        10, // 10kg dog
        "dog",
      );

      expect(result.isWithinSafeRange).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn about dosage above safe range", () => {
      const result = RegimenValidationService.validateDosage(
        "amoxicillin",
        "300 mg", // 30mg/kg - above safe range
        10, // 10kg dog
        "dog",
      );

      expect(result.isWithinSafeRange).toBe(false);
      expect(result.warnings).toContain(
        "Dose exceeds recommended maximum (30.00 mg/kg)",
      );
      expect(result.recommendedDosage).toBe("250.0 mg");
    });

    it("should warn about unclear dose format", () => {
      const result = RegimenValidationService.validateDosage(
        "amoxicillin",
        "one tablet",
        10,
        "dog",
      );

      expect(result.isWithinSafeRange).toBe(false);
      expect(result.warnings).toContain(
        "Dose format unclear - verify dosage calculation",
      );
    });
  });

  describe("checkDrugInteractions", () => {
    it("should detect major drug interactions", () => {
      const result = RegimenValidationService.checkDrugInteractions(
        "carprofen",
        ["prednisone"],
      );

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].severity).toBe("MAJOR");
      expect(result.interactions[0].description).toContain(
        "gastrointestinal ulceration",
      );
    });

    it("should return no interactions for safe combinations", () => {
      const result = RegimenValidationService.checkDrugInteractions(
        "amoxicillin",
        ["metronidazole"],
      );

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
    });
  });

  describe("checkContraindications", () => {
    it("should detect species contraindications", () => {
      const result = RegimenValidationService.checkContraindications(
        "carprofen",
        {
          age: 24,
          species: "cat",
          weight: 4.5,
        },
      );

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications.some((c) => c.type === "SPECIES")).toBe(
        true,
      );
    });

    it("should detect age contraindications", () => {
      const result = RegimenValidationService.checkContraindications(
        "carprofen",
        {
          age: 3, // 3 months - too young
          species: "dog",
          weight: 5.0,
        },
      );

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications.some((c) => c.type === "AGE")).toBe(true);
    });

    it("should detect allergy contraindications", () => {
      const result = RegimenValidationService.checkContraindications(
        "amoxicillin",
        {
          allergies: ["amoxicillin", "penicillin"],
          species: "dog",
          weight: 15.0,
        },
      );

      expect(result.hasContraindications).toBe(true);
      expect(result.contraindications.some((c) => c.type === "ALLERGY")).toBe(
        true,
      );
    });

    it("should pass safe medication for appropriate animal", () => {
      const result = RegimenValidationService.checkContraindications(
        "amoxicillin",
        {
          age: 24,
          species: "dog",
          weight: 20.0,
        },
      );

      expect(result.hasContraindications).toBe(false);
    });
  });

  describe("validateRegimen", () => {
    it("should perform comprehensive validation with no issues", () => {
      const result = RegimenValidationService.validateRegimen(
        {
          dose: "200 mg",
          highRisk: false,
          name: "amoxicillin",
          route: "ORAL",
        },
        {
          age: 24,
          allergies: [],
          conditions: [],
          species: "dog",
          weight: 15.0,
        },
        [],
      );

      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe("LOW");
      expect(result.errors).toHaveLength(0);
    });

    it("should identify critical issues and set risk level", () => {
      const result = RegimenValidationService.validateRegimen(
        {
          dose: "100 mg",
          highRisk: true,
          name: "carprofen",
          route: "ORAL",
        },
        {
          age: 24,
          species: "cat", // Contraindicated
          weight: 4.0,
        },
        ["prednisone"], // Major interaction
      );

      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe("CRITICAL");
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should elevate risk level for high-risk medications", () => {
      const result = RegimenValidationService.validateRegimen(
        {
          dose: "150 mg",
          highRisk: true,
          name: "amoxicillin",
          route: "ORAL",
        },
        {
          species: "dog",
          weight: 10.0,
        },
      );

      expect(result.riskLevel).toBe("MEDIUM");
      expect(result.warnings).toContain(
        "High-risk medication - requires careful monitoring",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle missing animal data gracefully", () => {
      const result = RegimenValidationService.validateRegimen(
        {
          dose: "unclear dose format",
          highRisk: false,
          name: "unknown-medication",
          route: "ORAL",
        },
        {
          species: "unknown",
          weight: 0,
        },
      );

      expect(result.isValid).toBe(false); // Due to unclear dose format
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle empty existing medications list", () => {
      const result = RegimenValidationService.checkDrugInteractions(
        "amoxicillin",
        [],
      );

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
    });
  });
});
