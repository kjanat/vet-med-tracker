import type { InventoryFormData } from "@/lib/schemas/inventory";
import { inventoryFormSchema } from "@/lib/schemas/inventory";

export const InventoryFormSchema = inventoryFormSchema;

export type InventoryFormValues = InventoryFormData;

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export function validateInventoryForm(
  data: InventoryFormData,
  options?: {
    householdId?: string;
    validateQuantity?: boolean;
    allowPastExpiry?: boolean;
  },
): ValidationResult {
  try {
    inventoryFormSchema.parse(data);

    // Additional validation logic
    if (options?.validateQuantity && data.unitsRemaining > data.quantityUnits) {
      return {
        errors: ["Units remaining cannot exceed total quantity"],
        isValid: false,
      };
    }

    if (!options?.allowPastExpiry && data.expiresOn < new Date()) {
      return {
        errors: ["Expiry date cannot be in the past"],
        isValid: false,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Validation error"],
      isValid: false,
    };
  }
}

export class InventoryFormValidator {
  static validate = validateInventoryForm;
  static schema = InventoryFormSchema;

  static getDisplayMessage(result: ValidationResult): string {
    if (!result.isValid && result.errors) {
      return result.errors.join(", ");
    }
    return "";
  }
}
