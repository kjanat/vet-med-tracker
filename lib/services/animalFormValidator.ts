import type { AnimalFormData } from "@/lib/schemas/animal";

interface Household {
  id: string;
  name: string;
  avatar?: string;
  timezone?: string;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: keyof AnimalFormData | "general";
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validation context interface
 */
export interface ValidationContext {
  household?: Household | null;
  isEditing?: boolean;
  existingAnimals?: string[];
}

/**
 * Animal form validation service
 *
 * This service handles all validation logic for animal forms:
 * - Required field validation
 * - Business rule validation
 * - Context-aware validation (household, editing state)
 * - Structured error and warning reporting
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class for validation
export class AnimalFormValidator {
  /**
   * Validate complete form data
   *
   * Performs comprehensive validation including required fields,
   * business rules, and context-specific validation.
   */
  static validate(
    data: AnimalFormData,
    context: ValidationContext = {},
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required field validation
    const requiredErrors = AnimalFormValidator.validateRequiredFields(data);
    errors.push(...requiredErrors);

    // Business rule validation
    const businessErrors = AnimalFormValidator.validateBusinessRules(
      data,
      context,
    );
    errors.push(...businessErrors);

    // Context validation
    const contextErrors = AnimalFormValidator.validateContext(data, context);
    errors.push(...contextErrors);

    // Generate warnings
    const validationWarnings = AnimalFormValidator.generateWarnings(data);
    warnings.push(...validationWarnings);

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validate required fields
   *
   * Checks that all mandatory fields are present and properly formatted.
   */
  static validateRequiredFields(data: AnimalFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
      errors.push({
        code: "REQUIRED_FIELD",
        field: "name",
        message: "Animal name is required",
        severity: "error",
      });
    }

    if (!data.species?.trim()) {
      errors.push({
        code: "REQUIRED_FIELD",
        field: "species",
        message: "Species is required",
        severity: "error",
      });
    }

    if (!data.timezone?.trim()) {
      errors.push({
        code: "REQUIRED_FIELD",
        field: "timezone",
        message: "Timezone is required",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate business rules
   *
   * Applies domain-specific business rules and constraints.
   */
  static validateBusinessRules(
    data: AnimalFormData,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...AnimalFormValidator.validateEmail(data));
    errors.push(...AnimalFormValidator.validateWeight(data));
    errors.push(...AnimalFormValidator.validateDateOfBirth(data));
    errors.push(...AnimalFormValidator.validatePhoneNumber(data));
    errors.push(...AnimalFormValidator.validateNameUniqueness(data, context));

    return errors;
  }

  /**
   * Validate email address format
   */
  private static validateEmail(data: AnimalFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
      data.vetEmail?.trim() &&
      !AnimalFormValidator.isValidEmail(data.vetEmail)
    ) {
      errors.push({
        code: "INVALID_EMAIL",
        field: "vetEmail",
        message: "Please enter a valid email address",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate weight constraints
   */
  private static validateWeight(data: AnimalFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.weightKg !== undefined && data.weightKg !== null) {
      if (data.weightKg <= 0) {
        errors.push({
          code: "INVALID_WEIGHT",
          field: "weightKg",
          message: "Weight must be greater than 0",
          severity: "error",
        });
      }
      if (data.weightKg > 1000) {
        errors.push({
          code: "UNREALISTIC_WEIGHT",
          field: "weightKg",
          message: "Weight seems unusually high. Please verify.",
          severity: "warning",
        });
      }
    }

    return errors;
  }

  /**
   * Validate date of birth constraints
   */
  private static validateDateOfBirth(data: AnimalFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.dob) {
      const now = new Date();
      const dobDate = new Date(data.dob);

      if (dobDate > now) {
        errors.push({
          code: "FUTURE_DATE",
          field: "dob",
          message: "Date of birth cannot be in the future",
          severity: "error",
        });
      }

      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 50);
      if (dobDate < maxAge) {
        errors.push({
          code: "UNREALISTIC_AGE",
          field: "dob",
          message: "This age seems unusually high. Please verify.",
          severity: "warning",
        });
      }
    }

    return errors;
  }

  /**
   * Validate phone number format
   */
  private static validatePhoneNumber(data: AnimalFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
      data.vetPhone?.trim() &&
      !AnimalFormValidator.isValidPhoneNumber(data.vetPhone)
    ) {
      errors.push({
        code: "INVALID_PHONE",
        field: "vetPhone",
        message: "Please enter a valid phone number",
        severity: "warning", // Phone formats vary widely, so warning instead of error
      });
    }

    return errors;
  }

  /**
   * Validate name uniqueness within household
   */
  private static validateNameUniqueness(
    data: AnimalFormData,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (
      context.existingAnimals &&
      data.name?.trim() &&
      !context.isEditing &&
      context.existingAnimals.includes(data.name.trim().toLowerCase())
    ) {
      errors.push({
        code: "DUPLICATE_NAME",
        field: "name",
        message: "An animal with this name already exists in this household",
        severity: "warning",
      });
    }

    return errors;
  }

  /**
   * Validate context requirements
   *
   * Validates context-dependent requirements like household selection.
   */
  static validateContext(
    _data: AnimalFormData,
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!context.household) {
      errors.push({
        code: "NO_HOUSEHOLD",
        field: "general",
        message: "No household selected. Please select a household first.",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Generate validation warnings
   *
   * Provides helpful warnings and suggestions for form improvement.
   */
  static generateWarnings(data: AnimalFormData): ValidationError[] {
    const warnings: ValidationError[] = [];

    // Completeness warnings
    if (!data.breed?.trim()) {
      warnings.push({
        code: "MISSING_RECOMMENDED",
        field: "breed",
        message: "Consider adding breed information for better record keeping",
        severity: "info",
      });
    }

    if (!data.weightKg) {
      warnings.push({
        code: "MISSING_RECOMMENDED",
        field: "weightKg",
        message: "Weight information helps with medication dosage calculations",
        severity: "info",
      });
    }

    if (!data.dob) {
      warnings.push({
        code: "MISSING_RECOMMENDED",
        field: "dob",
        message: "Date of birth helps track age-related health needs",
        severity: "info",
      });
    }

    if (!data.vetName?.trim() && !data.clinicName?.trim()) {
      warnings.push({
        code: "MISSING_VET_INFO",
        field: "vetName",
        message: "Consider adding veterinary contact information",
        severity: "info",
      });
    }

    return warnings;
  }

  /**
   * Quick validation for form submission
   *
   * Performs essential validation checks before allowing form submission.
   * Returns true if form can be submitted, false otherwise.
   */
  static canSubmit(
    data: AnimalFormData,
    context: ValidationContext = {},
  ): boolean {
    const result = AnimalFormValidator.validate(data, context);
    const criticalErrors = result.errors.filter(
      (error) => error.severity === "error",
    );
    return criticalErrors.length === 0;
  }

  /**
   * Get user-friendly error message
   *
   * Returns the first critical error message for display to users.
   */
  static getErrorMessage(
    data: AnimalFormData,
    context: ValidationContext = {},
  ): string | null {
    const result = AnimalFormValidator.validate(data, context);
    const criticalError = result.errors.find(
      (error) => error.severity === "error",
    );
    return criticalError?.message || null;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate phone number format (basic validation)
   */
  private static isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - at least 10 digits
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  /**
   * Get validation summary for display
   *
   * Returns a formatted summary of validation results.
   */
  static getValidationSummary(
    data: AnimalFormData,
    context: ValidationContext = {},
  ): {
    canSubmit: boolean;
    errorCount: number;
    warningCount: number;
    primaryMessage: string | null;
  } {
    const result = AnimalFormValidator.validate(data, context);
    const errorCount = result.errors.filter(
      (e) => e.severity === "error",
    ).length;
    const warningCount =
      result.errors.filter((e) => e.severity === "warning").length +
      result.warnings.length;

    return {
      canSubmit: errorCount === 0,
      errorCount,
      primaryMessage:
        errorCount > 0 ? (result.errors[0]?.message ?? null) : null,
      warningCount,
    };
  }
}
