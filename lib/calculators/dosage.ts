/**
 * Veterinary Dosage Calculator Engine
 * Provides accurate, species-specific dosage calculations with safety validation
 */

import { VetUnitUtils, WeightConverter } from "./unit-conversions";

export type WeightUnit = "kg" | "lbs";
export type SafetyLevel = "safe" | "caution" | "danger";
export type CalculationMethod =
	| "standard"
	| "species_adjusted"
	| "breed_adjusted"
	| "age_adjusted"
	| "route_adjusted";

export interface MedicationData {
	id: string;
	genericName: string;
	brandName?: string;
	route: string;
	form: string;

	// Dosage ranges (mg/kg)
	dosageMinMgKg?: number;
	dosageMaxMgKg?: number;
	dosageTypicalMgKg?: number;
	maxDailyDoseMg?: number;

	// Adjustments
	speciesAdjustments?: Record<string, SpeciesAdjustment>;
	routeAdjustments?: Record<string, RouteAdjustment>;
	ageAdjustments?: Record<string, AgeAdjustment>;
	breedConsiderations?: Record<string, BreedConsideration>;

	// Medication properties
	concentrationMgMl?: number;
	unitsPerTablet?: number;
	unitType?: string;
	typicalFrequencyHours?: number;
	maxFrequencyPerDay?: number;

	// Safety information
	contraindications?: string[];
	warnings?: string;
	controlledSubstance?: boolean;
}

export interface SpeciesAdjustment {
	multiplier: number;
	maxDailyDose?: number;
	additionalWarnings?: string[];
	contraindicatedRoutes?: string[];
}

export interface RouteAdjustment {
	multiplier: number;
	additionalWarnings?: string[];
	maxFrequency?: number;
}

export interface AgeAdjustment {
	multiplier: number;
	minAgeMonths?: number;
	minAgeYears?: number;
	maxAgeYears?: number;
	additionalWarnings?: string[];
}

export interface BreedConsideration {
	multiplier?: number;
	contraindicatedRoutes?: string[];
	maxReduction?: number;
	additionalWarnings?: string[];
}

export interface AnimalInfo {
	species: string;
	breed?: string;
	weight: number;
	weightUnit: WeightUnit;
	ageYears?: number;
	ageMonths?: number;
	conditions?: string[];
}

export interface DosageCalculationInput {
	animal: AnimalInfo;
	medication: MedicationData;
	route?: string;
	targetUnit?: "mg" | "ml" | "tablets";
}

export interface DosageResult {
	// Core calculation results
	dose: number;
	unit: string;
	frequency?: string;

	// Safety ranges
	minDose: number;
	maxDose: number;
	typicalDose?: number;

	// Safety assessment
	warnings: string[];
	safetyLevel: SafetyLevel;

	// Calculation details
	calculationMethod: CalculationMethod;
	appliedAdjustments: string[];
	weightInKg: number;
	baseDoseMgKg: number;
	finalDoseMgKg: number;

	// Alternative formats
	alternativeFormats?: Array<{
		dose: number;
		unit: string;
		description: string;
	}>;

	// Daily dosing information
	dailyInfo?: {
		totalDailyDose: number;
		dosesPerDay: number;
		timeBetweenDoses: string;
	};
}

