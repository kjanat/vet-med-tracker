/**
 * Zod validation schemas for dosage calculation system
 */

import { z } from "zod";

// Weight unit schema
export const weightUnitSchema = z.enum(["kg", "lbs"]);

// Safety level schema
export const safetyLevelSchema = z.enum(["safe", "caution", "danger"]);

// Calculation method schema
export const calculationMethodSchema = z.enum([
  "standard",
  "species_adjusted",
  "breed_adjusted",
  "age_adjusted",
  "route_adjusted",
]);

// Species adjustment schema
export const speciesAdjustmentSchema = z.object({
  multiplier: z.number().min(0.1).max(5.0),
  maxDailyDose: z.number().positive().optional(),
  additionalWarnings: z.array(z.string()).optional(),
  contraindicatedRoutes: z.array(z.string()).optional(),
});

// Route adjustment schema
export const routeAdjustmentSchema = z.object({
  multiplier: z.number().min(0.1).max(5.0),
  additionalWarnings: z.array(z.string()).optional(),
  maxFrequency: z.number().positive().optional(),
});

// Age adjustment schema
export const ageAdjustmentSchema = z.object({
  multiplier: z.number().min(0.1).max(2.0),
  minAgeMonths: z.number().min(0).max(60).optional(),
  minAgeYears: z.number().min(0).max(25).optional(),
  maxAgeYears: z.number().min(0).max(30).optional(),
  additionalWarnings: z.array(z.string()).optional(),
});

// Breed consideration schema
export const breedConsiderationSchema = z.object({
  multiplier: z.number().min(0.1).max(2.0).optional(),
  contraindicatedRoutes: z.array(z.string()).optional(),
  maxReduction: z.number().min(0).max(1).optional(),
  additionalWarnings: z.array(z.string()).optional(),
});

// Medication data schema for dosage calculations
export const medicationDataSchema = z.object({
  id: z.uuid(),
  genericName: z.string().min(1).max(255),
  brandName: z.string().max(255).optional(),
  route: z.string().min(1),
  form: z.string().min(1),

  // Dosage ranges (mg/kg)
  dosageMinMgKg: z.number().min(0).max(10000).optional(),
  dosageMaxMgKg: z.number().min(0).max(10000).optional(),
  dosageTypicalMgKg: z.number().min(0).max(10000).optional(),
  maxDailyDoseMg: z.number().min(0).max(100000).optional(),

  // Adjustments stored as JSON objects
  speciesAdjustments: z.record(z.string(), speciesAdjustmentSchema).optional(),
  routeAdjustments: z.record(z.string(), routeAdjustmentSchema).optional(),
  ageAdjustments: z.record(z.string(), ageAdjustmentSchema).optional(),
  breedConsiderations: z
    .record(z.string(), breedConsiderationSchema)
    .optional(),

  // Medication properties
  concentrationMgMl: z.number().positive().optional(),
  unitsPerTablet: z.number().positive().optional(),
  unitType: z.string().default("mg"),
  typicalFrequencyHours: z.number().min(1).max(168).optional(), // Max once per week
  maxFrequencyPerDay: z.number().min(1).max(24).optional(),

  // Safety information
  contraindications: z.array(z.string()).optional(),
  warnings: z.string().optional(),
});

// Animal information schema
export const animalInfoSchema = z.object({
  species: z.string().min(1).max(50),
  breed: z.string().max(100).optional(),
  weight: z.number().positive().max(2000), // Max 2000 kg/lbs for safety
  weightUnit: weightUnitSchema,
  ageYears: z.number().min(0).max(30).optional(),
  ageMonths: z.number().min(0).max(11).optional(),
  conditions: z.array(z.string()).optional(),
});

// Dosage calculation input schema
export const dosageCalculationInputSchema = z.object({
  animal: animalInfoSchema,
  medication: medicationDataSchema,
  route: z.string().optional(),
  targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
});

// Alternative format schema
export const alternativeFormatSchema = z.object({
  dose: z.number(),
  unit: z.string(),
  description: z.string(),
});

// Daily dosing information schema
export const dailyInfoSchema = z.object({
  totalDailyDose: z.number(),
  dosesPerDay: z.number().min(1).max(24),
  timeBetweenDoses: z.string(),
});

// Dosage calculation result schema
export const dosageResultSchema = z.object({
  // Core calculation results
  dose: z.number(),
  unit: z.string(),
  frequency: z.string().optional(),

  // Safety ranges
  minDose: z.number(),
  maxDose: z.number(),
  typicalDose: z.number().optional(),

  // Safety assessment
  warnings: z.array(z.string()),
  safetyLevel: safetyLevelSchema,

  // Calculation details
  calculationMethod: calculationMethodSchema,
  appliedAdjustments: z.array(z.string()),
  weightInKg: z.number(),
  baseDoseMgKg: z.number(),
  finalDoseMgKg: z.number(),

  // Alternative formats
  alternativeFormats: z.array(alternativeFormatSchema).optional(),

  // Daily dosing information
  dailyInfo: dailyInfoSchema.optional(),
});

// Unit conversion schemas
export const convertWeightInputSchema = z.object({
  value: z.number().positive(),
  fromUnit: z.enum(["kg", "lbs", "g", "oz"]),
  toUnit: z.enum(["kg", "lbs", "g", "oz"]),
});

export const convertVolumeInputSchema = z.object({
  value: z.number().positive(),
  fromUnit: z.enum(["ml", "L", "tsp", "tbsp", "fl_oz", "cup"]),
  toUnit: z.enum(["ml", "L", "tsp", "tbsp", "fl_oz", "cup"]),
});

