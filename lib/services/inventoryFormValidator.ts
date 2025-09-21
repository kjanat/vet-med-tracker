import type { z } from "zod";
import type { inventoryFormSchema } from "@/lib/schemas/inventory";

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
interface ValidationError {
  field: keyof InventoryFormData | "general";
  message: string;
  code: string;
}

/**
 * Validation warning interface
 */
interface ValidationWarning {
  field: keyof InventoryFormData | "general";
  message: string;
  code: string;
}

/**
 * Validation context for business rule validation
 */
interface ValidationContext {
  householdId?: string;
  validateQuantity?: boolean;
  allowPastExpiry?: boolean;
}

/**
 * Dedicated validation service for inventory form business rules
 *
 * Handles all validation logic including quantity checks, expiry validation,
 * medication requirements, and business rule enforcement. Extracted from
 * the main hook to follow Single Responsibility Principle.
 */
export class InventoryFormValidator {
  /**
   * Comprehensive form validation with business rules
   */
  static validate(
    data: InventoryFormData,
    context: ValidationContext = {},
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate household context
    const householdValidation = InventoryFormValidator.validateHousehold(
      context.householdId,
    );
    if (!householdValidation.isValid) {
      errors.push(...householdValidation.errors);
    }

    // Validate medication selection
    const medicationValidation =
      InventoryFormValidator.validateMedication(data);
    if (!medicationValidation.isValid) {
      errors.push(...medicationValidation.errors);
    }

    // Validate quantity constraints
    if (context.validateQuantity !== false) {
      const quantityValidation = InventoryFormValidator.validateQuantity(data);
      if (!quantityValidation.isValid) {
        errors.push(...quantityValidation.errors);
      }
      warnings.push(...quantityValidation.warnings);
    }

    // Validate expiry date
    const expiryValidation = InventoryFormValidator.validateExpiry(
      data,
      context.allowPastExpiry,
    );
    if (!expiryValidation.isValid) {
      errors.push(...expiryValidation.errors);
    }
    warnings.push(...expiryValidation.warnings);

    // Validate storage requirements
    const storageValidation = InventoryFormValidator.validateStorage(data);
    warnings.push(...storageValidation.warnings);

    // Validate unit type
    const unitTypeValidation = InventoryFormValidator.validateUnitType(data);
    if (!unitTypeValidation.isValid) {
      errors.push(...unitTypeValidation.errors);
    }
    warnings.push(...unitTypeValidation.warnings);

    // Validate veterinary safety rules
    const safetyValidation =
      InventoryFormValidator.validateVeterinarySafety(data);
    warnings.push(...safetyValidation.warnings);

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validate household context is present
   */
  private static validateHousehold(householdId?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!householdId || householdId.trim() === "") {
      errors.push({
        code: "MISSING_HOUSEHOLD",
        field: "general",
        message: "No household selected. Please select a household first.",
      });
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings: [],
    };
  }

  /**
   * Validate medication selection requirements
   * Fixed to properly handle hybrid approach: medicationId OR name required
   */
  private static validateMedication(data: InventoryFormData): ValidationResult {
    const errors: ValidationError[] = [];

    // For hybrid approach: require either medicationId OR name (not both)
    const hasMedicationId =
      data.medicationId && data.medicationId.trim() !== "";
    const hasName = data.name && data.name.trim() !== "";

    if (!hasMedicationId && !hasName) {
      errors.push({
        code: "MISSING_MEDICATION",
        field: "medicationId",
        message:
          "Please select a medication or enter a custom medication name.",
      });
    }

    // Validate custom medication has required name
    if (data.isCustomMedication && !hasName) {
      errors.push({
        code: "MISSING_CUSTOM_NAME",
        field: "name",
        message: "Custom medication name is required.",
      });
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings: [],
    };
  }