export class DosageCalculator {
	/**
	 * Calculate dosage for a specific animal and medication
	 */
	static calculate(input: DosageCalculationInput): DosageResult {
		const { animal, medication, route, targetUnit = "mg" } = input;

		// Input validation
		DosageCalculator.validateInput(input);

		// Convert weight to kg for calculations
		const weightInKg = WeightConverter.toKg(animal.weight, animal.weightUnit);

		// Get base dosage ranges
		const baseDosage = DosageCalculator.getBaseDosage(medication);
		if (!baseDosage.typical) {
			throw new Error("Medication does not have dosage information configured");
		}

		// Apply species adjustments
		const speciesAdjustment = DosageCalculator.getSpeciesAdjustment(
			medication,
			animal.species,
		);

		// Apply breed considerations
		const breedAdjustment = DosageCalculator.getBreedAdjustment(
			medication,
			animal.breed,
			animal.species,
		);

		// Apply age adjustments
		const ageAdjustment = DosageCalculator.getAgeAdjustment(medication, animal);

		// Apply route adjustments
		const routeAdjustment = DosageCalculator.getRouteAdjustment(
			medication,
			route || medication.route,
		);

		// Calculate final multiplier
		const totalMultiplier =
			speciesAdjustment.multiplier *
			breedAdjustment.multiplier *
			ageAdjustment.multiplier *
			routeAdjustment.multiplier;

		// Calculate doses
		const finalDoseMgKg = baseDosage.typical * totalMultiplier;
		const minDoseMgKg = baseDosage.min * totalMultiplier;
		const maxDoseMgKg = baseDosage.max * totalMultiplier;

		const finalDoseMg = finalDoseMgKg * weightInKg;
		const minDoseMg = minDoseMgKg * weightInKg;
		const maxDoseMg = maxDoseMgKg * weightInKg;

		// Convert to target unit
		const convertedDose = DosageCalculator.convertToTargetUnit(
			finalDoseMg,
			targetUnit,
			medication,
		);
		const convertedMin = DosageCalculator.convertToTargetUnit(
			minDoseMg,
			targetUnit,
			medication,
		);
		const convertedMax = DosageCalculator.convertToTargetUnit(
			maxDoseMg,
			targetUnit,
			medication,
		);

		// Collect warnings and adjustments
		const warnings: string[] = [];
		const appliedAdjustments: string[] = [];

		DosageCalculator.collectWarnings(warnings, medication, animal, route, {
			species: speciesAdjustment,
			breed: breedAdjustment,
			age: ageAdjustment,
			route: routeAdjustment,
		});

		DosageCalculator.collectAppliedAdjustments(appliedAdjustments, {
			species: speciesAdjustment,
			breed: breedAdjustment,
			age: ageAdjustment,
			route: routeAdjustment,
		});

		// Determine safety level
		const safetyLevel = DosageCalculator.determineSafetyLevel(
			warnings,
			totalMultiplier,
			medication,
		);

		// Calculate method used
		const calculationMethod = DosageCalculator.determineCalculationMethod({
			species: speciesAdjustment,
			breed: breedAdjustment,
			age: ageAdjustment,
			route: routeAdjustment,
		});

		// Generate alternative formats
		const alternativeFormats = DosageCalculator.generateAlternativeFormats(
			finalDoseMg,
			medication,
		);

		// Calculate daily dosing info
		const dailyInfo = DosageCalculator.calculateDailyInfo(
			convertedDose.dose,
			medication,
		);

		return {
			dose: convertedDose.dose,
			unit: convertedDose.unit,
			frequency: DosageCalculator.getFrequencyString(medication),

			minDose: convertedMin.dose,
			maxDose: convertedMax.dose,
			typicalDose: convertedDose.dose,

			warnings,
			safetyLevel,

			calculationMethod,
			appliedAdjustments,
			weightInKg: VetUnitUtils.roundToVetPrecision(weightInKg, "kg"),
			baseDoseMgKg: baseDosage.typical,
			finalDoseMgKg: VetUnitUtils.roundToVetPrecision(finalDoseMgKg, "mg"),

			alternativeFormats,
			dailyInfo,
		};
	}

	private static validateInput(input: DosageCalculationInput): void {
		const { animal, medication } = input;

		if (!animal.species || animal.species.trim() === "") {
			throw new Error("Animal species is required");
		}

		if (!animal.weight || animal.weight <= 0) {
			throw new Error("Animal weight must be greater than 0");
		}

		if (!animal.weightUnit || !["kg", "lbs"].includes(animal.weightUnit)) {
			throw new Error("Weight unit must be kg or lbs");
		}

		if (!medication.id || !medication.genericName) {
			throw new Error("Medication information is incomplete");
		}

		// Check for contraindications
		if (medication.contraindications && animal.conditions) {
			const contraindicated = medication.contraindications.some(
				(contraindication) =>
					animal.conditions?.some((condition) =>
						condition.toLowerCase().includes(contraindication.toLowerCase()),
					),
			);

			if (contraindicated) {
				throw new Error(
					"This medication is contraindicated for the animal's conditions",
				);
			}
		}
	}

