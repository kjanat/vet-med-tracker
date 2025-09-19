/**
 * Dosage Format Service
 * Handles formatting and utility functions for dosage calculations
 */

import type { DosageResult, SafetyLevel } from "@/lib/schemas/dosage";

// Safety level configuration for UI display
export const SAFETY_CONFIG: Record<
  SafetyLevel,
  {
    color: string;
    bgColor: string;
    textColor: string;
    label: string;
    icon: string;
  }
> = {
  caution: {
    bgColor: "rgb(254, 252, 232)", // yellow-50
    color: "rgb(234, 179, 8)", // yellow-500
    icon: "⚠",
    label: "Use Caution",
    textColor: "rgb(161, 98, 7)", // yellow-700
  },
  danger: {
    bgColor: "rgb(254, 242, 242)", // red-50
    color: "rgb(239, 68, 68)", // red-500
    icon: "!",
    label: "Dangerous",
    textColor: "rgb(185, 28, 28)", // red-700
  },
  safe: {
    bgColor: "rgb(240, 253, 244)", // green-50
    color: "rgb(34, 197, 94)", // green-500
    icon: "✓",
    label: "Safe Dose",
    textColor: "rgb(21, 128, 61)", // green-700
  },
};

export interface SafetyIndicatorData {
  config: (typeof SAFETY_CONFIG)[SafetyLevel];
  percentage: number;
  dose: string;
  unit: string;
  minDose: string;
  maxDose: string;
  alternativeFormats: Array<{
    dose: number;
    unit: string;
    description?: string;
  }>;
}

/**
 * Get safety configuration for a given safety level
 */
export function getSafetyConfig(safetyLevel: SafetyLevel) {
  return SAFETY_CONFIG[safetyLevel];
}

/**
 * Calculate dose percentage within range
 */
export function calculateDosePercentage(
  dose: number,
  minDose: number,
  maxDose: number,
): number {
  if (maxDose <= minDose) {
    return 50; // Default to middle if range is invalid
  }

  const percentage = ((dose - minDose) / (maxDose - minDose)) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Prepare safety indicator data for UI rendering
 */
export function prepareSafetyIndicatorData(
  calculationResult: DosageResult,
): SafetyIndicatorData {
  const config = getSafetyConfig(calculationResult.safetyLevel);
  const percentage = calculateDosePercentage(
    calculationResult.dose,
    calculationResult.minDose,
    calculationResult.maxDose,
  );

  return {
    alternativeFormats: calculationResult.alternativeFormats || [],
    config,
    dose: calculationResult.dose.toString(),
    maxDose: calculationResult.maxDose.toString(),
    minDose: calculationResult.minDose.toString(),
    percentage,
    unit: calculationResult.unit,
  };
}

/**
 * Format calculation method for display
 */
export function formatCalculationMethod(method: string): string {
  return method
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format weight for display
 */
export function formatWeight(weight: number, unit: "kg" | "lbs"): string {
  return `${weight} ${unit}`;
}

/**
 * Format dose for display
 */
export function formatDose(dose: number, unit: string): string {
  return `${dose} ${unit}`;
}

/**
 * Format dose range for display
 */
export function formatDoseRange(
  minDose: number,
  maxDose: number,
  unit: string,
): string {
  return `${minDose} - ${maxDose} ${unit}`;
}

/**
 * Format medication name with brand name
 */
export function formatMedicationName(
  genericName: string,
  brandName?: string | null,
): string {
  if (!brandName) {
    return genericName;
  }
  return `${genericName} (${brandName})`;
}

/**
 * Format route for display
 */
export function formatRoute(route?: string): string {
  return route || "Not specified";
}

/**
 * Format applied adjustments for display
 */
export function formatAdjustments(adjustments: string[]): string {
  if (adjustments.length === 0) {
    return "None";
  }
  return adjustments.join(", ");
}

/**
 * Get CSS classes for safety level
 */
export function getSafetyClasses(safetyLevel: SafetyLevel): {
  border: string;
  background: string;
  text: string;
} {
  const _config = getSafetyConfig(safetyLevel);

  const classMap = {
    caution: {
      background: "bg-yellow-50 dark:bg-yellow-950",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-800 dark:text-yellow-200",
    },
    danger: {
      background: "bg-red-50 dark:bg-red-950",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-200",
    },
    safe: {
      background: "bg-green-50 dark:bg-green-950",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-200",
    },
  };

  return classMap[safetyLevel];
}

/**
 * Validate if calculation result is complete
 */
export function isValidCalculationResult(
  result: DosageResult | null,
): result is DosageResult {
  return (
    result !== null &&
    typeof result.dose === "number" &&
    typeof result.unit === "string" &&
    typeof result.safetyLevel === "string" &&
    Array.isArray(result.warnings)
  );
}

/**
 * Get urgency level for safety warnings
 */
export function getWarningUrgency(
  safetyLevel: SafetyLevel,
): "low" | "medium" | "high" {
  switch (safetyLevel) {
    case "safe":
      return "low";
    case "caution":
      return "medium";
    case "danger":
      return "high";
    default:
      return "medium";
  }
}

/**
 * Format daily dosing information
 */
export function formatDailyInfo(dailyInfo?: {
  totalDailyDose: number;
  dosesPerDay: number;
  timeBetweenDoses: string;
}): string | null {
  if (!dailyInfo) {
    return null;
  }

  return `${dailyInfo.dosesPerDay} doses per day (${dailyInfo.timeBetweenDoses} apart), total: ${dailyInfo.totalDailyDose}`;
}

/**
 * Determine if dose is within safe range
 */
export function isDoseSafe(
  dose: number,
  minDose: number,
  maxDose: number,
): boolean {
  return dose >= minDose && dose <= maxDose;
}

/**
 * Get recommended action based on safety level
 */
export function getRecommendedAction(safetyLevel: SafetyLevel): string {
  switch (safetyLevel) {
    case "safe":
      return "Dose appears safe for administration";
    case "caution":
      return "Review warnings and consider veterinary consultation";
    case "danger":
      return "Do not administer - consult veterinarian immediately";
    default:
      return "Unknown safety level - consult veterinarian";
  }
}
