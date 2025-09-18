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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace VetUnitConversions {
  /**
   * Weight conversion utilities
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Weight {
    // Constants
    const KG_TO_LBS = 2.20462;
    const G_TO_KG = 0.001;
    const OZ_TO_LBS = 0.0625;

    /**
     * Convert any weight unit to kilograms
     */
    export function toKg(value: number, unit: WeightUnit): number {
      switch (unit) {
        case "kg":
          return value;
        case "lbs":
          return value / KG_TO_LBS;
        case "g":
          return value * G_TO_KG;
        case "oz":
          return (value * OZ_TO_LBS) / KG_TO_LBS;
        default:
          throw new Error(`Unsupported weight unit: ${unit}`);
      }
    }

    /**
     * Convert kilograms to any target weight unit
     */
    export function fromKg(
      value: number,
      targetUnit: WeightUnit,
    ): ConversionResult {
      let convertedValue: number;

      switch (targetUnit) {
        case "kg":
          convertedValue = value;
          break;
        case "lbs":
          convertedValue = value * KG_TO_LBS;
          break;
        case "g":
          convertedValue = value / G_TO_KG;
          break;
        case "oz":
          convertedValue = (value * KG_TO_LBS) / OZ_TO_LBS;
          break;
        default:
          throw new Error(`Unsupported weight unit: ${targetUnit}`);
      }

      return {
        originalUnit: "kg",
        originalValue: value,
        precision: targetUnit === "g" ? 1 : 2,
        unit: targetUnit,
        value: Number(convertedValue.toFixed(targetUnit === "g" ? 1 : 2)),
      };
    }

    /**
     * Convert between any two weight units
     */
    export function convert(
      value: number,
      fromUnit: WeightUnit,
      toUnit: WeightUnit,
    ): ConversionResult {
      const kgValue = toKg(value, fromUnit);
      const result = fromKg(kgValue, toUnit);

      return {
        ...result,
        originalUnit: fromUnit,
        originalValue: value,
      };
    }
  }

  /**
   * Volume conversion utilities
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Volume {
    // Constants
    const ML_TO_L = 0.001;
    const TSP_TO_ML = 4.92892;
    const TBSP_TO_ML = 14.7868;
    const FL_OZ_TO_ML = 29.5735;
    const CUP_TO_ML = 236.588;

    /**
     * Convert any volume unit to milliliters
     */
    export function toMl(value: number, unit: VolumeUnit): number {
      switch (unit) {
        case "ml":
          return value;
        case "L":
          return value / ML_TO_L;
        case "tsp":
          return value * TSP_TO_ML;
        case "tbsp":
          return value * TBSP_TO_ML;
        case "fl_oz":
          return value * FL_OZ_TO_ML;
        case "cup":
          return value * CUP_TO_ML;
        default:
          throw new Error(`Unsupported volume unit: ${unit}`);
      }
    }

    /**
     * Convert milliliters to any target volume unit
     */
    export function fromMl(
      value: number,
      targetUnit: VolumeUnit,
    ): ConversionResult {
      let convertedValue: number;

      switch (targetUnit) {
        case "ml":
          convertedValue = value;
          break;
        case "L":
          convertedValue = value * ML_TO_L;
          break;
        case "tsp":
          convertedValue = value / TSP_TO_ML;
          break;
        case "tbsp":
          convertedValue = value / TBSP_TO_ML;
          break;
        case "fl_oz":
          convertedValue = value / FL_OZ_TO_ML;
          break;
        case "cup":
          convertedValue = value / CUP_TO_ML;
          break;
        default:
          throw new Error(`Unsupported volume unit: ${targetUnit}`);
      }

      return {
        originalUnit: "ml",
        originalValue: value,
        precision: targetUnit === "L" ? 3 : 2,
        unit: targetUnit,
        value: Number(convertedValue.toFixed(targetUnit === "L" ? 3 : 2)),
      };
    }

    /**
     * Convert between any two volume units
     */
    export function convert(
      value: number,
      fromUnit: VolumeUnit,
      toUnit: VolumeUnit,
    ): ConversionResult {
      const mlValue = toMl(value, fromUnit);
      const result = fromMl(mlValue, toUnit);

      return {
        ...result,
        originalUnit: fromUnit,
        originalValue: value,
      };
    }
  }

  /**
   * Dosage conversion utilities
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Dosage {
    // Constants
    const MG_TO_MCG = 1000;
    const G_TO_MG = 1000;

    /**
     * Convert any dosage unit to milligrams
     */
    export function toMg(value: number, unit: DosageUnit): number {
      switch (unit) {
        case "mg":
          return value;
        case "mcg":
          return value / MG_TO_MCG;
        case "g":
          return value * G_TO_MG;
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

    /**
     * Convert milligrams to any target dosage unit
     */
    export function fromMg(
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
          convertedValue = value * MG_TO_MCG;
          break;
        case "g":
          convertedValue = value / G_TO_MG;
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
        originalUnit: "mg",
        originalValue: value,
        precision: targetUnit === "mcg" ? 0 : 3,
        unit: targetUnit,
        value: Number(convertedValue.toFixed(targetUnit === "mcg" ? 0 : 3)),
      };
    }

    /**
     * Convert between any two dosage units
     */
    export function convert(
      value: number,
      fromUnit: DosageUnit,
      toUnit: DosageUnit,
      concentrationMgMl?: number,
    ): ConversionResult {
      const mgValue = toMg(value, fromUnit);
      const result = fromMg(mgValue, toUnit, concentrationMgMl);

      return {
        ...result,
        originalUnit: fromUnit,
        originalValue: value,
      };
    }
  }

  /**
   * Common utility functions for veterinary unit conversions
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Utils {
    /**
     * Round to appropriate precision for veterinary use
     */
    export function roundToVetPrecision(value: number, unit: string): number {
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
    export function formatWithUnit(value: number, unit: string): string {
      const rounded = roundToVetPrecision(value, unit);
      return `${rounded} ${unit}`;
    }

    /**
     * Check if a unit conversion is safe (within reasonable ranges)
     */
    export function isSafeConversion(
      value: number,
      fromUnit: string,
      toUnit: string,
    ): boolean {
      // Prevent extremely large or small values that might indicate errors
      if (value <= 0 || !Number.isFinite(value)) return false;

      return (
        isWeightSafetyPassed(value, fromUnit, toUnit) &&
        isVolumeSafetyPassed(value, fromUnit, toUnit) &&
        isDosageSafetyPassed(value, fromUnit, toUnit)
      );
    }

    function isWeightSafetyPassed(
      value: number,
      fromUnit: string,
      toUnit: string,
    ): boolean {
      // Weight safety checks
      if (fromUnit === "kg" && toUnit === "g" && value > 1000) return false; // > 1000kg animal
      if (fromUnit === "g" && toUnit === "kg" && value > 1000000) return false; // > 1000kg in grams
      if (fromUnit === "lbs" && value > 2000) return false; // > 2000 lbs animal
      return true;
    }

    function isVolumeSafetyPassed(
      value: number,
      fromUnit: string,
      toUnit: string,
    ): boolean {
      // Volume safety checks
      if (fromUnit === "L" && toUnit === "ml" && value > 100) return false; // > 100L
      if (fromUnit === "ml" && value > 100000) return false; // > 100L in ml
      return true;
    }

    function isDosageSafetyPassed(
      value: number,
      fromUnit: string,
      toUnit: string,
    ): boolean {
      // Dosage safety checks
      if (fromUnit === "g" && toUnit === "mg" && value > 100) return false; // > 100g dose
      if (fromUnit === "mg" && value > 100000) return false; // > 100g in mg
      return true;
    }

    /**
     * Get common units for a unit type
     */
    export function getCommonUnits(
      unitType: "weight" | "volume" | "dosage",
    ): string[] {
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
}