	private static getBaseDosage(medication: MedicationData): {
		min: number;
		max: number;
		typical: number;
	} {
		return {
			min: medication.dosageMinMgKg || 0,
			max: medication.dosageMaxMgKg || medication.dosageTypicalMgKg || 0,
			typical: medication.dosageTypicalMgKg || 0,
		};
	}

	private static getSpeciesAdjustment(
		medication: MedicationData,
		species: string,
	): SpeciesAdjustment & { multiplier: number } {
		const speciesKey = species.toLowerCase();
		const adjustment = medication.speciesAdjustments?.[speciesKey];

		return {
			multiplier: adjustment?.multiplier || 1.0,
			...adjustment,
		};
	}

	private static getBreedAdjustment(
		medication: MedicationData,
		breed?: string,
		species?: string,
	): BreedConsideration & { multiplier: number } {
		if (!breed) return { multiplier: 1.0 };

		const breedLower = breed.toLowerCase();

		// Try exact match first
		let adjustment = medication.breedConsiderations?.[breedLower];

		// If no exact match, try partial matching for breed names
		if (!adjustment && medication.breedConsiderations) {
			for (const [key, value] of Object.entries(
				medication.breedConsiderations,
			)) {
				if (
					breedLower.includes(key.toLowerCase()) ||
					key.toLowerCase().includes(breedLower)
				) {
					adjustment = value;
					break;
				}
			}
		}

		// If we have an explicit breed consideration, use that
		if (adjustment) {
			return {
				multiplier: adjustment.multiplier || 1.0,
				...adjustment,
			};
		}

		// Otherwise, check for special genetic considerations
		const geneticMultiplier = DosageCalculator.handleGeneticConsiderations(
			breed,
			species,
			medication,
		);

		return {
			multiplier: geneticMultiplier || 1.0,
		};
	}

	private static handleGeneticConsiderations(
		breed: string,
		species?: string,
		medication?: MedicationData,
	): number | undefined {
		if (species?.toLowerCase() !== "dog") return undefined;

		const breedLower = breed.toLowerCase();

		// MDR1 gene affected breeds (sensitive to certain medications)
		const mdr1Breeds = [
			"collie",
			"border collie",
			"australian shepherd",
			"shetland sheepdog",
			"german shepherd",
			"old english sheepdog",
			"whippet",
			"silken windhound",
		];

		// Medications affected by MDR1 gene
		const mdr1SensitiveMeds = [
			"ivermectin",
			"loperamide",
			"acepromazine",
			"butorphanol",
			"cyclosporine",
			"digoxin",
			"doxorubicin",
		];

		if (
			mdr1Breeds.some((b) => breedLower.includes(b)) &&
			medication &&
			mdr1SensitiveMeds.some((m) =>
				medication.genericName.toLowerCase().includes(m),
			)
		) {
			return 0.5; // 50% dose reduction for MDR1-sensitive breeds
		}

		// Greyhounds often need dose adjustments due to metabolism differences
		if (breedLower.includes("greyhound")) {
			return 0.9; // 10% reduction for greyhounds
		}

		return undefined;
	}

	private static getAgeAdjustment(
		medication: MedicationData,
		animal: AnimalInfo,
	): AgeAdjustment & { multiplier: number } {
		// Only apply age adjustments if we have age data
		const hasAgeData =
			(animal.ageYears !== undefined && animal.ageYears > 0) ||
			(animal.ageMonths !== undefined && animal.ageMonths > 0);

		if (!hasAgeData) {
			return { multiplier: 1.0 };
		}

		const ageInMonths = (animal.ageYears || 0) * 12 + (animal.ageMonths || 0);
		const ageInYears = animal.ageYears || 0;

		// Check pediatric adjustments
		const pediatricAdj = medication.ageAdjustments?.pediatric;
		if (pediatricAdj && ageInMonths < (pediatricAdj.minAgeMonths || 6)) {
			return { ...pediatricAdj, multiplier: pediatricAdj.multiplier };
		}

		// Check geriatric adjustments
		const geriatricAdj = medication.ageAdjustments?.geriatric;
		if (geriatricAdj && ageInYears >= (geriatricAdj.minAgeYears || 7)) {
			return { ...geriatricAdj, multiplier: geriatricAdj.multiplier };
		}

		return { multiplier: 1.0 };
	}