export const convertDosageInputSchema = z.object({
  value: z.number().positive(),
  fromUnit: z.enum(["mg", "mcg", "IU", "g", "ml"]),
  toUnit: z.enum(["mg", "mcg", "IU", "g", "ml"]),
  concentrationMgMl: z.number().positive().optional(),
});

// Conversion result schema
export const conversionResultSchema = z.object({
  value: z.number(),
  unit: z.string(),
  originalValue: z.number(),
  originalUnit: z.string(),
  precision: z.number(),
});

// Medication catalog update schema for dosage fields
export const medicationCatalogUpdateSchema = z.object({
  id: z.uuid(),

  // Dosage calculation fields
  dosageMinMgKg: z.number().min(0).max(10000).nullable().optional(),
  dosageMaxMgKg: z.number().min(0).max(10000).nullable().optional(),
  dosageTypicalMgKg: z.number().min(0).max(10000).nullable().optional(),
  maxDailyDoseMg: z.number().min(0).max(100000).nullable().optional(),

  // JSON adjustments with validation
  speciesAdjustments: z
    .record(z.string(), speciesAdjustmentSchema)
    .nullable()
    .optional(),
  routeAdjustments: z
    .record(z.string(), routeAdjustmentSchema)
    .nullable()
    .optional(),
  ageAdjustments: z
    .record(z.string(), ageAdjustmentSchema)
    .nullable()
    .optional(),
  breedConsiderations: z
    .record(z.string(), breedConsiderationSchema)
    .nullable()
    .optional(),

  // Medication properties
  concentrationMgMl: z.number().positive().nullable().optional(),
  unitsPerTablet: z.number().positive().nullable().optional(),
  unitType: z.string().max(20).nullable().optional(),
  typicalFrequencyHours: z.number().min(1).max(168).nullable().optional(),
  maxFrequencyPerDay: z.number().min(1).max(24).nullable().optional(),

  // Safety arrays
  contraindications: z.array(z.string().max(255)).nullable().optional(),
});

// Batch dosage calculation schema (for multiple animals/medications)
export const batchDosageInputSchema = z.object({
  calculations: z.array(dosageCalculationInputSchema).min(1).max(20), // Limit to 20 calculations per batch
});

export const batchDosageResultSchema = z.object({
  results: z.array(
    z.union([
      dosageResultSchema,
      z.object({
        error: z.string(),
        index: z.number(),
      }),
    ]),
  ),
  totalCalculations: z.number(),
  successfulCalculations: z.number(),
  failedCalculations: z.number(),
});

// Dosage validation schema (check if a specific dose is safe)
export const dosageValidationInputSchema = z.object({
  animal: animalInfoSchema,
  medication: medicationDataSchema,
  proposedDoseMg: z.number().positive(),
  route: z.string().optional(),
});

export const dosageValidationResultSchema = z.object({
  isValid: z.boolean(),
  safetyLevel: safetyLevelSchema,
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()),
  suggestedDoseRange: z.object({
    min: z.number(),
    max: z.number(),
    typical: z.number(),
    unit: z.string(),
  }),
});

// Custom validation functions
export const validateDosageRange = (
  min?: number,
  typical?: number,
  max?: number,
): boolean => {
  if (min !== undefined && typical !== undefined && min > typical) return false;
  if (typical !== undefined && max !== undefined && typical > max) return false;
  if (min !== undefined && max !== undefined && min > max) return false;
  return true;
};

export const validateSpeciesName = (species: string): boolean => {
  const validSpecies = [
    "dog",
    "cat",
    "bird",
    "rabbit",
    "ferret",
    "guinea pig",
    "hamster",
    "rat",
    "mouse",
    "reptile",
    "fish",
    "horse",
    "pig",
    "goat",
    "sheep",
    "cow",
    "llama",
    "alpaca",
    "chicken",
    "duck",
    "goose",
    "turkey",
    "other",
  ];
  return validSpecies.some((valid) =>
    species.toLowerCase().includes(valid.toLowerCase()),
  );
};

export const validateBreedForSpecies = (
  breed: string,
  species: string,
): boolean => {
  // This would typically be validated against a comprehensive breed database
  // For now, just ensure breed is not empty if provided and species is dog/cat
  if (!breed || breed.trim() === "") return true; // Breed is optional

  const speciesLower = species.toLowerCase();
  if (speciesLower.includes("dog") || speciesLower.includes("cat")) {
    return breed.trim().length >= 2 && breed.trim().length <= 100;
  }

  return true; // Allow any breed for other species
};

// Type exports for TypeScript
export type WeightUnit = z.infer<typeof weightUnitSchema>;
export type SafetyLevel = z.infer<typeof safetyLevelSchema>;
export type CalculationMethod = z.infer<typeof calculationMethodSchema>;
export type MedicationDataInput = z.infer<typeof medicationDataSchema>;
export type AnimalInfoInput = z.infer<typeof animalInfoSchema>;
export type DosageCalculationInput = z.infer<
  typeof dosageCalculationInputSchema
>;
export type DosageResult = z.infer<typeof dosageResultSchema>;
export type ConversionResult = z.infer<typeof conversionResultSchema>;
export type BatchDosageInput = z.infer<typeof batchDosageInputSchema>;
export type BatchDosageResult = z.infer<typeof batchDosageResultSchema>;
export type DosageValidationInput = z.infer<typeof dosageValidationInputSchema>;
export type DosageValidationResult = z.infer<
  typeof dosageValidationResultSchema
>;
