import type { AnimalFormData } from "@/lib/schemas/animal";
import {
  BaseFormValidator,
  type BaseValidationContext,
  type BaseValidationResult,
} from "./BaseFormValidator";

/**
 * Animal-specific validation context
 */
interface AnimalValidationContext extends BaseValidationContext {
  existingAnimals?: string[];
  household?: {
    id: string;
    name: string;
    avatar?: string;
    timezone?: string;
  } | null;
}

/**
 * Modern animal form validator extending the base validator
 * Demonstrates the new validation pattern while maintaining compatibility
 */
export class AnimalFormValidatorV2 extends BaseFormValidator<AnimalFormData> {
  constructor() {
    super();
    this.initializeRules();
  }

  /**
   * Initialize validation rules using the rule-based system
   */
  private initializeRules(): void {
    // Required field rules
    this.addRule({
      name: "required-name",
      validate: (data) => {
        const error = this.validateRequired(data.name, "name", "Animal name");
        return error ? [error] : [];
      },
    });

    this.addRule({
      name: "required-species",
      validate: (data) => {
        const error = this.validateRequired(data.species, "species", "Species");
        return error ? [error] : [];
      },
    });

    this.addRule({
      name: "required-timezone",
      validate: (data) => {
        const error = this.validateRequired(
          data.timezone,
          "timezone",
          "Timezone",
        );
        return error ? [error] : [];
      },
    });

    // Email validation rule
    this.addRule({
      name: "vet-email-format",
      validate: (data) => {
        if (!data.vetEmail) return [];
        const error = this.validateEmail(data.vetEmail, "vetEmail");
        return error ? [error] : [];
      },
    });

    // Photo URL validation rule
    this.addRule({
      name: "photo-url-format",
      validate: (data) => {
        if (!data.photoUrl) return [];
        try {
          new URL(data.photoUrl);
          return [];
        } catch {
          return [
            this.createError(
              "photoUrl",
              "INVALID_URL",
              "Please enter a valid photo URL",
            ),
          ];
        }
      },
    });

    // Weight validation rule
    this.addRule({
      name: "weight-range",
      validate: (data) => {
        if (!data.weightKg) return [];
        const error = this.validateNumberRange(
          data.weightKg,
          "weightKg",
          0.01,
          1000,
          "Weight",
        );
        return error ? [error] : [];
      },
    });

    // Date of birth validation rule
    this.addRule({
      name: "dob-range",
      validate: (data) => {
        if (!data.dob) return [];
        const maxDate = new Date();
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 50); // Reasonable max age

        const error = this.validateDateRange(data.dob, "dob", minDate, maxDate);
        return error ? [error] : [];
      },
    });

    // Business rule: unique animal name within household
    this.addRule({
      name: "unique-name-in-household",
      validate: (data, context) => {
        const animalContext = context as AnimalValidationContext;
        if (!animalContext?.existingAnimals || !animalContext.isEditing) {
          return [];
        }

        const isNameTaken = animalContext.existingAnimals.some(
          (name) => name.toLowerCase() === data.name.toLowerCase(),
        );

        if (isNameTaken) {
          return [
            this.createError(
              "name",
              "DUPLICATE_NAME",
              "An animal with this name already exists in your household",
            ),
          ];
        }

        return [];
      },
    });

    // Warning rules
    this.addRule({
      isWarning: true,
      name: "missing-microchip-warning",
      validate: (data) => {
        if (!data.microchipId || data.microchipId.trim() === "") {
          return [
            this.createError(
              "microchipId",
              "MISSING_MICROCHIP",
              "Consider adding a microchip ID for better identification",
              "warning",
            ),
          ];
        }
        return [];
      },
    });

    this.addRule({
      isWarning: true,
      name: "missing-vet-info-warning",
      validate: (data) => {
        if (!data.vetName && !data.vetEmail && !data.vetPhone) {
          return [
            this.createError(
              "general",
              "MISSING_VET_INFO",
              "Adding veterinarian information helps with medical tracking",
              "warning",
            ),
          ];
        }
        return [];
      },
    });
  }

  /**
   * Main validation method
   */
  validate(
    data: AnimalFormData,
    context: AnimalValidationContext = {},
  ): BaseValidationResult {
    return this.executeRules(data, context);
  }

  /**
   * Backward compatibility method that matches the original validator interface
   */
  static validate(
    data: AnimalFormData,
    context: AnimalValidationContext = {},
  ): BaseValidationResult {
    const validator = new AnimalFormValidatorV2();
    return validator.validate(data, context);
  }

  /**
   * Get display message for validation result (backward compatibility)
   */
  static override getDisplayMessage(
    result: BaseValidationResult,
  ): string | null {
    return BaseFormValidator.getDisplayMessage(result);
  }
}
