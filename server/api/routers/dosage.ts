/**
 * tRPC Router for Veterinary Dosage Calculations
 * Provides endpoints for calculating medication dosages with safety validation
 */

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
// Use the database schema type for medication catalog rows
import { medicationCatalog } from "@/db/schema";
import {
  type DosageCalculationInput,
  DosageCalculator,
  type DosageResult,
} from "@/lib/calculators/dosage";
import {
  createTRPCRouter,
  ownerProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

type MedicationCatalogRow = typeof medicationCatalog.$inferSelect;

/**
 * Transform database row to application format
 * Handles PostgreSQL numeric type conversion and null values
 */
function transformMedicationRow(
  row: MedicationCatalogRow,
): import("@/lib/calculators/dosage").Medication {
  return {
    id: row.id,
    genericName: row.genericName,
    brandName: row.brandName,
    category: "medication", // Default category since not in database
    formulation: row.form, // Use form from database
    form: row.form, // Legacy compatibility

    // Core dosage information (required for calculations)
    dosageMinMgKg: row.dosageMinMgKg ? Number(row.dosageMinMgKg) : null,
    dosageMaxMgKg: row.dosageMaxMgKg ? Number(row.dosageMaxMgKg) : null,
    dosageTypicalMgKg: row.dosageTypicalMgKg
      ? Number(row.dosageTypicalMgKg)
      : null,
    maxDailyDoseMg: row.maxDailyDoseMg ? Number(row.maxDailyDoseMg) : null,

    // Concentration and unit information (not in current schema, use defaults)
    concentrationMgMl: null,
    unitsPerTablet: null,
    unitType: row.unitType || "mg",

    // Administration details
    frequencyPerDay: 1, // Default since not in database
    duration: "as needed", // Default since not in database
    route: row.route || "oral",

    // Species and safety information
    species: [], // Default empty array since not array in database
    warnings: row.warnings,
    sideEffects: null, // Not in database schema
    contraindications: row.contraindications,

    // Advanced adjustments from database JSON fields
    speciesAdjustments: row.speciesAdjustments as Record<string, unknown> as
      | Record<string, number>
      | undefined,
    routeAdjustments: row.routeAdjustments as Record<string, unknown> as
      | Record<string, number>
      | undefined,

    // Regulatory information
    isControlledSubstance: row.controlledSubstance || false,
    prescriptionRequired: true, // Default since not in database
    pregnancyCategory: null, // Not in database
  };
}

interface MedicationInputData {
  id: string;
  genericName: string;
  brandName?: string | null;
  form?: string;
  unitType?: string;
  dosageMinMgKg?: number | null;
  dosageMaxMgKg?: number | null;
  dosageTypicalMgKg?: number | null;
  maxDailyDoseMg?: number | null;
  concentrationMgMl?: number | null;
  unitsPerTablet?: number | null;
  route?: string;
  warnings?: string | null;
  contraindications?: string | string[] | null;
  speciesAdjustments?: Record<string, unknown>;
  routeAdjustments?: Record<string, unknown>;
  ageAdjustments?: Record<string, unknown>;
  breedConsiderations?: Record<string, unknown>;
}

/**
 * Transform API medication input to full calculator format
 * Fills in missing properties with sensible defaults
 */
function transformMedicationInput(
  input: MedicationInputData,
): import("@/lib/calculators/dosage").Medication {
  return {
    ...getBasicMedicationInfo(input),
    ...getDosageInformation(input),
    ...getConcentrationInfo(input),
    ...getAdministrationDetails(input),
    ...getSpeciesAndSafetyInfo(input),
    ...getAdvancedAdjustments(input),
    ...getRegulatoryInformation(),
  };
}

function getBasicMedicationInfo(input: MedicationInputData) {
  return {
    id: input.id,
    genericName: input.genericName,
    brandName: input.brandName || null,
    category: "custom" as const, // Default for user-provided medications
    formulation: input.form || "UNKNOWN",
    form: input.form,
    unitType: input.unitType || "mg",
  };
}

function getDosageInformation(input: MedicationInputData) {
  return {
    dosageMinMgKg: input.dosageMinMgKg || null,
    dosageMaxMgKg: input.dosageMaxMgKg || null,
    dosageTypicalMgKg: input.dosageTypicalMgKg || null,
    maxDailyDoseMg: input.maxDailyDoseMg || null,
  };
}

function getConcentrationInfo(input: MedicationInputData) {
  return {
    concentrationMgMl: input.concentrationMgMl || null,
    unitsPerTablet: input.unitsPerTablet || null,
  };
}

function getAdministrationDetails(input: MedicationInputData) {
  return {
    frequencyPerDay: 1, // Default
    duration: "as needed", // Default
    route: input.route || "oral",
  };
}

function getSpeciesAndSafetyInfo(input: MedicationInputData) {
  return {
    species: [], // Default
    warnings: input.warnings || null,
    sideEffects: null,
    contraindications: input.contraindications || null,
  };
}

function getAdvancedAdjustments(input: MedicationInputData) {
  return {
    speciesAdjustments: (input.speciesAdjustments || undefined) as
      | Record<string, number>
      | undefined,
    routeAdjustments: (input.routeAdjustments || undefined) as
      | Record<string, number>
      | undefined,
    ageAdjustments: (input.ageAdjustments || undefined) as
      | Record<string, number>
      | undefined,
    breedConsiderations: (input.breedConsiderations || undefined) as
      | Record<string, string | number>
      | undefined,
  };
}

function getRegulatoryInformation() {
  return {
    isControlledSubstance: false, // Default for user input
    prescriptionRequired: true, // Default
    pregnancyCategory: null,
  };
}

/**
 * Calculate recommended dosage for a medication and animal
 * Used internally for dosage calculation endpoints
 */
function _calculateRecommendedDosage(input: DosageCalculationInput): {
  dosage: DosageResult;
  safetyScore: number;
  warnings: string[];
} {
  try {
    const result = DosageCalculator.calculate(input);

    // Calculate safety score based on warnings and validation
    let safetyScore = 100;
    if (result.warnings.length > 0) {
      safetyScore -= result.warnings.length * 15;
    }
    if (result.safetyLevel === "caution") {
      safetyScore -= 20;
    } else if (result.safetyLevel === "danger") {
      safetyScore -= 40;
    }

    return {
      dosage: result,
      safetyScore: Math.max(0, safetyScore),
      warnings: result.warnings,
    };
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error ? error.message : "Dosage calculation failed",
    });
  }
}