  /**
   * Validate quantity constraints and business rules
   */
  private static validateQuantity(data: InventoryFormData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic quantity validation
    if (data.quantityUnits <= 0) {
      errors.push({
        code: "INVALID_QUANTITY",
        field: "quantityUnits",
        message: "Total quantity must be greater than 0.",
      });
    }

    if (data.unitsRemaining < 0) {
      errors.push({
        code: "NEGATIVE_REMAINING",
        field: "unitsRemaining",
        message: "Units remaining cannot be negative.",
      });
    }

    // Business rule: remaining cannot exceed total
    if (data.unitsRemaining > data.quantityUnits) {
      errors.push({
        code: "REMAINING_EXCEEDS_TOTAL",
        field: "unitsRemaining",
        message: "Units remaining cannot exceed total quantity.",
      });
    }

    // Warning for low stock
    const percentRemaining =
      data.quantityUnits > 0
        ? (data.unitsRemaining / data.quantityUnits) * 100
        : 0;

    if (percentRemaining < 20 && percentRemaining > 0) {
      warnings.push({
        code: "LOW_STOCK",
        field: "unitsRemaining",
        message: "Low stock warning: Less than 20% remaining.",
      });
    }

    // Warning for empty stock
    if (data.unitsRemaining === 0) {
      warnings.push({
        code: "EMPTY_STOCK",
        field: "unitsRemaining",
        message: "Empty stock: No units remaining.",
      });
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validate expiry date constraints
   */
  private static validateExpiry(
    data: InventoryFormData,
    allowPastExpiry?: boolean,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.expiresOn) {
      errors.push({
        code: "MISSING_EXPIRY",
        field: "expiresOn",
        message: "Expiry date is required.",
      });
      return { errors, isValid: false, warnings };
    }

    const now = new Date();
    const expiryDate = new Date(data.expiresOn);

    // Check if expiry is in the past
    if (expiryDate < now) {
      if (allowPastExpiry) {
        warnings.push({
          code: "EXPIRED_MEDICATION",
          field: "expiresOn",
          message: "This medication has already expired.",
        });
      } else {
        errors.push({
          code: "PAST_EXPIRY_DATE",
          field: "expiresOn",
          message: "Expiry date must be in the future.",
        });
      }
    }

    // Warning for soon-to-expire items (within 30 days)
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
      warnings.push({
        code: "EXPIRING_SOON",
        field: "expiresOn",
        message: `Expires in ${daysUntilExpiry} days. Consider using soon.`,
      });
    }

    // Warning for very long expiry (over 5 years)
    if (daysUntilExpiry > 5 * 365) {
      warnings.push({
        code: "LONG_EXPIRY",
        field: "expiresOn",
        message: "Very long expiry date. Please verify this is correct.",
      });
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validate storage requirements and provide warnings
   */
  private static validateStorage(data: InventoryFormData): ValidationResult {
    const warnings: ValidationWarning[] = [];

    // Storage-specific warnings based on medication type
    if (data.storage === "CONTROLLED" && !data.lot) {
      warnings.push({
        code: "CONTROLLED_SUBSTANCE_LOT",
        field: "lot",
        message: "Lot number recommended for controlled substances.",
      });
    }

    if (
      data.storage === "FREEZER" &&
      data.form?.toLowerCase().includes("liquid")
    ) {
      warnings.push({
        code: "LIQUID_FREEZER_WARNING",
        field: "storage",
        message: "Verify liquid medication is suitable for freezing.",
      });
    }

    return {
      errors: [],
      isValid: true,
      warnings,
    };
  }

  /**
   * Validate unit type requirements and compatibility
   */
  private static validateUnitType(data: InventoryFormData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic unit type validation
    if (!data.unitType || data.unitType.trim() === "") {
      errors.push({
        code: "MISSING_UNIT_TYPE",
        field: "unitType",
        message: "Unit type is required.",
      });
      return { errors, isValid: false, warnings };
    }

    // Validate unit type compatibility with medication form
    const form = data.form?.toLowerCase();
    const unitType = data.unitType.toLowerCase();

    // Business rule: tablets/capsules should use appropriate units
    if (form === "tablet" && !["units", "tablets"].includes(unitType)) {
      warnings.push({
        code: "UNIT_TYPE_FORM_MISMATCH",
        field: "unitType",
        message: "Tablets typically use 'units' or 'tablets' as unit type.",
      });
    }

    if (form === "capsule" && !["units", "capsules"].includes(unitType)) {
      warnings.push({
        code: "UNIT_TYPE_FORM_MISMATCH",
        field: "unitType",
        message: "Capsules typically use 'units' or 'capsules' as unit type.",
      });
    }

    if (
      form === "liquid" &&
      !["ml", "doses", "applications"].includes(unitType)
    ) {
      warnings.push({
        code: "UNIT_TYPE_FORM_MISMATCH",
        field: "unitType",
        message:
          "Liquids typically use 'ml', 'doses', or 'applications' as unit type.",
      });
    }

    // Business rule: weight-based units need strength information
    if (["mg", "g"].includes(unitType) && !data.strength) {
      warnings.push({
        code: "WEIGHT_UNIT_NEEDS_STRENGTH",
        field: "strength",
        message: "Weight-based units should include strength information.",
      });
    }

    // Business rule: dosage units should have route consistency
    if (unitType === "doses") {
      if (data.route === "Topical" && data.form !== "Topical") {
        warnings.push({
          code: "DOSE_ROUTE_INCONSISTENCY",
          field: "route",
          message: "Topical route should match topical medication form.",
        });
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validate veterinary-specific safety rules and medication warnings
   */
  private static validateVeterinarySafety(
    data: InventoryFormData,
  ): ValidationResult {
    const warnings: ValidationWarning[] = [];
    const medicationName = data.name?.toLowerCase() ?? "";

    InventoryFormValidator.applyHighRiskMedicationWarning(
      medicationName,
      warnings,
    );
    InventoryFormValidator.applyControlledSubstanceWarnings(data, warnings);
    InventoryFormValidator.applyInjectableStorageWarnings(data, warnings);
    InventoryFormValidator.applyLargeQuantityWarnings(
      data,
      medicationName,
      warnings,
    );
    InventoryFormValidator.applyOphthalmicOticWarnings(data, warnings);
    InventoryFormValidator.applyLiquidMedicationWarnings(data, warnings);
    InventoryFormValidator.applyMultiDoseWarnings(data, warnings);

    return {
      errors: [],
      isValid: true,
      warnings,
    };
  }

  private static applyHighRiskMedicationWarning(
    medicationName: string,
    warnings: ValidationWarning[],
  ): void {
    const highRiskMedications = [
      "insulin",
      "warfarin",
      "digoxin",
      "theophylline",
      "phenobarbital",
      "furosemide",
      "acepromazine",
      "ketamine",
      "propofol",
    ];

    if (highRiskMedications.some((med) => medicationName.includes(med))) {
      warnings.push({
        code: "HIGH_RISK_MEDICATION",
        field: "name",
        message:
          "This is a high-risk medication requiring careful dosing and monitoring.",
      });
    }
  }

  private static applyControlledSubstanceWarnings(
    data: InventoryFormData,
    warnings: ValidationWarning[],
  ): void {
    if (data.storage !== "CONTROLLED") {
      return;
    }

    if (!data.lot) {
      warnings.push({
        code: "CONTROLLED_SUBSTANCE_LOT",
        field: "lot",
        message:
          "Controlled substances should have lot numbers for tracking compliance.",
      });
    }

    warnings.push({
      code: "CONTROLLED_SUBSTANCE_REMINDER",
      field: "storage",
      message:
        "Controlled substance - ensure proper DEA compliance and secure storage.",
    });
  }

  private static applyInjectableStorageWarnings(
    data: InventoryFormData,
    warnings: ValidationWarning[],
  ): void {
    const isInjectionRoute =
      data.route === "Subcutaneous" || data.route === "Intramuscular";

    if (
      isInjectionRoute &&
      data.storage === "ROOM" &&
      data.form === "Injection"
    ) {
      warnings.push({
        code: "INJECTABLE_STORAGE_CHECK",
        field: "storage",
        message: "Verify injectable medications don't require refrigeration.",
      });
    }
  }

  private static applyLargeQuantityWarnings(
    data: InventoryFormData,
    medicationName: string,
    warnings: ValidationWarning[],
  ): void {
    if (data.quantityUnits <= 100) {
      return;
    }

    const isSensitiveMedication =
      medicationName.includes("antibiotic") ||
      medicationName.includes("steroid");

    if (isSensitiveMedication) {
      warnings.push({
        code: "LARGE_QUANTITY_WARNING",
        field: "quantityUnits",
        message:
          "Large quantities of antibiotics/steroids may have special storage or disposal requirements.",
      });
    }
  }

  private static applyOphthalmicOticWarnings(
    data: InventoryFormData,
    warnings: ValidationWarning[],
  ): void {
    const isEyeOrEarRoute =
      data.route === "Ophthalmic" || data.route === "Otic";

    if (!isEyeOrEarRoute) {
      return;
    }

    if (data.storage === "FREEZER") {
      warnings.push({
        code: "EYE_EAR_FREEZER_WARNING",
        field: "storage",
        message:
          "Eye/ear medications should not typically be frozen - verify storage requirements.",
      });
    }

    const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
    const hasLongShelfLife =
      data.expiresOn && data.expiresOn.getTime() - Date.now() > twoYearsInMs;

    if (!data.expiresOn || hasLongShelfLife) {
      warnings.push({
        code: "EYE_EAR_EXPIRY_WARNING",
        field: "expiresOn",
        message:
          "Eye/ear medications typically have shorter shelf lives once opened.",
      });
    }
  }

  private static applyLiquidMedicationWarnings(
    data: InventoryFormData,
    warnings: ValidationWarning[],
  ): void {
    const requiresStrength =
      data.form === "Liquid" && data.concentration && !data.strength;

    if (requiresStrength) {
      warnings.push({
        code: "LIQUID_DOSING_WARNING",
        field: "strength",
        message:
          "Liquid medications with concentration should specify strength per unit volume.",
      });
    }
  }

  private static applyMultiDoseWarnings(
    data: InventoryFormData,
    warnings: ValidationWarning[],
  ): void {
    if (data.form === "Injection" && data.quantityUnits > 1) {
      warnings.push({
        code: "MULTI_DOSE_VIAL_WARNING",
        field: "quantityUnits",
        message:
          "Multi-dose vials require sterile technique and have limited use periods once opened.",
      });
    }
  }

  /**
   * Quick validation for specific fields (useful for real-time validation)
   */
  static validateField(
    field: keyof InventoryFormData,
    value: InventoryFormData[keyof InventoryFormData],
    data: InventoryFormData,
    context: ValidationContext = {},
  ): ValidationResult {
    const mockData = { ...data, [field]: value };

    switch (field) {
      case "medicationId":
      case "name":
        return InventoryFormValidator.validateMedication(mockData);
      case "quantityUnits":
      case "unitsRemaining":
        return InventoryFormValidator.validateQuantity(mockData);
      case "expiresOn":
        return InventoryFormValidator.validateExpiry(
          mockData,
          context.allowPastExpiry,
        );
      case "storage":
        return InventoryFormValidator.validateStorage(mockData);
      case "unitType":
        return InventoryFormValidator.validateUnitType(mockData);
      default:
        return { errors: [], isValid: true, warnings: [] };
    }
  }

  /**
   * Get user-friendly error message for display in UI
   */
  static getDisplayMessage(result: ValidationResult): string | null {
    if (result.isValid || result.errors.length === 0) {
      return null;
    }

    // Return the first error message for simple UI display
    return result.errors[0]?.message || null;
  }

  /**
   * Check if specific error code is present
   */
  static hasError(result: ValidationResult, code: string): boolean {
    return result.errors.some((error) => error.code === code);
  }

  /**
   * Check if specific warning code is present
   */
  static hasWarning(result: ValidationResult, code: string): boolean {
    return result.warnings.some((warning) => warning.code === code);
  }
}
