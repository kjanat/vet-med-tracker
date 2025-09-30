import { z } from "zod";

export const AnimalFormSchema = z.object({
  breed: z.string().optional(),
  color: z.string().optional(),
  dateOfBirth: z.date().optional(),
  microchipNumber: z.string().optional(),
  name: z.string().min(1, "Animal name is required"),
  notes: z.string().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  species: z.string().min(1, "Species is required"),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(["kg", "lbs"]).optional(),
});

export type AnimalFormValues = z.infer<typeof AnimalFormSchema>;

export function validateAnimalForm(data: unknown): AnimalFormValues {
  return AnimalFormSchema.parse(data);
}