	private static getRouteAdjustment(
		medication: MedicationData,
		route: string,
	): RouteAdjustment & { multiplier: number } {
		const adjustment = medication.routeAdjustments?.[route];

		return {
			multiplier: adjustment?.multiplier || 1.0,
			...adjustment,
		};
	}

	private static convertToTargetUnit(
		doseMg: number,
		targetUnit: string,
		medication: MedicationData,
	): { dose: number; unit: string } {
		switch (targetUnit) {
			case "mg":
				return {
					dose: VetUnitUtils.roundToVetPrecision(doseMg, "mg"),
					unit: "mg",
				};

			case "ml":
				if (
					!medication.concentrationMgMl ||
					medication.concentrationMgMl <= 0
				) {
					throw new Error(
						"Concentration (mg/mL) is required for mL calculation",
					);
				}
				return {
					dose: VetUnitUtils.roundToVetPrecision(
						doseMg / medication.concentrationMgMl,
						"ml",
					),
					unit: "mL",
				};

			case "tablets":
				if (!medication.unitsPerTablet || medication.unitsPerTablet <= 0) {
					throw new Error(
						"Units per tablet is required for tablet calculation",
					);
				}
				return {
					dose: VetUnitUtils.roundToVetPrecision(
						doseMg / medication.unitsPerTablet,
						"tablets",
					),
					unit: "tablets",
				};

			default:
				throw new Error(`Unsupported target unit: ${targetUnit}`);
		}
	}

	private static collectWarnings(
		warnings: string[],
		medication: MedicationData,
		animal: AnimalInfo,
		route?: string,
		adjustments?: any,
	): void {
		// Add medication warnings
		if (medication.warnings) {
			warnings.push(medication.warnings);
		}

		// Add adjustment-specific warnings
		if (adjustments.species.additionalWarnings) {
			warnings.push(...adjustments.species.additionalWarnings);
		}

		if (adjustments.breed.additionalWarnings) {
			warnings.push(...adjustments.breed.additionalWarnings);
		}

		if (adjustments.age.additionalWarnings) {
			warnings.push(...adjustments.age.additionalWarnings);
		}

		if (adjustments.route.additionalWarnings) {
			warnings.push(...adjustments.route.additionalWarnings);
		}

		// Check for route contraindications
		if (route && adjustments.species.contraindicatedRoutes?.includes(route)) {
			warnings.push(
				`WARNING: ${route} route is contraindicated for ${animal.species}`,
			);
		}

		if (route && adjustments.breed.contraindicatedRoutes?.includes(route)) {
			warnings.push(
				`WARNING: ${route} route may not be suitable for ${animal.breed}`,
			);
		}
	}

	private static collectAppliedAdjustments(
		appliedAdjustments: string[],
		adjustments: any,
	): void {
		if (adjustments.species.multiplier !== 1.0) {
			appliedAdjustments.push(
				`Species adjustment: ${(adjustments.species.multiplier * 100).toFixed(0)}%`,
			);
		}

		if (adjustments.breed.multiplier !== 1.0) {
			appliedAdjustments.push(
				`Breed adjustment: ${(adjustments.breed.multiplier * 100).toFixed(0)}%`,
			);
		}

		if (adjustments.age.multiplier !== 1.0) {
			appliedAdjustments.push(
				`Age adjustment: ${(adjustments.age.multiplier * 100).toFixed(0)}%`,
			);
		}

		if (adjustments.route.multiplier !== 1.0) {
			appliedAdjustments.push(
				`Route adjustment: ${(adjustments.route.multiplier * 100).toFixed(0)}%`,
			);
		}
	}

