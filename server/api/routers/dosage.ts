/**
 * tRPC Router for Veterinary Dosage Calculations
 * Provides endpoints for calculating medication dosages with safety validation
 */

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { medicationCatalog } from "@/db/schema";
import {
	DosageCalculator,
	type MedicationData,
} from "@/lib/calculators/dosage";
import {
	DosageConverter,
	VolumeConverter,
	WeightConverter,
} from "@/lib/calculators/unit-conversions";
import {
	batchDosageInputSchema,
	batchDosageResultSchema,
	conversionResultSchema,
	convertDosageInputSchema,
	convertVolumeInputSchema,
	convertWeightInputSchema,
	dosageCalculationInputSchema,
	dosageResultSchema,
	dosageValidationInputSchema,
	dosageValidationResultSchema,
	medicationCatalogUpdateSchema,
} from "@/lib/schemas/dosage";
import {
	createTRPCRouter,
	householdProcedure,
	ownerProcedure,
	protectedProcedure,
} from "@/server/api/trpc";

export const dosageRouter = createTRPCRouter({
	/**
	 * Calculate dosage for a specific animal and medication
	 */
	calculate: protectedProcedure
		.input(
			dosageCalculationInputSchema.omit({ medication: true }).extend({
				medicationId: z.string().uuid(),
			}),
		)
		.output(dosageResultSchema)
		.query(async ({ ctx, input }) => {
			try {
				const { medicationId, animal, route, targetUnit } = input;

				// Fetch medication from database
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

				const medicationRow = medicationRows[0]!;

				// Convert database row to MedicationData format
				const medication: MedicationData = {
					id: medicationRow.id,
					genericName: medicationRow.genericName,
					brandName: medicationRow.brandName || undefined,
					route: medicationRow.route,
					form: medicationRow.form,

					// Convert numeric strings to numbers
					dosageMinMgKg: medicationRow.dosageMinMgKg
						? Number(medicationRow.dosageMinMgKg)
						: undefined,
					dosageMaxMgKg: medicationRow.dosageMaxMgKg
						? Number(medicationRow.dosageMaxMgKg)
						: undefined,
					dosageTypicalMgKg: medicationRow.dosageTypicalMgKg
						? Number(medicationRow.dosageTypicalMgKg)
						: undefined,
					maxDailyDoseMg: medicationRow.maxDailyDoseMg
						? Number(medicationRow.maxDailyDoseMg)
						: undefined,

					// JSON fields
					speciesAdjustments: medicationRow.speciesAdjustments as any,
					routeAdjustments: medicationRow.routeAdjustments as any,
					ageAdjustments: medicationRow.ageAdjustments as any,
					breedConsiderations: medicationRow.breedConsiderations as any,

					// Medication properties
					concentrationMgMl: medicationRow.concentrationMgMl
						? Number(medicationRow.concentrationMgMl)
						: undefined,
					unitsPerTablet: medicationRow.unitsPerTablet
						? Number(medicationRow.unitsPerTablet)
						: undefined,
					unitType: medicationRow.unitType || "mg",
					typicalFrequencyHours:
						medicationRow.typicalFrequencyHours || undefined,
					maxFrequencyPerDay: medicationRow.maxFrequencyPerDay || undefined,

					// Safety information
					contraindications: medicationRow.contraindications || undefined,
					warnings: medicationRow.warnings || undefined,
				};

				// Perform the calculation
				const result = DosageCalculator.calculate({
					animal,
					medication,
					route,
					targetUnit,
				});

				return result;
			} catch (error) {
				if (error instanceof Error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: error.message,
					});
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to calculate dosage",
				});
			}
		}),

	/**
	 * Batch calculate dosages for multiple medications/animals
	 */
	batchCalculate: protectedProcedure
		.input(
			z.object({
				calculations: z
					.array(
						z.object({
							medicationId: z.string().uuid(),
							animal: dosageCalculationInputSchema.shape.animal,
							route: z.string().optional(),
							targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
						}),
					)
					.min(1)
					.max(10), // Limit batch size
			}),
		)
		.output(batchDosageResultSchema)
		.query(async ({ ctx, input }) => {
			const results: any[] = [];
			let successfulCalculations = 0;
			let failedCalculations = 0;

			for (let i = 0; i < input.calculations.length; i++) {
				try {
					const calc = input.calculations[i]!;

					// Fetch medication
					const medicationRows = await ctx.db
						.select()
						.from(medicationCatalog)
						.where(eq(medicationCatalog.id, calc.medicationId))
						.limit(1);

					if (medicationRows.length === 0) {
						throw new Error("Medication not found");
					}

					const medicationRow = medicationRows[0]!;
					const medication: MedicationData = {
						id: medicationRow.id,
						genericName: medicationRow.genericName,
						brandName: medicationRow.brandName || undefined,
						route: medicationRow.route,
						form: medicationRow.form,
						dosageMinMgKg: medicationRow.dosageMinMgKg
							? Number(medicationRow.dosageMinMgKg)
							: undefined,
						dosageMaxMgKg: medicationRow.dosageMaxMgKg
							? Number(medicationRow.dosageMaxMgKg)
							: undefined,
						dosageTypicalMgKg: medicationRow.dosageTypicalMgKg
							? Number(medicationRow.dosageTypicalMgKg)
							: undefined,
						maxDailyDoseMg: medicationRow.maxDailyDoseMg
							? Number(medicationRow.maxDailyDoseMg)
							: undefined,
						speciesAdjustments: medicationRow.speciesAdjustments as any,
						routeAdjustments: medicationRow.routeAdjustments as any,
						ageAdjustments: medicationRow.ageAdjustments as any,
						breedConsiderations: medicationRow.breedConsiderations as any,
						concentrationMgMl: medicationRow.concentrationMgMl
							? Number(medicationRow.concentrationMgMl)
							: undefined,
						unitsPerTablet: medicationRow.unitsPerTablet
							? Number(medicationRow.unitsPerTablet)
							: undefined,
						unitType: medicationRow.unitType || "mg",
						typicalFrequencyHours:
							medicationRow.typicalFrequencyHours || undefined,
						maxFrequencyPerDay: medicationRow.maxFrequencyPerDay || undefined,
						contraindications: medicationRow.contraindications || undefined,
						warnings: medicationRow.warnings || undefined,
					};

					const result = DosageCalculator.calculate({
						animal: calc.animal,
						medication,
						route: calc.route,
						targetUnit: calc.targetUnit,
					});

					results.push(result);
					successfulCalculations++;
				} catch (error) {
					results.push({
						error: error instanceof Error ? error.message : "Unknown error",
						index: i,
					});
					failedCalculations++;
				}
			}

			return {
				results,
				totalCalculations: input.calculations.length,
				successfulCalculations,
				failedCalculations,
			};
		}),

	/**
	 * Validate a proposed dosage
	 */
	validateDosage: protectedProcedure
		.input(
			dosageValidationInputSchema.omit({ medication: true }).extend({
				medicationId: z.string().uuid(),
			}),
		)
		.output(dosageValidationResultSchema)
		.query(async ({ ctx, input }) => {
			try {
				const { medicationId, animal, proposedDoseMg, route } = input;

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

				const medicationRow = medicationRows[0]!;
				const medication: MedicationData = {
					id: medicationRow.id,
					genericName: medicationRow.genericName,
					brandName: medicationRow.brandName || undefined,
					route: medicationRow.route,
					form: medicationRow.form,
					dosageMinMgKg: medicationRow.dosageMinMgKg
						? Number(medicationRow.dosageMinMgKg)
						: undefined,
					dosageMaxMgKg: medicationRow.dosageMaxMgKg
						? Number(medicationRow.dosageMaxMgKg)
						: undefined,
					dosageTypicalMgKg: medicationRow.dosageTypicalMgKg
						? Number(medicationRow.dosageTypicalMgKg)
						: undefined,
					maxDailyDoseMg: medicationRow.maxDailyDoseMg
						? Number(medicationRow.maxDailyDoseMg)
						: undefined,
					speciesAdjustments: medicationRow.speciesAdjustments as any,
					routeAdjustments: medicationRow.routeAdjustments as any,
					ageAdjustments: medicationRow.ageAdjustments as any,
					breedConsiderations: medicationRow.breedConsiderations as any,
					concentrationMgMl: medicationRow.concentrationMgMl
						? Number(medicationRow.concentrationMgMl)
						: undefined,
					unitsPerTablet: medicationRow.unitsPerTablet
						? Number(medicationRow.unitsPerTablet)
						: undefined,
					unitType: medicationRow.unitType || "mg",
					typicalFrequencyHours:
						medicationRow.typicalFrequencyHours || undefined,
					maxFrequencyPerDay: medicationRow.maxFrequencyPerDay || undefined,
					contraindications: medicationRow.contraindications || undefined,
					warnings: medicationRow.warnings || undefined,
				};

				// Calculate the recommended dosage
				const recommendedResult = DosageCalculator.calculate({
					animal,
					medication,
					route,
					targetUnit: "mg",
				});

				// Compare proposed dose to recommended range
				const proposedDosePerKg =
					proposedDoseMg /
					WeightConverter.toKg(animal.weight, animal.weightUnit);
				const isWithinRange =
					proposedDoseMg >= recommendedResult.minDose &&
					proposedDoseMg <= recommendedResult.maxDose;

				const warnings: string[] = [];
				const recommendations: string[] = [];
				let safetyLevel: "safe" | "caution" | "danger" = "safe";

				if (!isWithinRange) {
					if (proposedDoseMg < recommendedResult.minDose) {
						warnings.push("Proposed dose is below the recommended minimum");
						recommendations.push(
							"Consider increasing the dose to the recommended range",
						);
						safetyLevel = "caution";
					} else {
						warnings.push("Proposed dose exceeds the recommended maximum");
						recommendations.push(
							"Consider reducing the dose to the recommended range",
						);
						safetyLevel =
							proposedDoseMg > recommendedResult.maxDose * 1.5
								? "danger"
								: "caution";
					}
				}

				// Add medication-specific warnings
				if (recommendedResult.warnings.length > 0) {
					warnings.push(...recommendedResult.warnings);
					if (recommendedResult.safetyLevel === "danger") {
						safetyLevel = "danger";
					} else if (
						recommendedResult.safetyLevel === "caution" &&
						safetyLevel === "safe"
					) {
						safetyLevel = "caution";
					}
				}

				return {
					isValid: isWithinRange && safetyLevel !== "danger",
					safetyLevel,
					warnings,
					recommendations,
					suggestedDoseRange: {
						min: recommendedResult.minDose,
						max: recommendedResult.maxDose,
						typical: recommendedResult.dose,
						unit: "mg",
					},
				};
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error
							? error.message
							: "Failed to validate dosage",
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
				return WeightConverter.convert(
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
				return VolumeConverter.convert(
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
				return DosageConverter.convert(
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
				medicationId: z.string().uuid(),
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

				const medicationRow = medicationRows[0]!;
				const medication: MedicationData = {
					id: medicationRow.id,
					genericName: medicationRow.genericName,
					brandName: medicationRow.brandName || undefined,
					route: medicationRow.route,
					form: medicationRow.form,
					dosageMinMgKg: medicationRow.dosageMinMgKg
						? Number(medicationRow.dosageMinMgKg)
						: undefined,
					dosageMaxMgKg: medicationRow.dosageMaxMgKg
						? Number(medicationRow.dosageMaxMgKg)
						: undefined,
					dosageTypicalMgKg: medicationRow.dosageTypicalMgKg
						? Number(medicationRow.dosageTypicalMgKg)
						: undefined,
					maxDailyDoseMg: medicationRow.maxDailyDoseMg
						? Number(medicationRow.maxDailyDoseMg)
						: undefined,
					speciesAdjustments: medicationRow.speciesAdjustments as any,
					routeAdjustments: medicationRow.routeAdjustments as any,
					ageAdjustments: medicationRow.ageAdjustments as any,
					breedConsiderations: medicationRow.breedConsiderations as any,
					concentrationMgMl: medicationRow.concentrationMgMl
						? Number(medicationRow.concentrationMgMl)
						: undefined,
					unitsPerTablet: medicationRow.unitsPerTablet
						? Number(medicationRow.unitsPerTablet)
						: undefined,
					unitType: medicationRow.unitType || "mg",
					typicalFrequencyHours:
						medicationRow.typicalFrequencyHours || undefined,
					maxFrequencyPerDay: medicationRow.maxFrequencyPerDay || undefined,
					contraindications: medicationRow.contraindications || undefined,
					warnings: medicationRow.warnings || undefined,
				};

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
