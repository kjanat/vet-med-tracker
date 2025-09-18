import { z } from "zod";

// Define the inventory item schema for form validation
export const inventoryFormSchema = z
  .object({
    assignedAnimalId: z.string().optional(),
    barcode: z.string().optional(),
    brand: z.string().optional(),
    concentration: z.string().optional(),
    expiresOn: z.date().min(new Date(), "Expiry date must be in the future"),
    form: z.string().min(1, "Form is required"),
    isCustomMedication: z.boolean(), // Track custom vs catalog
    lot: z.string().optional(),
    medicationId: z.uuid().optional(), // Made optional for hybrid approach
    name: z.string().min(1, "Medication name is required"), // Primary field for hybrid
    quantityUnits: z
      .number()
      .int("Quantity must be a whole number")
      .positive("Quantity must be positive"),
    route: z.string().min(1, "Route is required"),
    setInUse: z.boolean(),
    storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]),
    strength: z.string().optional(),
    unitsRemaining: z
      .number()
      .int("Units remaining must be a whole number")
      .min(0, "Units remaining cannot be negative"),
  })
  .refine((data) => data.unitsRemaining <= data.quantityUnits, {
    message: "Units remaining cannot exceed total quantity",
    path: ["unitsRemaining"],
  });

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;
