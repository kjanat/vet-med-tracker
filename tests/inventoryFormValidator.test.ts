import { describe, expect, it } from "bun:test";
import { InventoryFormValidator } from "@/lib/services/inventoryFormValidator";

describe.skip("InventoryFormValidator", () => {
  const validFormData = {
    medicationId: "med-123",
    name: "Test Medication",
    isCustomMedication: false,
    brand: "Test Brand",
    route: "oral",
    form: "tablet",
    strength: "10mg",
    concentration: "",
    quantityUnits: 10,
    unitsRemaining: 8,
    lot: "LOT123",
    expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    storage: "ROOM" as const,
    assignedAnimalId: "",
    barcode: "",
    setInUse: false,
  };

  const validContext = {
    householdId: "household-123",
    validateQuantity: true,
    allowPastExpiry: false,
  };

  describe("comprehensive validation", () => {
    it("should validate complete valid form data", () => {
      const result = InventoryFormValidator.validate(
        validFormData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return validation errors for invalid data", () => {
      const invalidData = {
        ...validFormData,
        medicationId: "",
        name: "",
        quantityUnits: -1,
        unitsRemaining: 15, // More than total
        expiresOn: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
      expect(
        result.errors.some((e) => e.code === "REMAINING_EXCEEDS_TOTAL"),
      ).toBe(true);
      expect(result.errors.some((e) => e.code === "PAST_EXPIRY_DATE")).toBe(
        true,
      );
    });
  });

  describe("household validation", () => {
    it("should require valid household", () => {
      const result = InventoryFormValidator.validate(validFormData, {
        householdId: "",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        true,
      );
    });

    it("should pass with valid household", () => {
      const result = InventoryFormValidator.validate(validFormData, {
        householdId: "valid-household",
      });

      // Should not have household error
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        false,
      );
    });
  });

  describe("medication validation", () => {
    it("should require medication selection", () => {
      const invalidData = {
        ...validFormData,
        medicationId: "",
        name: "",
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
    });

    it("should require custom medication name when isCustomMedication is true", () => {
      const invalidData = {
        ...validFormData,
        isCustomMedication: true,
        name: "",
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_CUSTOM_NAME")).toBe(
        true,
      );
    });

    it("should validate medication ID when provided", () => {
      const validData = {
        ...validFormData,
        medicationId: "valid-med-id",
        name: "Test Med",
      };

      const result = InventoryFormValidator.validate(validData, validContext);

      // Should not have medication errors
      expect(result.errors.some((e) => e.field === "medicationId")).toBe(false);
    });
  });

  describe("quantity validation", () => {
    it("should validate positive quantity", () => {
      const invalidData = {
        ...validFormData,
        quantityUnits: 0,
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
    });

    it("should validate non-negative remaining units", () => {
      const invalidData = {
        ...validFormData,
        unitsRemaining: -1,
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "NEGATIVE_REMAINING")).toBe(
        true,
      );
    });

    it("should prevent remaining units from exceeding total", () => {
      const invalidData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 15,
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "REMAINING_EXCEEDS_TOTAL"),
      ).toBe(true);
    });

    it("should warn about low stock", () => {
      const lowStockData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 1, // 10% remaining
      };

      const result = InventoryFormValidator.validate(
        lowStockData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LOW_STOCK")).toBe(true);
    });

    it("should warn about empty stock", () => {
      const emptyStockData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 0,
      };

      const result = InventoryFormValidator.validate(
        emptyStockData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EMPTY_STOCK")).toBe(true);
    });

    it("should skip quantity validation when disabled", () => {
      const invalidData = {
        ...validFormData,
        quantityUnits: -1,
        unitsRemaining: -1,
      };

      const result = InventoryFormValidator.validate(invalidData, {
        ...validContext,
        validateQuantity: false,
      });

      // Should not have quantity-related errors
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        false,
      );
      expect(result.errors.some((e) => e.code === "NEGATIVE_REMAINING")).toBe(
        false,
      );
    });
  });

  describe("expiry date validation", () => {
    it("should require expiry date", () => {
      const invalidData = {
        ...validFormData,
        expiresOn: undefined as unknown as Date, // Testing invalid data
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_EXPIRY")).toBe(true);
    });

    it("should reject past expiry dates by default", () => {
      const invalidData = {
        ...validFormData,
        expiresOn: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = InventoryFormValidator.validate(invalidData, validContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "PAST_EXPIRY_DATE")).toBe(
        true,
      );
    });

    it("should allow past expiry dates when explicitly allowed", () => {
      const expiredData = {
        ...validFormData,
        expiresOn: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const result = InventoryFormValidator.validate(expiredData, {
        ...validContext,
        allowPastExpiry: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRED_MEDICATION")).toBe(
        true,
      );
    });

    it("should warn about soon-to-expire medications", () => {
      const soonExpiringData = {
        ...validFormData,
        expiresOn: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      };

      const result = InventoryFormValidator.validate(
        soonExpiringData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRING_SOON")).toBe(
        true,
      );
    });

    it("should warn about very long expiry dates", () => {
      const longExpiryData = {
        ...validFormData,
        expiresOn: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000), // 6 years from now
      };

      const result = InventoryFormValidator.validate(
        longExpiryData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LONG_EXPIRY")).toBe(true);
    });
  });

  describe("storage validation", () => {
    it("should warn about controlled substances without lot number", () => {
      const controlledData = {
        ...validFormData,
        storage: "CONTROLLED" as const,
        lot: "",
      };

      const result = InventoryFormValidator.validate(
        controlledData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "CONTROLLED_LOT_RECOMMENDED"),
      ).toBe(true);
    });

    it("should warn about liquid medications in freezer", () => {
      const freezerLiquidData = {
        ...validFormData,
        storage: "FREEZER" as const,
        form: "liquid suspension",
      };

      const result = InventoryFormValidator.validate(
        freezerLiquidData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "LIQUID_FREEZER_WARNING"),
      ).toBe(true);
    });
  });

  describe("field-specific validation", () => {
    it("should validate individual medication field", () => {
      const result = InventoryFormValidator.validateField(
        "medicationId",
        "",
        validFormData,
        validContext,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
    });

    it("should validate individual quantity field", () => {
      const result = InventoryFormValidator.validateField(
        "quantityUnits",
        -1,
        validFormData,
        validContext,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
    });

    it("should validate individual expiry field", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = InventoryFormValidator.validateField(
        "expiresOn",
        pastDate,
        validFormData,
        validContext,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "PAST_EXPIRY_DATE")).toBe(
        true,
      );
    });

    it("should return valid for unrecognized fields", () => {
      const result = InventoryFormValidator.validateField(
        // @ts-expect-error - Testing unknown field
        "unknownField",
        "value",
        validFormData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("utility methods", () => {
    it("should get display message for validation errors", () => {
      const invalidResult = {
        isValid: false,
        errors: [
          {
            field: "medicationId" as const,
            message: "Test error",
            code: "TEST_ERROR",
          },
        ],
        warnings: [],
      };

      const message = InventoryFormValidator.getDisplayMessage(invalidResult);

      expect(message).toBe("Test error");
    });

    it("should return null for valid results", () => {
      const validResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const message = InventoryFormValidator.getDisplayMessage(validResult);

      expect(message).toBe(null);
    });

    it("should check for specific error codes", () => {
      const result = {
        isValid: false,
        errors: [
          {
            field: "medicationId" as const,
            message: "Required",
            code: "MISSING_MEDICATION",
          },
        ],
        warnings: [],
      };

      expect(
        InventoryFormValidator.hasError(result, "MISSING_MEDICATION"),
      ).toBe(true);
      expect(InventoryFormValidator.hasError(result, "OTHER_ERROR")).toBe(
        false,
      );
    });

    it("should check for specific warning codes", () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: "unitsRemaining" as const,
            message: "Low stock",
            code: "LOW_STOCK",
          },
        ],
      };

      expect(InventoryFormValidator.hasWarning(result, "LOW_STOCK")).toBe(true);
      expect(InventoryFormValidator.hasWarning(result, "OTHER_WARNING")).toBe(
        false,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty context", () => {
      const result = InventoryFormValidator.validate(validFormData, {});

      // Should still validate but without household context
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        true,
      );
    });

    it("should handle boundary dates", () => {
      const boundaryData = {
        ...validFormData,
        expiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Exactly 30 days
      };

      const result = InventoryFormValidator.validate(
        boundaryData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRING_SOON")).toBe(
        true,
      );
    });

    it("should handle boundary quantities", () => {
      const boundaryData = {
        ...validFormData,
        quantityUnits: 5,
        unitsRemaining: 1, // Exactly 20%
      };

      const result = InventoryFormValidator.validate(
        boundaryData,
        validContext,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LOW_STOCK")).toBe(true);
    });
  });
});
