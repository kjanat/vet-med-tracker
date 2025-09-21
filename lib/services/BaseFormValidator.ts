/**
 * Base validation error interface for all form validators
 */
export interface BaseValidationError {
  field: string | "general";
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * Base validation result interface for all form validators
 */
export interface BaseValidationResult {
  isValid: boolean;
  errors: BaseValidationError[];
  warnings: BaseValidationError[];
}

/**
 * Base validation context interface for all form validators
 */
export interface BaseValidationContext {
  householdId?: string;
  isEditing?: boolean;
  [key: string]: unknown; // Allow specific validators to extend with custom context
}

/**
 * Base validation rule interface
 */
export interface ValidationRule<TFormData> {
  name: string;
  validate: (
    data: TFormData,
    context?: BaseValidationContext,
  ) => BaseValidationError[];
  isWarning?: boolean; // If true, errors from this rule are treated as warnings
}

/**
 * Abstract base class for all form validators
 * Provides common validation patterns and utilities
 */
export abstract class BaseFormValidator<TFormData> {
  protected validationRules: ValidationRule<TFormData>[] = [];

  /**
   * Register a validation rule
   */
  protected addRule(rule: ValidationRule<TFormData>): void {
    this.validationRules.push(rule);
  }

  /**
   * Main validation method that all validators must implement
   */
  abstract validate(
    data: TFormData,
    context?: BaseValidationContext,
  ): BaseValidationResult;

  /**
   * Execute all registered rules and collect errors/warnings
   */
  protected executeRules(
    data: TFormData,
    context?: BaseValidationContext,
  ): BaseValidationResult {
    const errors: BaseValidationError[] = [];
    const warnings: BaseValidationError[] = [];

    for (const rule of this.validationRules) {
      const ruleErrors = rule.validate(data, context);

      if (rule.isWarning) {
        warnings.push(...ruleErrors);
      } else {
        errors.push(...ruleErrors);
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Utility: Create a validation error
   */
  protected createError(
    field: string | "general",
    code: string,
    message: string,
    severity: "error" | "warning" | "info" = "error",
  ): BaseValidationError {
    return { code, field, message, severity };
  }

  /**
   * Utility: Validate required field
   */
  protected validateRequired(
    value: unknown,
    fieldName: string,
    displayName?: string,
  ): BaseValidationError | null {
    if (value === null || value === undefined || value === "") {
      return this.createError(
        fieldName,
        "REQUIRED",
        `${displayName || fieldName} is required`,
      );
    }
    return null;
  }

  /**
   * Utility: Validate email format
   */
  protected validateEmail(
    email: string,
    fieldName: string,
  ): BaseValidationError | null {
    if (!email) return null; // Allow empty emails if field is optional

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return this.createError(
        fieldName,
        "INVALID_EMAIL",
        "Please enter a valid email address",
      );
    }
    return null;
  }

  /**
   * Utility: Validate date range
   */
  protected validateDateRange(
    date: Date,
    fieldName: string,
    minDate?: Date,
    maxDate?: Date,
  ): BaseValidationError | null {
    if (minDate && date < minDate) {
      return this.createError(
        fieldName,
        "DATE_TOO_EARLY",
        `Date cannot be earlier than ${minDate.toLocaleDateString()}`,
      );
    }

    if (maxDate && date > maxDate) {
      return this.createError(
        fieldName,
        "DATE_TOO_LATE",
        `Date cannot be later than ${maxDate.toLocaleDateString()}`,
      );
    }

    return null;
  }

  /**
   * Utility: Validate number range
   */
  protected validateNumberRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number,
    displayName?: string,
  ): BaseValidationError | null {
    if (min !== undefined && value < min) {
      return this.createError(
        fieldName,
        "NUMBER_TOO_SMALL",
        `${displayName || fieldName} must be at least ${min}`,
      );
    }

    if (max !== undefined && value > max) {
      return this.createError(
        fieldName,
        "NUMBER_TOO_LARGE",
        `${displayName || fieldName} must be no more than ${max}`,
      );
    }

    return null;
  }

  /**
   * Utility: Validate string length
   */
  protected validateStringLength(
    value: string,
    fieldName: string,
    minLength?: number,
    maxLength?: number,
    displayName?: string,
  ): BaseValidationError | null {
    if (minLength !== undefined && value.length < minLength) {
      return this.createError(
        fieldName,
        "STRING_TOO_SHORT",
        `${displayName || fieldName} must be at least ${minLength} characters`,
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return this.createError(
        fieldName,
        "STRING_TOO_LONG",
        `${displayName || fieldName} must be no more than ${maxLength} characters`,
      );
    }

    return null;
  }

  /**
   * Get a user-friendly display message from validation result
   */
  static getDisplayMessage(result: BaseValidationResult): string | null {
    if (result.isValid) {
      return null;
    }

    // Prioritize errors over warnings
    const primaryErrors =
      result.errors.length > 0 ? result.errors : result.warnings;

    if (primaryErrors.length === 0) {
      return null;
    }

    // Return the first error message, or a summary if multiple
    if (primaryErrors.length === 1) {
      return primaryErrors[0]?.message ?? "Validation issue detected.";
    }

    return `${primaryErrors.length} validation issues found. Please check your input.`;
  }

  /**
   * Check if validation result has any issues (errors or warnings)
   */
  static hasIssues(result: BaseValidationResult): boolean {
    return result.errors.length > 0 || result.warnings.length > 0;
  }

  /**
   * Get all issues (errors and warnings) as a flat array
   */
  static getAllIssues(result: BaseValidationResult): BaseValidationError[] {
    return [...result.errors, ...result.warnings];
  }
}
