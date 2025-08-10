/**
 * Unit Conversion System for VetMed Tracker
 * Handles conversions between different units commonly used in veterinary medicine
 */

export type WeightUnit = "kg" | "lbs" | "g" | "oz";
export type VolumeUnit = "ml" | "L" | "tsp" | "tbsp" | "fl_oz" | "cup";
export type ConcentrationUnit =
	| "mg/ml"
	| "mg/tablet"
	| "mcg/ml"
	| "IU/ml"
	| "mg/capsule";
export type DosageUnit = "mg" | "mcg" | "IU" | "g" | "ml";

export interface ConversionResult {
	value: number;
	unit: string;
	originalValue: number;
	originalUnit: string;
	precision: number;
}

/**
 * Weight conversion functions
 */
export class WeightConverter {
	private static readonly KG_TO_LBS = 2.20462;
	private static readonly G_TO_KG = 0.001;
	private static readonly OZ_TO_LBS = 0.0625;

	static toKg(value: number, unit: WeightUnit): number {
		switch (unit) {
			case "kg":
				return value;
			case "lbs":
				return value / WeightConverter.KG_TO_LBS;
			case "g":
				return value * WeightConverter.G_TO_KG;
			case "oz":
				return (value * WeightConverter.OZ_TO_LBS) / WeightConverter.KG_TO_LBS;
			default:
				throw new Error(`Unsupported weight unit: ${unit}`);
		}
	}

	static fromKg(value: number, targetUnit: WeightUnit): ConversionResult {
		let convertedValue: number;

		switch (targetUnit) {
			case "kg":
				convertedValue = value;
				break;
			case "lbs":
				convertedValue = value * WeightConverter.KG_TO_LBS;
				break;
			case "g":
				convertedValue = value / WeightConverter.G_TO_KG;
				break;
			case "oz":
				convertedValue =
					(value * WeightConverter.KG_TO_LBS) / WeightConverter.OZ_TO_LBS;
				break;
			default:
				throw new Error(`Unsupported weight unit: ${targetUnit}`);
		}

		return {
			value: Number(convertedValue.toFixed(targetUnit === "g" ? 1 : 2)),
			unit: targetUnit,
			originalValue: value,
			originalUnit: "kg",
			precision: targetUnit === "g" ? 1 : 2,
		};
	}

	static convert(
		value: number,
		fromUnit: WeightUnit,
		toUnit: WeightUnit,
	): ConversionResult {
		const kgValue = WeightConverter.toKg(value, fromUnit);
		const result = WeightConverter.fromKg(kgValue, toUnit);

		return {
			...result,
			originalValue: value,
			originalUnit: fromUnit,
		};
	}
}

/**
 * Volume conversion functions
 */
export class VolumeConverter {
	private static readonly ML_TO_L = 0.001;
	private static readonly TSP_TO_ML = 4.92892;
	private static readonly TBSP_TO_ML = 14.7868;
	private static readonly FL_OZ_TO_ML = 29.5735;
	private static readonly CUP_TO_ML = 236.588;

	static toMl(value: number, unit: VolumeUnit): number {
		switch (unit) {
			case "ml":
				return value;
			case "L":
				return value / VolumeConverter.ML_TO_L;
			case "tsp":
				return value * VolumeConverter.TSP_TO_ML;
			case "tbsp":
				return value * VolumeConverter.TBSP_TO_ML;
			case "fl_oz":
				return value * VolumeConverter.FL_OZ_TO_ML;
			case "cup":
				return value * VolumeConverter.CUP_TO_ML;
			default:
				throw new Error(`Unsupported volume unit: ${unit}`);
		}
	}

	static fromMl(value: number, targetUnit: VolumeUnit): ConversionResult {
		let convertedValue: number;

		switch (targetUnit) {
			case "ml":
				convertedValue = value;
				break;
			case "L":
				convertedValue = value * VolumeConverter.ML_TO_L;
				break;
			case "tsp":
				convertedValue = value / VolumeConverter.TSP_TO_ML;
				break;
			case "tbsp":
				convertedValue = value / VolumeConverter.TBSP_TO_ML;
				break;
			case "fl_oz":
				convertedValue = value / VolumeConverter.FL_OZ_TO_ML;
				break;
			case "cup":
				convertedValue = value / VolumeConverter.CUP_TO_ML;
				break;
			default:
				throw new Error(`Unsupported volume unit: ${targetUnit}`);
		}

		return {
			value: Number(convertedValue.toFixed(targetUnit === "L" ? 3 : 2)),
			unit: targetUnit,
			originalValue: value,
			originalUnit: "ml",
			precision: targetUnit === "L" ? 3 : 2,
		};
	}

	static convert(
		value: number,
		fromUnit: VolumeUnit,
		toUnit: VolumeUnit,
	): ConversionResult {
		const mlValue = VolumeConverter.toMl(value, fromUnit);
		const result = VolumeConverter.fromMl(mlValue, toUnit);

		return {
			...result,
			originalValue: value,
			originalUnit: fromUnit,
		};
	}
}

