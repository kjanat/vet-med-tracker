import { describe, expect, test } from "bun:test";
import { InventoryFormValidator } from "../inventoryFormValidator";

// Mock data factory for consistent test data
const createMockFormData = (overrides = {}) => ({
  concentration: undefined,
  expiresOn: new Date("2025-12-31"),
  form: "Tablet",
  isCustomMedication: false,
  lot: "LOT123",
  medicationId: "123e4567-e89b-12d3-a456-426614174000", // Valid UUID
  name: "Test Medication",
  quantityUnits: 10,
  route: "Oral",
  setInUse: false,
  storage: "ROOM" as const,
  strength: "250mg",
  unitsRemaining: 8,
  unitType: "units",
  ...overrides,
});

const createValidationContext = (overrides = {}) => ({
  allowPastExpiry: false,
  householdId: "household-123",
  validateQuantity: true,
  ...overrides,
});

describe("InventoryFormValidator", () => {
  describe("Core Validation - validate()", () => {
    test("should pass validation with valid data", () => {
      const data = createMockFormData();
      const context = createValidationContext();

      const result = InventoryFormValidator.validate(data, context);

      // Debug output for test failure investigation
      if (!result.isValid) {
        console.error("Validation failed unexpectedly:");
        console.error("Errors:", result.errors);
        console.error("Data:", data);
        console.error("Context:", context);
        console.error("Data.medicationId type:", typeof data.medicationId);
        console.error(
          "Data.medicationId value:",
          JSON.stringify(data.medicationId),
        );
        console.error("Data.name type:", typeof data.name);
        console.error("Data.name value:", JSON.stringify(data.name));
        console.error(
          "hasMedicationId:",
          data.medicationId && data.medicationId.trim() !== "",
        );
        console.error("hasName:", data.name && data.name.trim() !== "");
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should fail validation with multiple errors", () => {
      const data = createMockFormData({
        expiresOn: new Date("2020-01-01"), // past date
        medicationId: "",
        name: "",
        quantityUnits: -5,
        unitsRemaining: 15, // exceeds total
        unitType: "",
      });
      const context = createValidationContext({ householdId: "" });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should have specific error codes
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        true,
      );
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
      expect(result.errors.some((e) => e.code === "MISSING_UNIT_TYPE")).toBe(
        true,
      );
    });

    test("should collect warnings without failing validation", () => {
      const data = createMockFormData({
        expiresOn: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // expires in 15 days
        unitsRemaining: 1, // 10% remaining - low stock
      });
      const context = createValidationContext();

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.code === "LOW_STOCK")).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRING_SOON")).toBe(
        true,
      );
    });

    test("should skip quantity validation when disabled", () => {
      const data = createMockFormData({
        quantityUnits: -5,
        unitsRemaining: 15,
      });
      const context = createValidationContext({ validateQuantity: false });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        false,
      );
      expect(
        result.errors.some((e) => e.code === "REMAINING_EXCEEDS_TOTAL"),
      ).toBe(false);
    });
  });

  describe("Household Validation", () => {
    test("should fail when household ID is missing", () => {
      const data = createMockFormData();
      const context = createValidationContext({ householdId: "" });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        true,
      );
      expect(
        result.errors.find((e) => e.code === "MISSING_HOUSEHOLD")?.message,
      ).toContain("No household selected");
    });

    test("should fail when household ID is only whitespace", () => {
      const data = createMockFormData();
      const context = createValidationContext({ householdId: "   " });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        true,
      );
    });

    test("should pass when household ID is provided", () => {
      const data = createMockFormData();
      const context = createValidationContext({
        householdId: "valid-household",
      });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.errors.some((e) => e.code === "MISSING_HOUSEHOLD")).toBe(
        false,
      );
    });
  });

  describe("Medication Validation", () => {
    test("should fail when both medicationId and name are missing", () => {
      const data = createMockFormData({
        medicationId: "",
        name: "",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
    });

    test("should pass with medicationId but no name", () => {
      const data = createMockFormData({
        medicationId: "123e4567-e89b-12d3-a456-426614174001", // Valid UUID
        name: "",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        false,
      );
    });

    test("should pass with name but no medicationId", () => {
      const data = createMockFormData({
        medicationId: "",
        name: "Custom Medication",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        false,
      );
    });

    test("should fail custom medication without name", () => {
      const data = createMockFormData({
        isCustomMedication: true,
        name: "",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_CUSTOM_NAME")).toBe(
        true,
      );
    });

    test("should pass custom medication with name", () => {
      const data = createMockFormData({
        isCustomMedication: true,
        name: "Custom Medication",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.errors.some((e) => e.code === "MISSING_CUSTOM_NAME")).toBe(
        false,
      );
    });
  });

  describe("Quantity Validation", () => {
    test("should fail with zero quantity", () => {
      const data = createMockFormData({ quantityUnits: 0 });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
    });

    test("should fail with negative quantity", () => {
      const data = createMockFormData({ quantityUnits: -5 });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
    });

    test("should fail with negative remaining units", () => {
      const data = createMockFormData({ unitsRemaining: -2 });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "NEGATIVE_REMAINING")).toBe(
        true,
      );
    });

    test("should fail when remaining exceeds total", () => {
      const data = createMockFormData({
        quantityUnits: 10,
        unitsRemaining: 15,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "REMAINING_EXCEEDS_TOTAL"),
      ).toBe(true);
    });

    test("should warn for low stock (under 20%)", () => {
      const data = createMockFormData({
        quantityUnits: 100,
        unitsRemaining: 15, // 15%
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LOW_STOCK")).toBe(true);
    });

    test("should warn for empty stock", () => {
      const data = createMockFormData({
        quantityUnits: 10,
        unitsRemaining: 0,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EMPTY_STOCK")).toBe(true);
    });

    test("should not warn for adequate stock (over 20%)", () => {
      const data = createMockFormData({
        quantityUnits: 100,
        unitsRemaining: 25, // 25%
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.warnings.some((w) => w.code === "LOW_STOCK")).toBe(false);
    });
  });

  describe("Expiry Date Validation", () => {
    test("should fail when expiry date is missing", () => {
      const data = createMockFormData({ expiresOn: undefined });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_EXPIRY")).toBe(true);
    });

    test("should fail when expiry date is in the past", () => {
      const data = createMockFormData({
        expiresOn: new Date("2020-01-01"),
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "PAST_EXPIRY_DATE")).toBe(
        true,
      );
    });

    test("should warn for past expiry when allowed", () => {
      const data = createMockFormData({
        expiresOn: new Date("2020-01-01"),
      });
      const context = createValidationContext({ allowPastExpiry: true });

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRED_MEDICATION")).toBe(
        true,
      );
    });

    test("should warn for soon-to-expire medication (within 30 days)", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

      const data = createMockFormData({ expiresOn: futureDate });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRING_SOON")).toBe(
        true,
      );
    });

    test("should warn for very long expiry (over 5 years)", () => {
      const veryFutureDate = new Date();
      veryFutureDate.setFullYear(veryFutureDate.getFullYear() + 6);

      const data = createMockFormData({ expiresOn: veryFutureDate });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "LONG_EXPIRY")).toBe(true);
    });

    test("should not warn for normal expiry dates", () => {
      const normalDate = new Date();
      normalDate.setFullYear(normalDate.getFullYear() + 2);

      const data = createMockFormData({ expiresOn: normalDate });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.warnings.some((w) => w.code === "EXPIRING_SOON")).toBe(
        false,
      );
      expect(result.warnings.some((w) => w.code === "LONG_EXPIRY")).toBe(false);
    });
  });

  describe("Unit Type Validation", () => {
    test("should fail when unit type is missing", () => {
      const data = createMockFormData({ unitType: "" });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_UNIT_TYPE")).toBe(
        true,
      );
    });

    test("should warn for tablet/unit mismatch", () => {
      const data = createMockFormData({
        form: "tablet",
        unitType: "ml",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "UNIT_TYPE_FORM_MISMATCH"),
      ).toBe(true);
    });

    test("should warn for liquid/unit mismatch", () => {
      const data = createMockFormData({
        form: "liquid",
        unitType: "tablets",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "UNIT_TYPE_FORM_MISMATCH"),
      ).toBe(true);
    });

    test("should warn for weight units without strength", () => {
      const data = createMockFormData({
        strength: "",
        unitType: "mg",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "WEIGHT_UNIT_NEEDS_STRENGTH"),
      ).toBe(true);
    });
  });

  describe("Veterinary Safety Warnings", () => {
    test("should warn for high-risk medications", () => {
      const data = createMockFormData({ name: "insulin injection" });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "HIGH_RISK_MEDICATION"),
      ).toBe(true);
    });

    test("should warn for controlled substances", () => {
      const data = createMockFormData({ storage: "CONTROLLED" });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "CONTROLLED_SUBSTANCE_REMINDER"),
      ).toBe(true);
    });

    test("should warn for controlled substances without lot number", () => {
      const data = createMockFormData({
        lot: "",
        storage: "CONTROLLED",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "CONTROLLED_SUBSTANCE_LOT"),
      ).toBe(true);
    });

    test("should warn for injectable storage concerns", () => {
      const data = createMockFormData({
        form: "Injection",
        route: "Subcutaneous",
        storage: "ROOM",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "INJECTABLE_STORAGE_CHECK"),
      ).toBe(true);
    });

    test("should warn for large quantities of sensitive medications", () => {
      const data = createMockFormData({
        name: "antibiotic medication",
        quantityUnits: 150,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "LARGE_QUANTITY_WARNING"),
      ).toBe(true);
    });

    test("should warn for eye/ear medications in freezer", () => {
      const data = createMockFormData({
        route: "Ophthalmic",
        storage: "FREEZER",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "EYE_EAR_FREEZER_WARNING"),
      ).toBe(true);
    });

    test("should warn for multi-dose vials", () => {
      const data = createMockFormData({
        form: "Injection",
        quantityUnits: 5,
        unitsRemaining: 3, // Must be less than or equal to quantityUnits
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "MULTI_DOSE_VIAL_WARNING"),
      ).toBe(true);
    });
  });

  describe("Field Validation", () => {
    test("should validate specific field - medicationId", () => {
      const data = createMockFormData({ name: "" }); // Ensure name is also empty

      const result = InventoryFormValidator.validateField(
        "medicationId",
        "",
        data,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
    });

    test("should validate specific field - quantityUnits", () => {
      const data = createMockFormData();

      const result = InventoryFormValidator.validateField(
        "quantityUnits",
        -5,
        data,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
    });

    test("should validate specific field - expiresOn with context", () => {
      const data = createMockFormData();
      const pastDate = new Date("2020-01-01");

      const result = InventoryFormValidator.validateField(
        "expiresOn",
        pastDate,
        data,
        { allowPastExpiry: true },
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === "EXPIRED_MEDICATION")).toBe(
        true,
      );
    });

    test("should return valid for unknown fields", () => {
      const data = createMockFormData();

      const result = InventoryFormValidator.validateField(
        "unknownField" as any,
        "value",
        data,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Utility Methods", () => {
    test("getDisplayMessage should return first error message", () => {
      const data = createMockFormData({
        medicationId: "",
        name: "",
        quantityUnits: -5,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );
      const message = InventoryFormValidator.getDisplayMessage(result);

      expect(message).toBeTruthy();
      expect(typeof message).toBe("string");
    });

    test("getDisplayMessage should return null for valid results", () => {
      const data = createMockFormData();
      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );
      const message = InventoryFormValidator.getDisplayMessage(result);

      expect(message).toBeNull();
    });

    test("hasError should detect specific error codes", () => {
      const data = createMockFormData({ quantityUnits: -5 });
      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(InventoryFormValidator.hasError(result, "INVALID_QUANTITY")).toBe(
        true,
      );
      expect(
        InventoryFormValidator.hasError(result, "MISSING_MEDICATION"),
      ).toBe(false);
    });

    test("hasWarning should detect specific warning codes", () => {
      const data = createMockFormData({
        unitsRemaining: 1, // Low stock
      });
      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(InventoryFormValidator.hasWarning(result, "LOW_STOCK")).toBe(true);
      expect(
        InventoryFormValidator.hasWarning(result, "HIGH_RISK_MEDICATION"),
      ).toBe(false);
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    test("should handle null/undefined expiry date gracefully", () => {
      const data = createMockFormData({ expiresOn: null as any });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_EXPIRY")).toBe(true);
    });

    test("should handle extreme date values", () => {
      const extremeDate = new Date("1900-01-01");
      const data = createMockFormData({ expiresOn: extremeDate });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "PAST_EXPIRY_DATE")).toBe(
        true,
      );
    });

    test("should handle zero quantities edge case", () => {
      const data = createMockFormData({
        quantityUnits: 0,
        unitsRemaining: 0,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_QUANTITY")).toBe(
        true,
      );
      expect(result.warnings.some((w) => w.code === "EMPTY_STOCK")).toBe(true);
    });

    test("should handle very large quantities", () => {
      const data = createMockFormData({
        name: "steroid medication",
        quantityUnits: 99999,
        unitsRemaining: 99999,
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(true);
      expect(
        result.warnings.some((w) => w.code === "LARGE_QUANTITY_WARNING"),
      ).toBe(true);
    });

    test("should handle empty string values correctly", () => {
      const data = createMockFormData({
        medicationId: "   ",
        name: "   ",
        unitType: "   ",
      });

      const result = InventoryFormValidator.validate(
        data,
        createValidationContext(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_MEDICATION")).toBe(
        true,
      );
      expect(result.errors.some((e) => e.code === "MISSING_UNIT_TYPE")).toBe(
        true,
      );
    });
  });
});