/**
 * Get dosage breakdown with detailed safety information
 * Internal function for complex dosage calculations
 */
function _getDosageBreakdown(
  medication: import("@/lib/calculators/dosage").Medication,
  animal: { species: string; weight: number; weightUnit: string },
  targetUnit: string = "mg",
) {
  const input: DosageCalculationInput = {
    animal: {
      species: animal.species,
      weight: animal.weight,
      weightUnit: animal.weightUnit as "kg" | "lbs",
    },
    medication,
    targetUnit: targetUnit as "mg" | "ml" | "tablets",
  };

  const recommendedResult = DosageCalculator.calculate(input);

  return {
    animal: {
      species: animal.species,
      weight: animal.weight,
      weightUnit: animal.weightUnit,
    },
    medication: {
      id: medication.id,
      name: medication.genericName,
      brandName: medication.brandName,
    },
    dosage: {
      recommended: recommendedResult.dose,
      min: recommendedResult.minDose,
      max: recommendedResult.maxDose,
      typical: recommendedResult.dose,
      unit: "mg",
    },
  };
}

import { VetUnitConversions } from "@/lib/calculators/unit-conversions";
import {
  conversionResultSchema,
  convertDosageInputSchema,
  convertVolumeInputSchema,
  convertWeightInputSchema,
  dosageCalculationBatchInputSchema,
  dosageCalculationBatchResultSchema,
  dosageCalculationRequestSchema,
  dosageResultSchema,
  dosageValidationInputSchema,
  dosageValidationResultSchema,
  medicationCatalogUpdateSchema,
} from "@/lib/schemas/dosage";

