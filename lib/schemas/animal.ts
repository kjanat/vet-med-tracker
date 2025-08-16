import { z } from "zod";
import {
  createSecurityValidator,
  secureSchemas,
} from "@/lib/security/input-sanitization";

// Base schema for form validation
export const animalFormBaseSchema = z.object({
  name: secureSchemas.safeString(100),
  species: secureSchemas.safeString(50),
  breed: secureSchemas.safeString(100).optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  neutered: z.boolean(),
  dob: secureSchemas.recentDate(200, 0).optional(), // Max 200 years back, no future dates
  weightKg: secureSchemas.positiveNumber(1000).optional(), // Max 1000kg
  microchipId: secureSchemas.safeString(50).optional(),
  color: secureSchemas.safeString(50).optional(),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine((val) => {
      // Validate against common timezone format
      return /^[A-Za-z_]+\/[A-Za-z_]+$/.test(val) || val === "UTC";
    }, "Invalid timezone format"),
  vetName: secureSchemas.safeString(100).optional(),
  vetPhone: secureSchemas.phone.optional(),
  vetEmail: secureSchemas.email.optional(),
  clinicName: secureSchemas.safeString(200).optional(),
  notes: secureSchemas.safeString(2000).optional(),
  allergies: secureSchemas.limitedArray(secureSchemas.safeString(100), 50),
  conditions: secureSchemas.limitedArray(secureSchemas.safeString(100), 50),
  photoUrl: secureSchemas.url().optional(),
});

// Define the animal schema for form validation with enhanced security
export const animalFormSchema = createSecurityValidator(animalFormBaseSchema);

// API schema with additional UUID validation for IDs
export const animalApiSchema = z.object({
  id: secureSchemas.uuid.optional(),
  householdId: secureSchemas.uuid,
  name: secureSchemas.safeString(100),
  species: secureSchemas.safeString(50),
  breed: secureSchemas.safeString(100).optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  neutered: z.boolean(),
  dob: z.string().optional(), // ISO date string for API
  weightKg: z.string().optional(), // String representation for database
  microchipId: secureSchemas.safeString(50).optional(),
  color: secureSchemas.safeString(50).optional(),
  timezone: z.string().min(1, "Timezone is required"),
  vetName: secureSchemas.safeString(100).optional(),
  vetPhone: secureSchemas.phone.optional(),
  vetEmail: secureSchemas.email.optional(),
  clinicName: secureSchemas.safeString(200).optional(),
  notes: secureSchemas.safeString(2000).optional(),
  allergies: secureSchemas
    .limitedArray(secureSchemas.safeString(100), 50)
    .optional(),
  conditions: secureSchemas
    .limitedArray(secureSchemas.safeString(100), 50)
    .optional(),
});

// Simple form schema for React Hook Form compatibility
export const animalFormSimpleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  species: z.string().min(1, "Species is required").max(50, "Species too long"),
  breed: z.string().max(100, "Breed too long").optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  neutered: z.boolean(),
  dob: z.date().optional(),
  weightKg: z.number().positive().max(1000).optional(),
  microchipId: z.string().max(50, "Microchip ID too long").optional(),
  color: z.string().max(50, "Color too long").optional(),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine((val) => {
      return /^[A-Za-z_]+\/[A-Za-z_]+$/.test(val) || val === "UTC";
    }, "Invalid timezone format"),
  vetName: z.string().max(100, "Vet name too long").optional(),
  vetPhone: z.string().max(20, "Phone too long").optional(),
  vetEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clinicName: z.string().max(200, "Clinic name too long").optional(),
  notes: z.string().max(2000, "Notes too long").optional(),
  allergies: z
    .array(z.string().max(100, "Allergy too long"))
    .max(50, "Too many allergies"),
  conditions: z
    .array(z.string().max(100, "Condition too long"))
    .max(50, "Too many conditions"),
  photoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type AnimalFormData = z.infer<typeof animalFormSimpleSchema>;
export type AnimalFormDataSecure = z.infer<typeof animalFormBaseSchema>;
export type AnimalApiData = z.infer<typeof animalApiSchema>;
