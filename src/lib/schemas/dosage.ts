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
  "basic_weight",
  "species_adjusted",
  "age_adjusted",
  "breed_adjusted",
  "complex_multi_factor",
]);

// Species adjustment schema
export const speciesAdjustmentSchema = z.object({
  additionalWarnings: z.array(z.string()).optional(),
  contraindicatedRoutes: z.array(z.string()).optional(),
  maxDailyDose: z.number().positive().optional(),
  multiplier: z.number().min(0.1).max(5.0),
});

// Route adjustment schema
export const routeAdjustmentSchema = z.object({
  additionalWarnings: z.array(z.string()).optional(),
  maxFrequency: z.number().positive().optional(),
  multiplier: z.number().min(0.1).max(5.0),
});

// Age adjustment schema
export const ageAdjustmentSchema = z.object({
  additionalWarnings: z.array(z.string()).optional(),
  maxAgeYears: z.number().min(0).max(30).optional(),
  minAgeMonths: z.number().min(0).max(60).optional(),
  minAgeYears: z.number().min(0).max(25).optional(),
  multiplier: z.number().min(0.1).max(2.0),
});

// Breed consideration schema
export const breedConsiderationSchema = z.object({
  additionalWarnings: z.array(z.string()).optional(),
  contraindicatedRoutes: z.array(z.string()).optional(),
  maxReduction: z.number().min(0).max(1).optional(),
  multiplier: z.number().min(0.1).max(2.0).optional(),
});

// Medication data schema for dosage calculations
export const medicationDataSchema = z.object({
  ageAdjustments: z.record(z.string(), ageAdjustmentSchema).optional(),
  brandName: z.string().max(255).optional(),
  breedConsiderations: z
    .record(z.string(), breedConsiderationSchema)
    .optional(),

  // Medication properties
  concentrationMgMl: z.number().positive().optional(),

  // Safety information
  contraindications: z.array(z.string()).optional(),
  dosageMaxMgKg: z.number().min(0).max(10000).optional(),

  // Dosage ranges (mg/kg)
  dosageMinMgKg: z.number().min(0).max(10000).optional(),
  dosageTypicalMgKg: z.number().min(0).max(10000).optional(),
  form: z.string().min(1),
  genericName: z.string().min(1).max(255),
  id: z.uuid(),
  maxDailyDoseMg: z.number().min(0).max(100000).optional(),
  maxFrequencyPerDay: z.number().min(1).max(24).optional(),
  route: z.string().min(1),
  routeAdjustments: z.record(z.string(), routeAdjustmentSchema).optional(),

  // Adjustments stored as JSON objects
  speciesAdjustments: z.record(z.string(), speciesAdjustmentSchema).optional(),
  typicalFrequencyHours: z.number().min(1).max(168).optional(), // Max once per week
  unitsPerTablet: z.number().positive().optional(),
  unitType: z.string().default("mg"),
  warnings: z.string().optional(),
});

// Animal information schema
export const animalInfoSchema = z.object({
  ageMonths: z.number().min(0).max(11).optional(),
  ageYears: z.number().min(0).max(30).optional(),
  breed: z.string().max(100).optional(),
  conditions: z.array(z.string()).optional(),
  species: z.string().min(1).max(50),
  weight: z.number().positive().max(2000), // Max 2000 kg/lbs for safety
  weightUnit: weightUnitSchema,
});

// Dosage calculation input schema (for direct calculation)
export const dosageCalculationInputSchema = z.object({
  animal: animalInfoSchema,
  medication: medicationDataSchema,
  route: z.string().optional(),
  targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
});

// Dosage calculation request schema (for API endpoints with medicationId)
export const dosageCalculationRequestSchema = z
  .object({
    animal: animalInfoSchema,
    medication: medicationDataSchema.optional(),
    medicationId: z.uuid().optional(),
    route: z.string().optional(),
    targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
  })
  .refine((data) => data.medicationId || data.medication, {
    message: "Either medicationId or medication must be provided",
  });

// Alternative format schema
export const alternativeFormatSchema = z.object({
  description: z.string().optional(),
  dose: z.number(),
  unit: z.string(),
});

// Daily dosing information schema
export const dailyInfoSchema = z.object({
  dosesPerDay: z.number().min(1).max(24),
  timeBetweenDoses: z.string(),
  totalDailyDose: z.number(),
});

