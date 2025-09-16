import { describe, expect, it, spyOn } from "bun:test";
import type { AnimalFormData } from "@/lib/schemas/animal";
import { AnimalFormValidator } from "@/lib/services/animalFormValidator";

describe("AnimalFormValidator", () => {
  const createValidAnimalData = (
    overrides: Partial<AnimalFormData> = {},
  ): AnimalFormData => ({
    name: "Buddy",
    species: "dog",
    timezone: "America/New_York",
    neutered: true,
    allergies: [],
    conditions: [],
    weightKg: 25,
    dob: new Date("2020-01-01"),
    breed: "Golden Retriever",
    vetName: "Dr. Smith",
    vetEmail: "dr.smith@example.com",
    vetPhone: "(555) 123-4567",
    clinicName: "City Animal Hospital",
    ...overrides,
  });

  const mockHousehold = {
    id: "household-123",
    name: "Smith Family",
    timezone: "America/New_York",
  };

  describe("validateRequiredFields", () => {
    it("should pass validation for complete required fields", () => {
      const data = createValidAnimalData();
      const errors = AnimalFormValidator.validateRequiredFields(data);
      expect(errors).toHaveLength(0);
    });

    it("should fail validation for missing name", () => {
      const data = createValidAnimalData({ name: "" });
      const errors = AnimalFormValidator.validateRequiredFields(data);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: "name",
        code: "REQUIRED_FIELD",
        message: "Animal name is required",
        severity: "error",
      });
    });

    it("should fail validation for missing species", () => {
      const data = createValidAnimalData({ species: "" });
      const errors = AnimalFormValidator.validateRequiredFields(data);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: "species",
        code: "REQUIRED_FIELD",
        message: "Species is required",
        severity: "error",
      });
    });

    it("should fail validation for missing timezone", () => {
      const data = createValidAnimalData({ timezone: "" });
      const errors = AnimalFormValidator.validateRequiredFields(data);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: "timezone",
        code: "REQUIRED_FIELD",
        message: "Timezone is required",
        severity: "error",
      });
    });

    it("should fail validation for whitespace-only name", () => {
      const data = createValidAnimalData({ name: "   " });
      const errors = AnimalFormValidator.validateRequiredFields(data);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.field).toBe("name");
    });
  });

  describe("validateBusinessRules", () => {
    describe("email validation", () => {
      it("should pass validation for valid email", () => {
        const data = createValidAnimalData({ vetEmail: "valid@example.com" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const emailErrors = errors.filter((e) => e.field === "vetEmail");
        expect(emailErrors).toHaveLength(0);
      });

      it("should fail validation for invalid email", () => {
        const data = createValidAnimalData({ vetEmail: "invalid-email" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const emailErrors = errors.filter((e) => e.field === "vetEmail");
        expect(emailErrors).toHaveLength(1);
        expect(emailErrors[0]).toEqual({
          field: "vetEmail",
          code: "INVALID_EMAIL",
          message: "Please enter a valid email address",
          severity: "error",
        });
      });

      it("should skip email validation when empty", () => {
        const data = createValidAnimalData({ vetEmail: "" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const emailErrors = errors.filter((e) => e.field === "vetEmail");
        expect(emailErrors).toHaveLength(0);
      });
    });

    describe("weight validation", () => {
      it("should pass validation for valid weight", () => {
        const data = createValidAnimalData({ weightKg: 25 });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const weightErrors = errors.filter((e) => e.field === "weightKg");
        expect(weightErrors).toHaveLength(0);
      });

      it("should fail validation for zero weight", () => {
        const data = createValidAnimalData({ weightKg: 0 });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const weightErrors = errors.filter((e) => e.field === "weightKg");
        expect(weightErrors).toHaveLength(1);
        expect(weightErrors[0]).toEqual({
          field: "weightKg",
          code: "INVALID_WEIGHT",
          message: "Weight must be greater than 0",
          severity: "error",
        });
      });

      it("should fail validation for negative weight", () => {
        const data = createValidAnimalData({ weightKg: -5 });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const weightErrors = errors.filter((e) => e.field === "weightKg");
        expect(weightErrors).toHaveLength(1);
        expect(weightErrors[0]?.code).toBe("INVALID_WEIGHT");
      });

      it("should warn for unrealistically high weight", () => {
        const data = createValidAnimalData({ weightKg: 1500 });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const weightErrors = errors.filter((e) => e.field === "weightKg");
        expect(weightErrors).toHaveLength(1);
        expect(weightErrors[0]).toEqual({
          field: "weightKg",
          code: "UNREALISTIC_WEIGHT",
          message: "Weight seems unusually high. Please verify.",
          severity: "warning",
        });
      });
    });

    describe("date of birth validation", () => {
      it("should pass validation for valid past date", () => {
        const data = createValidAnimalData({ dob: new Date("2020-01-01") });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const dobErrors = errors.filter((e) => e.field === "dob");
        expect(dobErrors).toHaveLength(0);
      });

      it("should fail validation for future date", () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const data = createValidAnimalData({ dob: futureDate });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const dobErrors = errors.filter((e) => e.field === "dob");
        expect(dobErrors).toHaveLength(1);
        expect(dobErrors[0]).toEqual({
          field: "dob",
          code: "FUTURE_DATE",
          message: "Date of birth cannot be in the future",
          severity: "error",
        });
      });

      it("should warn for unrealistically old animals", () => {
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 60);
        const data = createValidAnimalData({ dob: oldDate });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const dobErrors = errors.filter((e) => e.field === "dob");
        expect(dobErrors).toHaveLength(1);
        expect(dobErrors[0]).toEqual({
          field: "dob",
          code: "UNREALISTIC_AGE",
          message: "This age seems unusually high. Please verify.",
          severity: "warning",
        });
      });
    });

    describe("phone number validation", () => {
      it("should pass validation for valid phone number", () => {
        const data = createValidAnimalData({ vetPhone: "(555) 123-4567" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const phoneErrors = errors.filter((e) => e.field === "vetPhone");
        expect(phoneErrors).toHaveLength(0);
      });

      it("should warn for invalid phone number", () => {
        const data = createValidAnimalData({ vetPhone: "123" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const phoneErrors = errors.filter((e) => e.field === "vetPhone");
        expect(phoneErrors).toHaveLength(1);
        expect(phoneErrors[0]).toEqual({
          field: "vetPhone",
          code: "INVALID_PHONE",
          message: "Please enter a valid phone number",
          severity: "warning",
        });
      });

      it("should skip phone validation when empty", () => {
        const data = createValidAnimalData({ vetPhone: "" });
        const errors = AnimalFormValidator.validateBusinessRules(data, {});

        const phoneErrors = errors.filter((e) => e.field === "vetPhone");
        expect(phoneErrors).toHaveLength(0);
      });
    });

    describe("name uniqueness validation", () => {
      it("should pass validation when name is unique", () => {
        const context = { existingAnimals: ["max", "bella"], isEditing: false };
        const data = createValidAnimalData({ name: "buddy" });
        const errors = AnimalFormValidator.validateBusinessRules(data, context);

        const nameErrors = errors.filter((e) => e.field === "name");
        expect(nameErrors).toHaveLength(0);
      });

      it("should warn when name already exists", () => {
        const context = { existingAnimals: ["buddy", "max"], isEditing: false };
        const data = createValidAnimalData({ name: "Buddy" });
        const errors = AnimalFormValidator.validateBusinessRules(data, context);

        const nameErrors = errors.filter((e) => e.field === "name");
        expect(nameErrors).toHaveLength(1);
        expect(nameErrors[0]).toEqual({
          field: "name",
          code: "DUPLICATE_NAME",
          message: "An animal with this name already exists in this household",
          severity: "warning",
        });
      });

      it("should skip uniqueness check when editing", () => {
        const context = { existingAnimals: ["buddy"], isEditing: true };
        const data = createValidAnimalData({ name: "Buddy" });
        const errors = AnimalFormValidator.validateBusinessRules(data, context);

        const nameErrors = errors.filter((e) => e.field === "name");
        expect(nameErrors).toHaveLength(0);
      });
    });
  });

  describe("validateContext", () => {
    it("should pass validation with valid household", () => {
      const context = { household: mockHousehold };
      const data = createValidAnimalData();
      const errors = AnimalFormValidator.validateContext(data, context);

      expect(errors).toHaveLength(0);
    });

    it("should fail validation without household", () => {
      const context = { household: null };
      const data = createValidAnimalData();
      const errors = AnimalFormValidator.validateContext(data, context);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: "general",
        code: "NO_HOUSEHOLD",
        message: "No household selected. Please select a household first.",
        severity: "error",
      });
    });
  });

  describe("generateWarnings", () => {
    it("should generate warnings for missing optional fields", () => {
      const minimalData = createValidAnimalData({
        breed: undefined,
        weightKg: undefined,
        dob: undefined,
        vetName: undefined,
        clinicName: undefined,
      });

      const warnings = AnimalFormValidator.generateWarnings(minimalData);

      expect(warnings).toHaveLength(4);
      expect(warnings).toEqual([
        {
          field: "breed",
          code: "MISSING_RECOMMENDED",
          message:
            "Consider adding breed information for better record keeping",
          severity: "info",
        },
        {
          field: "weightKg",
          code: "MISSING_RECOMMENDED",
          message:
            "Weight information helps with medication dosage calculations",
          severity: "info",
        },
        {
          field: "dob",
          code: "MISSING_RECOMMENDED",
          message: "Date of birth helps track age-related health needs",
          severity: "info",
        },
        {
          field: "vetName",
          code: "MISSING_VET_INFO",
          message: "Consider adding veterinary contact information",
          severity: "info",
        },
      ]);
    });

    it("should not generate warnings for complete data", () => {
      const warnings = AnimalFormValidator.generateWarnings(
        createValidAnimalData(),
      );
      expect(warnings).toHaveLength(0);
    });
  });

  describe("validate (complete validation)", () => {
    it("should pass validation for complete valid data", () => {
      const result = AnimalFormValidator.validate(createValidAnimalData(), {
        household: mockHousehold,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should fail validation for missing required fields", () => {
      const invalidData = createValidAnimalData({ name: "" });
      const result = AnimalFormValidator.validate(invalidData, {
        household: mockHousehold,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("name");
    });

    it("should include warnings for missing optional fields", () => {
      const minimalData = createValidAnimalData({
        breed: undefined,
        weightKg: undefined,
        dob: undefined,
      });

      const result = AnimalFormValidator.validate(minimalData, {
        household: mockHousehold,
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("canSubmit", () => {
    it("should return true for valid data", () => {
      const result = AnimalFormValidator.canSubmit(createValidAnimalData(), {
        household: mockHousehold,
      });
      expect(result).toBe(true);
    });

    it("should return false for invalid data", () => {
      const invalidData = createValidAnimalData({ name: "" });
      const result = AnimalFormValidator.canSubmit(invalidData, {
        household: mockHousehold,
      });
      expect(result).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("should return null for valid data", () => {
      const result = AnimalFormValidator.getErrorMessage(
        createValidAnimalData(),
        { household: mockHousehold },
      );
      expect(result).toBe(null);
    });

    it("should return first error message for invalid data", () => {
      const invalidData = createValidAnimalData({ name: "" });
      const result = AnimalFormValidator.getErrorMessage(invalidData, {
        household: mockHousehold,
      });
      expect(result).toBe("Animal name is required");
    });
  });

  describe("getValidationSummary", () => {
    it("should return summary for valid data", () => {
      const result = AnimalFormValidator.getValidationSummary(
        createValidAnimalData(),
        { household: mockHousehold },
      );

      expect(result).toEqual({
        canSubmit: true,
        errorCount: 0,
        warningCount: 0,
        primaryMessage: null,
      });
    });

    it("should return summary for data with errors and warnings", () => {
      const dataWithIssues = createValidAnimalData({
        name: "", // Error
        weightKg: undefined, // Warning
        dob: undefined, // Warning
      });

      const result = AnimalFormValidator.getValidationSummary(dataWithIssues, {
        household: mockHousehold,
      });

      expect(result.canSubmit).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(2); // weightKg and dob warnings
      expect(result.primaryMessage).toBe("Animal name is required");
    });
  });

  describe("spyOn demonstration", () => {
    it("should demonstrate spyOn usage with console methods", () => {
      const consoleWarnSpy = spyOn(console, "warn");

      // Example: trigger a console.warn call
      console.warn("Test warning message");

      // Verify the spy captured the call
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Test warning message");
      expect(consoleWarnSpy.mock.calls[0]).toEqual(["Test warning message"]);

      // Clean up the spy
      consoleWarnSpy.mockRestore();
    });

    it("should spy on object methods", () => {
      const testObject = {
        method: (arg: string) => `processed: ${arg}`,
      };

      const methodSpy = spyOn(testObject, "method");

      // Call the method
      const result = testObject.method("test input");

      // Verify the spy captured the call
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith("test input");
      expect(methodSpy.mock.calls).toEqual([["test input"]]);

      // The original method still executes
      expect(result).toBe("processed: test input");

      // Clean up
      methodSpy.mockRestore();
    });
  });
});
