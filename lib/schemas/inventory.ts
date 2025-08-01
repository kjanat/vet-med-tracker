import { z } from "zod";

// Define the inventory item schema for form validation
export const inventoryFormSchema = z
	.object({
		medicationId: z.string().uuid("Please select a medication"),
		name: z.string().min(1, "Medication name is required"),
		brand: z.string().optional(),
		route: z.string().min(1, "Route is required"),
		form: z.string().min(1, "Form is required"),
		strength: z.string().optional(),
		concentration: z.string().optional(),
		quantityUnits: z
			.number()
			.int("Quantity must be a whole number")
			.positive("Quantity must be positive"),
		unitsRemaining: z
			.number()
			.int("Units remaining must be a whole number")
			.min(0, "Units remaining cannot be negative"),
		lot: z.string().optional(),
		expiresOn: z.date().min(new Date(), "Expiry date must be in the future"),
		storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]),
		assignedAnimalId: z.string().optional(),
		barcode: z.string().optional(),
		setInUse: z.boolean(),
	})
	.refine((data) => data.unitsRemaining <= data.quantityUnits, {
		message: "Units remaining cannot exceed total quantity",
		path: ["unitsRemaining"],
	});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;
