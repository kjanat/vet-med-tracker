import { describe, expect, it } from "bun:test";
import type { AnimalFormData } from "@/lib/schemas/animal.ts";
import type { InventoryFormData } from "@/lib/schemas/inventory.ts";
import { AnimalFormValidator } from "@/lib/services/animalFormValidator.ts";
import {
  InventoryFormValidator,
  validateInventoryForm,
} from "@/lib/services/inventoryFormValidator.ts";

describe("AnimalFormValidator", () => {
  const validAnimalData: AnimalFormData = {
    allergies: [],
    breed: "Golden Retriever",
    conditions: [],
    dob: new Date("2020-01-15"),
    name: "Fluffy",
    neutered: false,
    sex: "Male",
    species: "dog",
    timezone: "America/New_York",
    weightKg: 65,
  };

  describe("canSubmit", () => {
    it("should return true for valid data with household context (new animal)", () => {
      const result = AnimalFormValidator.canSubmit(validAnimalData, {
        household: { id: "h1" },
        isEditing: false,
      });
      expect(result).toBe(true);
    });

    it("should return true for valid data when editing", () => {
      const result = AnimalFormValidator.canSubmit(validAnimalData, {
        isEditing: true,
      });
      expect(result).toBe(true);
    });

    it("should return false when name is missing", () => {
      const data = { ...validAnimalData, name: "" };
      const result = AnimalFormValidator.canSubmit(data, { isEditing: true });
      expect(result).toBe(false);
    });

    it("should return false when species is missing", () => {
      const data = { ...validAnimalData, species: "" };
      const result = AnimalFormValidator.canSubmit(data, { isEditing: true });
      expect(result).toBe(false);
    });

    it("should return false when timezone is missing", () => {
      const data = { ...validAnimalData, timezone: "" };
      const result = AnimalFormValidator.canSubmit(data, { isEditing: true });
      expect(result).toBe(false);
    });

    it("should return false when household is missing for new animal", () => {
      const result = AnimalFormValidator.canSubmit(validAnimalData, {
        isEditing: false,
      });
      expect(result).toBe(false);
    });

    it("should return false when context is missing for new animal", () => {
      const result = AnimalFormValidator.canSubmit(validAnimalData);
      expect(result).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("should return null for valid data with context", () => {
      const message = AnimalFormValidator.getErrorMessage(validAnimalData, {
        household: { id: "h1" },
        isEditing: false,
      });
      expect(message).toBeNull();
    });

    it("should return error for missing name", () => {
      const data = { ...validAnimalData, name: "" };
      const message = AnimalFormValidator.getErrorMessage(data, {
        isEditing: true,
      });
      expect(message).toBe("Name is required");
    });

    it("should return error for missing species", () => {
      const data = { ...validAnimalData, species: "" };
      const message = AnimalFormValidator.getErrorMessage(data, {
        isEditing: true,
      });
      expect(message).toBe("Species is required");
    });

    it("should return error for missing timezone", () => {
      const data = { ...validAnimalData, timezone: "" };
      const message = AnimalFormValidator.getErrorMessage(data, {
        isEditing: true,
      });
      expect(message).toBe("Timezone is required");
    });

    it("should return error for missing household on new animal", () => {
      const message = AnimalFormValidator.getErrorMessage(validAnimalData, {
        isEditing: false,
      });
      expect(message).toBe("Household is required for new animals");
    });

    it("should prioritize name error over other errors", () => {
      const data = { ...validAnimalData, name: "", species: "" };
      const message = AnimalFormValidator.getErrorMessage(data, {
        isEditing: true,
      });
      expect(message).toBe("Name is required");
    });
  });
});

describe("InventoryFormValidator", () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const validInventoryData: InventoryFormData = {
    expiresOn: futureDate,
    form: "tablet",
    isCustomMedication: false,
    name: "Amoxicillin",
    quantityUnits: 30,
    route: "oral",
    setInUse: false,
    storage: "ROOM",
    unitsRemaining: 25,
    unitType: "mg",
  };

  describe("validateInventoryForm", () => {
    it("should validate correct inventory data", () => {
      const result = validateInventoryForm(validInventoryData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should allow valid data with household ID", () => {
      const result = validateInventoryForm(validInventoryData, {
        householdId: "h1",
      });
      expect(result.isValid).toBe(true);
    });

    it("should reject when units remaining exceeds total quantity", () => {
      const data = { ...validInventoryData, unitsRemaining: 35 };
      const result = validateInventoryForm(data, { validateQuantity: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      const errorString = result.errors?.join(" ");
      expect(errorString).toContain(
        "Units remaining cannot exceed total quantity",
      );
    });

    it("should accept when units remaining equals total quantity", () => {
      const data = { ...validInventoryData, unitsRemaining: 30 };
      const result = validateInventoryForm(data, { validateQuantity: true });
      expect(result.isValid).toBe(true);
    });

    it("should reject past expiry dates by default", () => {
      const data = {
        ...validInventoryData,
        expiresOn: new Date("2020-01-01"),
      };
      const result = validateInventoryForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.includes("future"))).toBe(true);
    });

    it("should still reject past expiry dates even with allowPastExpiry flag (schema validation happens first)", () => {
      const data = {
        ...validInventoryData,
        expiresOn: new Date("2020-01-01"),
      };
      const result = validateInventoryForm(data, { allowPastExpiry: true });
      // Schema validation rejects past dates before custom logic runs
      expect(result.isValid).toBe(false);
    });

    it("should handle missing required fields", () => {
      const invalidData = {
        expiresOn: new Date(),
        form: "",
        isCustomMedication: false,
        name: "",
        quantityUnits: 0,
        route: "",
        setInUse: false,
        unitsRemaining: 0,
        unitType: "",
      } as InventoryFormData;

      const result = validateInventoryForm(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe("InventoryFormValidator class", () => {
    it("should have validate method that works like function", () => {
      const result = InventoryFormValidator.validate(validInventoryData);
      expect(result.isValid).toBe(true);
    });

    it("should have schema property", () => {
      expect(InventoryFormValidator.schema).toBeDefined();
      expect(typeof InventoryFormValidator.schema.parse).toBe("function");
    });

    it("should format error messages correctly", () => {
      const result = {
        errors: ["Error 1", "Error 2"],
        isValid: false,
      };
      const message = InventoryFormValidator.getDisplayMessage(result);
      expect(message).toBe("Error 1, Error 2");
    });

    it("should return empty string for valid results", () => {
      const result = { isValid: true };
      const message = InventoryFormValidator.getDisplayMessage(result);
      expect(message).toBe("");
    });

    it("should return empty string when no errors present", () => {
      const result = { isValid: false };
      const message = InventoryFormValidator.getDisplayMessage(result);
      expect(message).toBe("");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero quantity units", () => {
      const data = { ...validInventoryData, quantityUnits: 0 };
      const result = validateInventoryForm(data);
      expect(result.isValid).toBe(false);
    });

    it("should handle negative quantities", () => {
      const data = { ...validInventoryData, quantityUnits: -5 };
      const result = validateInventoryForm(data);
      expect(result.isValid).toBe(false);
    });

    it("should handle very long medication names", () => {
      const longName = "A".repeat(1000);
      const data = { ...validInventoryData, name: longName };
      const result = validateInventoryForm(data);
      // Should either pass or fail based on schema, but shouldn't crash
      expect(typeof result.isValid).toBe("boolean");
    });

    it("should handle multiple validation options simultaneously", () => {
      const pastDate = new Date("2020-01-01");
      const data = {
        ...validInventoryData,
        expiresOn: pastDate,
        unitsRemaining: 35,
      };
      const result = validateInventoryForm(data, {
        allowPastExpiry: false,
        validateQuantity: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
