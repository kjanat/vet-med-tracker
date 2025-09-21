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
        code: "CONTROLLED_LOT_RECOMMENDED",
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