export const dosageRouter = createTRPCRouter({
  /**
   * Calculate dosage for a medication and animal
   */
  calculate: protectedProcedure
    .input(dosageCalculationRequestSchema)
    .output(dosageResultSchema)
    .query(async ({ ctx, input }) => {
      try {
        let medication: import("@/lib/calculators/dosage").Medication;

        if (input.medicationId) {
          // Fetch medication from database
          const medicationRows = await ctx.db
            .select()
            .from(medicationCatalog)
            .where(eq(medicationCatalog.id, input.medicationId))
            .limit(1);

          if (medicationRows.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Medication not found",
            });
          }

          medication = transformMedicationRow(
            medicationRows[0] as MedicationCatalogRow,
          );
        } else if (input.medication) {
          medication = transformMedicationInput(input.medication);
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either medicationId or medication must be provided",
          });
        }

        return DosageCalculator.calculate({
          animal: input.animal,
          medication,
          route: input.route,
          targetUnit: input.targetUnit,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Dosage calculation failed",
        });
      }
    }),

  /**
   * Calculate dosages for multiple medications and animals
   */
  calculateBatch: protectedProcedure
    .input(dosageCalculationBatchInputSchema)
    .output(dosageCalculationBatchResultSchema)
    .mutation(async ({ input }) => {
      try {
        const { calculations } = input;
        const results = [];

        for (const calculation of calculations) {
          try {
            const transformedCalculation = {
              ...calculation,
              medication: transformMedicationInput(calculation.medication),
            };
            const result = DosageCalculator.calculate(transformedCalculation);
            results.push({
              ...calculation,
              result,
              success: true,
            });
          } catch (error) {
            results.push({
              ...calculation,
              result: null,
              success: false,
              error:
                error instanceof Error ? error.message : "Calculation failed",
            });
          }
        }

        return { results };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Batch calculation failed",
        });
      }
    }),

  /**
   * Validate dosage safety for a given calculation
   */
  validate: protectedProcedure
    .input(dosageValidationInputSchema)
    .output(dosageValidationResultSchema)
    .query(async ({ input }) => {
      try {
        const calculationInput = {
          ...input,
          medication: transformMedicationInput(input.medication),
        };
        const result = DosageCalculator.calculate(calculationInput);

        // Enhanced safety validation
        const safetyChecks = {
          withinRange: result.safetyLevel !== "danger",
          noMajorWarnings: !result.warnings.some((w) =>
            w.toLowerCase().includes("danger"),
          ),
          speciesAppropriate: result.warnings.length === 0,
          doseReasonable: result.dose > 0 && result.dose < 10000, // Reasonable dose range
        };

        const overallSafety =
          Object.values(safetyChecks).filter(Boolean).length /
          Object.values(safetyChecks).length;

        return {
          isValid: overallSafety >= 0.75,
          safetyLevel: result.safetyLevel,
          warnings: result.warnings,
          recommendations:
            result.warnings.length > 0
              ? ["Follow veterinarian guidance", "Monitor for side effects"]
              : [],
          suggestedDoseRange: {
            min: result.minDose,
            max: result.maxDose,
            typical: result.dose,
            unit: result.unit,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Validation failed",
        });
      }
    }),

  /**
   * Get dosage recommendations with detailed breakdown
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        medicationId: z.uuid(),
        animalId: z.uuid(),
        route: z.string().optional(),
        targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
      }),
    )
    .query(async ({ input }) => {
      try {
        // This would fetch medication and animal data from database
        // For now, return a structured response showing the expected format

        return {
          success: true,
          medicationId: input.medicationId,
          animalId: input.animalId,
          recommendations: [],
          safetyProfile: {
            overallSafety: "safe",
            warnings: [],
            contraindications: [],
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get recommendations",
        });
      }
    }),

  /**
   * Convert weight between units
   */
  convertWeight: protectedProcedure
    .input(convertWeightInputSchema)
    .output(conversionResultSchema)
    .query(async ({ input }) => {
      try {
        return VetUnitConversions.Weight.convert(
          input.value,
          input.fromUnit,
          input.toUnit,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Weight conversion failed",
        });
      }
    }),

  /**
   * Convert volume between units
   */
  convertVolume: protectedProcedure
    .input(convertVolumeInputSchema)
    .output(conversionResultSchema)
    .query(async ({ input }) => {
      try {
        return VetUnitConversions.Volume.convert(
          input.value,
          input.fromUnit,
          input.toUnit,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Volume conversion failed",
        });
      }
    }),

  /**
   * Convert dosage between units
   */
  convertDosage: protectedProcedure
    .input(convertDosageInputSchema)
    .output(conversionResultSchema)
    .query(async ({ input }) => {
      try {
        return VetUnitConversions.Dosage.convert(
          input.value,
          input.fromUnit,
          input.toUnit,
          input.concentrationMgMl,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Dosage conversion failed",
        });
      }
    }),

  /**
   * Update medication catalog with dosage information (owner only)
   */
  updateMedicationDosage: ownerProcedure
    .input(medicationCatalogUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updates } = input;

        // Verify medication exists
        const existingMedication = await ctx.db
          .select({ id: medicationCatalog.id })
          .from(medicationCatalog)
          .where(eq(medicationCatalog.id, id))
          .limit(1);

        if (existingMedication.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Medication not found",
          });
        }

        // Convert numeric fields to strings for database storage
        const {
          dosageMinMgKg,
          dosageMaxMgKg,
          dosageTypicalMgKg,
          maxDailyDoseMg,
          concentrationMgMl,
          unitsPerTablet,
          ...otherUpdates
        } = updates;

        const dbUpdates = {
          ...otherUpdates,
          // Convert number fields to strings for PostgreSQL numeric type
          ...(dosageMinMgKg !== undefined && {
            dosageMinMgKg: dosageMinMgKg?.toString(),
          }),
          ...(dosageMaxMgKg !== undefined && {
            dosageMaxMgKg: dosageMaxMgKg?.toString(),
          }),
          ...(dosageTypicalMgKg !== undefined && {
            dosageTypicalMgKg: dosageTypicalMgKg?.toString(),
          }),
          ...(maxDailyDoseMg !== undefined && {
            maxDailyDoseMg: maxDailyDoseMg?.toString(),
          }),
          ...(concentrationMgMl !== undefined && {
            concentrationMgMl: concentrationMgMl?.toString(),
          }),
          ...(unitsPerTablet !== undefined && {
            unitsPerTablet: unitsPerTablet?.toString(),
          }),
          updatedAt: new Date().toISOString(),
        };

        // Update the medication
        const [updatedMedication] = await ctx.db
          .update(medicationCatalog)
          .set(dbUpdates)
          .where(eq(medicationCatalog.id, id))
          .returning();

        return updatedMedication;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update medication dosage information",
        });
      }
    }),

  /**
   * Get common dosage calculations for a medication
   */
  getCommonDosages: protectedProcedure
    .input(
      z.object({
        medicationId: z.uuid(),
        species: z.string(),
        weightRanges: z
          .array(
            z.object({
              min: z.number().positive(),
              max: z.number().positive(),
              unit: z.enum(["kg", "lbs"]),
            }),
          )
          .max(10), // Limit weight ranges
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { medicationId, species, weightRanges } = input;

        // Fetch medication
        const medicationRows = await ctx.db
          .select()
          .from(medicationCatalog)
          .where(eq(medicationCatalog.id, medicationId))
          .limit(1);

        if (medicationRows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Medication not found",
          });
        }

        const medicationRow = medicationRows[0] as MedicationCatalogRow;
        const medication = transformMedicationRow(medicationRow);

        const results = [];

        for (const weightRange of weightRanges) {
          const midWeight = (weightRange.min + weightRange.max) / 2;

          try {
            const result = DosageCalculator.calculate({
              animal: {
                species,
                weight: midWeight,
                weightUnit: weightRange.unit,
              },
              medication,
              targetUnit: "mg",
            });

            results.push({
              weightRange: `${weightRange.min}-${weightRange.max} ${weightRange.unit}`,
              dosage: result.dose,
              unit: result.unit,
              minDose: result.minDose,
              maxDose: result.maxDose,
              safetyLevel: result.safetyLevel,
              warnings: result.warnings,
            });
          } catch (error) {
            results.push({
              weightRange: `${weightRange.min}-${weightRange.max} ${weightRange.unit}`,
              error:
                error instanceof Error ? error.message : "Calculation failed",
            });
          }
        }

        return {
          medication: {
            id: medication.id,
            genericName: medication.genericName,
            brandName: medication.brandName,
          },
          species,
          dosageCalculations: results,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate common dosages",
        });
      }
    }),
});
