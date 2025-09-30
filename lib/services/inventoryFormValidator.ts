import { z } from "zod";

export const InventoryFormSchema = z.object({
  assignedAnimalId: z.string().optional(),
  expirationDate: z.date().optional(),
  inUse: z.boolean().default(false),
  itemId: z.string().min(1, "Item is required"),
  location: z.string().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  quantityUnit: z.string().optional(),
});

export type InventoryFormValues = z.infer<typeof InventoryFormSchema>;

export function validateInventoryForm(data: unknown): InventoryFormValues {
  return InventoryFormSchema.parse(data);
}

export class InventoryFormValidator {
  static validate = validateInventoryForm;
  static schema = InventoryFormSchema;

  static getDisplayMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Validation error";
  }
}
