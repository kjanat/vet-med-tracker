import { z } from "zod";
import {
  createSecurityValidator,
  secureSchemas,
} from "@/lib/security/input-sanitization";

// Base schema for form validation
export const animalFormBaseSchema = z.object({
  allergies: secureSchemas.limitedArray(secureSchemas.safeString(100), 50),
  breed: secureSchemas.safeString(100).optional(),
  clinicName: secureSchemas.safeString(200).optional(),
  color: secureSchemas.safeString(50).optional(),
  conditions: secureSchemas.limitedArray(secureSchemas.safeString(100), 50),
  dob: secureSchemas.recentDate(200, 0).optional(), // Max 200 years back, no future dates
  microchipId: secureSchemas.safeString(50).optional(),
  name: secureSchemas.safeString(100),
  neutered: z.boolean(),
  notes: secureSchemas.safeString(2000).optional(),
  photoUrl: secureSchemas.url().optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  species: secureSchemas.safeString(50),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(
      (val) => /^[A-Za-z_]+\/[A-Za-z_]+$/.test(val) || val === "UTC",
      "Invalid timezone format",
    ),
  vetEmail: secureSchemas.email.optional(),
  vetName: secureSchemas.safeString(100).optional(),
  vetPhone: secureSchemas.phone.optional(),
  weightKg: secureSchemas.positiveNumber(1000).optional(), // Max 1000kg
});

// Define the animal schema for form validation with enhanced security
export const animalFormSchema = createSecurityValidator(animalFormBaseSchema);

// API schema with additional UUID validation for IDs
export const animalApiSchema = z.object({
  allergies: secureSchemas
    .limitedArray(secureSchemas.safeString(100), 50)
    .optional(),
  breed: secureSchemas.safeString(100).optional(),
  clinicName: secureSchemas.safeString(200).optional(),
  color: secureSchemas.safeString(50).optional(),
  conditions: secureSchemas
    .limitedArray(secureSchemas.safeString(100), 50)
    .optional(),
  dob: z.string().optional(), // ISO date string for API
  householdId: secureSchemas.uuid,
  id: secureSchemas.uuid.optional(),
  microchipId: secureSchemas.safeString(50).optional(),
  name: secureSchemas.safeString(100),
  neutered: z.boolean(),
  notes: secureSchemas.safeString(2000).optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  species: secureSchemas.safeString(50),
  timezone: z.string().min(1, "Timezone is required"),
  vetEmail: secureSchemas.email.optional(),
  vetName: secureSchemas.safeString(100).optional(),
  vetPhone: secureSchemas.phone.optional(),
  weightKg: z.string().optional(), // String representation for database
});

// Simple form schema for React Hook Form compatibility
export const animalFormSimpleSchema = z.object({
  allergies: z
    .array(z.string().max(100, "Allergy too long"))
    .max(50, "Too many allergies"),
  breed: z.string().max(100, "Breed too long").optional(),
  clinicName: z.string().max(200, "Clinic name too long").optional(),
  color: z.string().max(50, "Color too long").optional(),
  conditions: z
    .array(z.string().max(100, "Condition too long"))
    .max(50, "Too many conditions"),
  dob: z.date().optional(),
  microchipId: z.string().max(50, "Microchip ID too long").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  neutered: z.boolean(),
  notes: z.string().max(2000, "Notes too long").optional(),
  photoUrl: z.url("Invalid URL").optional().or(z.literal("")),
  sex: z.enum(["Male", "Female"]).optional(),
  species: z.string().min(1, "Species is required").max(50, "Species too long"),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(
      (val) => /^[A-Za-z_]+\/[A-Za-z_]+$/.test(val) || val === "UTC",
      "Invalid timezone format",
    ),
  vetEmail: z.email("Invalid email").optional().or(z.literal("")),
  vetName: z.string().max(100, "Vet name too long").optional(),
  vetPhone: z.string().max(20, "Phone too long").optional(),
  weightKg: z.number().positive().max(1000).optional(),
});

export type AnimalFormData = z.infer<typeof animalFormSimpleSchema>;
export type AnimalFormDataSecure = z.infer<typeof animalFormBaseSchema>;
export type AnimalApiData = z.infer<typeof animalApiSchema>;