/**
 * Dosage unit conversion functions
 */
export class DosageConverter {
	private static readonly MG_TO_MCG = 1000;
	private static readonly G_TO_MG = 1000;

	static toMg(value: number, unit: DosageUnit): number {
		switch (unit) {
			case "mg":
				return value;
			case "mcg":
				return value / DosageConverter.MG_TO_MCG;
			case "g":
				return value * DosageConverter.G_TO_MG;
			case "IU":
				// IU conversion depends on the specific medication
				// This would need to be handled per medication in the calculator
				throw new Error(
					"IU conversion requires medication-specific conversion factor",
				);
			case "ml":
				// mL to mg conversion requires concentration information
				throw new Error(
					"mL to mg conversion requires concentration information",
				);
			default:
				throw new Error(`Unsupported dosage unit: ${unit}`);
		}
	}

	static fromMg(
		value: number,
		targetUnit: DosageUnit,
		concentrationMgMl?: number,
	): ConversionResult {
		let convertedValue: number;

		switch (targetUnit) {
			case "mg":
				convertedValue = value;
				break;
			case "mcg":
				convertedValue = value * DosageConverter.MG_TO_MCG;
				break;
			case "g":
				convertedValue = value / DosageConverter.G_TO_MG;
				break;
			case "ml":
				if (!concentrationMgMl || concentrationMgMl <= 0) {
					throw new Error(
						"Concentration (mg/mL) is required for mL conversion",
					);
				}
				convertedValue = value / concentrationMgMl;
				break;
			case "IU":
				throw new Error(
					"IU conversion requires medication-specific conversion factor",
				);
			default:
				throw new Error(`Unsupported dosage unit: ${targetUnit}`);
		}

		return {
			value: Number(convertedValue.toFixed(targetUnit === "mcg" ? 0 : 3)),
			unit: targetUnit,
			originalValue: value,
			originalUnit: "mg",
			precision: targetUnit === "mcg" ? 0 : 3,
		};
	}

	static convert(
		value: number,
		fromUnit: DosageUnit,
		toUnit: DosageUnit,
		concentrationMgMl?: number,
	): ConversionResult {
		const mgValue = DosageConverter.toMg(value, fromUnit);
		const result = DosageConverter.fromMg(mgValue, toUnit, concentrationMgMl);

		return {
			...result,
			originalValue: value,
			originalUnit: fromUnit,
		};
	}
}

/**
 * Common veterinary unit conversion utilities
 */
export class VetUnitUtils {
	/**
	 * Round to appropriate precision for veterinary use
	 */
	static roundToVetPrecision(value: number, unit: string): number {
		switch (unit) {
			case "kg":
			case "lbs":
				return Number(value.toFixed(2));
			case "g":
				return Number(value.toFixed(1));
			case "mg":
				return Number(value.toFixed(1));
			case "mcg":
				return Number(value.toFixed(0));
			case "ml":
				return Number(value.toFixed(2));
			case "L":
				return Number(value.toFixed(3));
			default:
				return Number(value.toFixed(2));
		}
	}

	/**
	 * Format value with unit for display
	 */
	static formatWithUnit(value: number, unit: string): string {
		const rounded = VetUnitUtils.roundToVetPrecision(value, unit);
		return `${rounded} ${unit}`;
	}

	/**
	 * Check if a unit conversion is safe (within reasonable ranges)
	 */
	static isSafeConversion(
		value: number,
		fromUnit: string,
		toUnit: string,
	): boolean {
		// Prevent extremely large or small values that might indicate errors
		if (value <= 0 || !Number.isFinite(value)) return false;

		// Weight safety checks
		if (fromUnit === "kg" && toUnit === "g" && value > 1000) return false; // > 1000kg animal
		if (fromUnit === "g" && toUnit === "kg" && value > 1000000) return false; // > 1000kg in grams
		if (fromUnit === "lbs" && value > 2000) return false; // > 2000 lbs animal

		// Volume safety checks
		if (fromUnit === "L" && toUnit === "ml" && value > 100) return false; // > 100L
		if (fromUnit === "ml" && value > 100000) return false; // > 100L in ml

		// Dosage safety checks
		if (fromUnit === "g" && toUnit === "mg" && value > 100) return false; // > 100g dose
		if (fromUnit === "mg" && value > 100000) return false; // > 100g in mg

		return true;
	}

	/**
	 * Get common units for a unit type
	 */
	static getCommonUnits(unitType: "weight" | "volume" | "dosage"): string[] {
		switch (unitType) {
			case "weight":
				return ["kg", "lbs", "g"];
			case "volume":
				return ["ml", "L", "tsp", "tbsp"];
			case "dosage":
				return ["mg", "mcg", "g", "ml"];
			default:
				return [];
		}
	}
}