	private static determineSafetyLevel(
		warnings: string[],
		totalMultiplier: number,
		medication: MedicationData,
	): SafetyLevel {
		// Check for danger indicators
		if (
			warnings.some(
				(w) =>
					w.toLowerCase().includes("contraindicated") ||
					w.toLowerCase().includes("warning:"),
			)
		) {
			return "danger";
		}

		// Check for significant dose adjustments
		if (totalMultiplier <= 0.5 || totalMultiplier >= 2.0) {
			return "caution";
		}

		// Check for controlled substances
		if (medication.controlledSubstance) {
			return "caution";
		}

		// Check for warnings present
		if (warnings.length > 0) {
			return "caution";
		}

		return "safe";
	}

	private static determineCalculationMethod(
		adjustments: any,
	): CalculationMethod {
		if (adjustments.breed.multiplier !== 1.0) return "breed_adjusted";
		if (adjustments.age.multiplier !== 1.0) return "age_adjusted";
		if (adjustments.route.multiplier !== 1.0) return "route_adjusted";
		if (adjustments.species.multiplier !== 1.0) return "species_adjusted";
		return "standard";
	}

	private static generateAlternativeFormats(
		doseMg: number,
		medication: MedicationData,
	): Array<{ dose: number; unit: string; description: string }> {
		const alternatives: Array<{
			dose: number;
			unit: string;
			description: string;
		}> = [];

		// Add mL format if concentration is available
		if (medication.concentrationMgMl && medication.concentrationMgMl > 0) {
			const doseML = doseMg / medication.concentrationMgMl;
			alternatives.push({
				dose: VetUnitUtils.roundToVetPrecision(doseML, "ml"),
				unit: "mL",
				description: "Liquid volume",
			});
		}

		// Add tablet format if units per tablet is available
		if (medication.unitsPerTablet && medication.unitsPerTablet > 0) {
			const doseTablets = doseMg / medication.unitsPerTablet;
			alternatives.push({
				dose: VetUnitUtils.roundToVetPrecision(doseTablets, "tablets"),
				unit: "tablets",
				description: "Number of tablets",
			});
		}

		return alternatives;
	}

	private static calculateDailyInfo(
		singleDose: number,
		medication: MedicationData,
	):
		| { totalDailyDose: number; dosesPerDay: number; timeBetweenDoses: string }
		| undefined {
		if (!medication.maxFrequencyPerDay && !medication.typicalFrequencyHours) {
			return undefined;
		}

		const dosesPerDay =
			medication.maxFrequencyPerDay ||
			Math.floor(24 / (medication.typicalFrequencyHours || 24));
		const totalDailyDose = singleDose * dosesPerDay;
		const hoursBetween = 24 / dosesPerDay;

		return {
			totalDailyDose: VetUnitUtils.roundToVetPrecision(totalDailyDose, "mg"),
			dosesPerDay,
			timeBetweenDoses:
				hoursBetween >= 1
					? `${hoursBetween} hours`
					: `${Math.round(hoursBetween * 60)} minutes`,
		};
	}

	private static getFrequencyString(
		medication: MedicationData,
	): string | undefined {
		if (medication.typicalFrequencyHours) {
			if (medication.typicalFrequencyHours === 24) return "Once daily";
			if (medication.typicalFrequencyHours === 12) return "Twice daily";
			if (medication.typicalFrequencyHours === 8) return "Three times daily";
			if (medication.typicalFrequencyHours === 6) return "Four times daily";
			return `Every ${medication.typicalFrequencyHours} hours`;
		}

		if (medication.maxFrequencyPerDay) {
			if (medication.maxFrequencyPerDay === 1) return "Once daily";
			if (medication.maxFrequencyPerDay === 2) return "Twice daily";
			if (medication.maxFrequencyPerDay === 3) return "Three times daily";
			return `${medication.maxFrequencyPerDay} times daily`;
		}

		return undefined;
	}
}