// Dosage calculation result schema
export const dosageResultSchema = z.object({
  // Alternative formats
  alternativeFormats: z.array(alternativeFormatSchema).optional(),
  appliedAdjustments: z.array(z.string()),
  baseDoseMgKg: z.number(),

  // Calculation details
  calculationMethod: calculationMethodSchema,

  // Daily dosing information
  dailyInfo: dailyInfoSchema.optional(),
  // Core calculation results
  dose: z.number(),
  finalDoseMgKg: z.number(),
  frequency: z.string().optional(),
  maxDose: z.number(),

  // Safety ranges
  minDose: z.number(),
  safetyLevel: safetyLevelSchema,
  typicalDose: z.number().optional(),
  unit: z.string(),

  // Safety assessment
  warnings: z.array(z.string()),
  weightInKg: z.number(),
});

// Unit conversion schemas
export const convertWeightInputSchema = z.object({
  fromUnit: z.enum(["kg", "lbs", "g", "oz"]),
  toUnit: z.enum(["kg", "lbs", "g", "oz"]),
  value: z.number().positive(),
});

export const convertVolumeInputSchema = z.object({
  fromUnit: z.enum(["ml", "L", "tsp", "tbsp", "fl_oz", "cup"]),
  toUnit: z.enum(["ml", "L", "tsp", "tbsp", "fl_oz", "cup"]),
  value: z.number().positive(),
});

export const convertDosageInputSchema = z.object({
  concentrationMgMl: z.number().positive().optional(),
  fromUnit: z.enum(["mg", "mcg", "IU", "g", "ml"]),
  toUnit: z.enum(["mg", "mcg", "IU", "g", "ml"]),
  value: z.number().positive(),
});

// Conversion result schema
export const conversionResultSchema = z.object({
  originalUnit: z.string(),
  originalValue: z.number(),
  precision: z.number(),
  unit: z.string(),
  value: z.number(),
});

// Medication catalog update schema for dosage fields
export const medicationCatalogUpdateSchema = z.object({
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

  // Safety arrays
  contraindications: z.array(z.string().max(255)).nullable().optional(),
  dosageMaxMgKg: z.number().min(0).max(10000).nullable().optional(),

  // Dosage calculation fields
  dosageMinMgKg: z.number().min(0).max(10000).nullable().optional(),
  dosageTypicalMgKg: z.number().min(0).max(10000).nullable().optional(),
  id: z.uuid(),
  maxDailyDoseMg: z.number().min(0).max(100000).nullable().optional(),
  maxFrequencyPerDay: z.number().min(1).max(24).nullable().optional(),
  routeAdjustments: z
    .record(z.string(), routeAdjustmentSchema)
    .nullable()
    .optional(),

  // JSON adjustments with validation
  speciesAdjustments: z
    .record(z.string(), speciesAdjustmentSchema)
    .nullable()
    .optional(),
  typicalFrequencyHours: z.number().min(1).max(168).nullable().optional(),
  unitsPerTablet: z.number().positive().nullable().optional(),
  unitType: z.string().max(20).nullable().optional(),
});

// Batch dosage calculation schema (for multiple animals/medications)
export const batchDosageInputSchema = z.object({
  calculations: z.array(dosageCalculationInputSchema).min(1).max(20), // Limit to 20 calculations per batch
});

export const batchDosageResultSchema = z.object({
  failedCalculations: z.number(),
  results: z.array(
    z.union([
      dosageResultSchema,
      z.object({
        error: z.string(),
        index: z.number(),
      }),
    ]),
  ),
  successfulCalculations: z.number(),
  totalCalculations: z.number(),
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
  recommendations: z.array(z.string()),
  safetyLevel: safetyLevelSchema,
  suggestedDoseRange: z.object({
    max: z.number(),
    min: z.number(),
    typical: z.number(),
    unit: z.string(),
  }),
  warnings: z.array(z.string()),
});

// Custom validation functions
export const validateDosageRange = (
  min?: number,
  typical?: number,
  max?: number,
): boolean => {
  if (min !== undefined && typical !== undefined && min > typical) return false;
  if (typical !== undefined && max !== undefined && typical > max) return false;
  return !(min !== undefined && max !== undefined && min > max);
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

// Batch calculation schemas for the dosage router
export const dosageCalculationBatchInputSchema = z.object({
  calculations: z.array(dosageCalculationInputSchema).min(1).max(20), // Limit to 20 calculations per batch
});

export const dosageCalculationBatchResultSchema = z.object({
  results: z.array(
    z.object({
      animal: animalInfoSchema,
      error: z.string().optional(),
      medication: medicationDataSchema,
      result: dosageResultSchema.nullable(),
      route: z.string().optional(),
      success: z.boolean(),
      targetUnit: z.enum(["mg", "ml", "tablets"]).optional(),
    }),
  ),
});

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
export type DosageCalculationBatchInput = z.infer<
  typeof dosageCalculationBatchInputSchema
>;
export type DosageCalculationBatchResult = z.infer<
  typeof dosageCalculationBatchResultSchema
>;
export type DosageCalculationRequestInput = z.infer<
  typeof dosageCalculationRequestSchema
>;
