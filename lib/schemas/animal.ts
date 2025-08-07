import { z } from "zod";

// Define the animal schema for form validation
export const animalFormSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name is too long"),
	species: z.string().min(1, "Species is required"),
	breed: z.string().optional(),
	sex: z.enum(["Male", "Female"]).optional(),
	neutered: z.boolean(),
	dob: z.date().optional(),
	weightKg: z.number().positive("Weight must be positive").optional(),
	microchipId: z.string().optional(),
	color: z.string().optional(),
	timezone: z.string().min(1, "Timezone is required"),
	vetName: z.string().optional(),
	vetPhone: z
		.string()
		.optional()
		.refine(
			(val) => !val || /^[\d\s\-()+]+$/.test(val),
			"Invalid phone number format",
		),
	vetEmail: z
		.string()
		.optional()
		.refine(
			(val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
			"Invalid email format",
		),
	clinicName: z.string().optional(),
	notes: z.string().optional(),
	allergies: z.array(z.string()),
	conditions: z.array(z.string()),
	photoUrl: z.string().optional(),
});

export type AnimalFormData = z.infer<typeof animalFormSchema>;
