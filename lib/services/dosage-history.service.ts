/**
 * Dosage History Service
 * Handles calculation history management with localStorage
 */

import type { SafetyLevel } from "@/lib/schemas/dosage";

// Calculation history item
export interface CalculationHistoryItem {
  id: string;
  timestamp: Date;
  animalName: string;
  medicationName: string;
  weight: number;
  weightUnit: "kg" | "lbs";
  dose: number;
  unit: string;
  safetyLevel: SafetyLevel;
  route?: string;
}

const HISTORY_STORAGE_KEY = "dosage-calculation-history";
const MAX_HISTORY_ITEMS = 20;

/**
 * Load calculation history from localStorage
 */
export function loadHistory(): CalculationHistoryItem[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return parsed.map((item: CalculationHistoryItem) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.warn("Failed to parse calculation history:", error);
    return [];
  }
}

/**
 * Save calculation history to localStorage
 */
export function saveHistory(history: CalculationHistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save calculation history:", error);
  }
}

/**
 * Add a new calculation to history
 */
export function addCalculation(
  history: CalculationHistoryItem[],
  newItem: Omit<CalculationHistoryItem, "id" | "timestamp">,
): CalculationHistoryItem[] {
  const historyItem: CalculationHistoryItem = {
    ...newItem,
    id: Date.now().toString(),
    timestamp: new Date(),
  };

  const newHistory = [historyItem, ...history.slice(0, MAX_HISTORY_ITEMS - 1)];
  saveHistory(newHistory);

  return newHistory;
}

/**
 * Create history item from calculation data
 */
export function createHistoryItem(
  animalName: string,
  medicationName: string,
  dose: number,
  unit: string,
  safetyLevel: SafetyLevel,
  weight: number,
  weightUnit: "kg" | "lbs",
  route?: string,
): Omit<CalculationHistoryItem, "id" | "timestamp"> {
  return {
    animalName,
    dose,
    medicationName,
    route,
    safetyLevel,
    unit,
    weight,
    weightUnit,
  };
}

/**
 * Clear all calculation history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear calculation history:", error);
  }
}

/**
 * Remove specific calculation from history
 */
export function removeCalculation(
  history: CalculationHistoryItem[],
  id: string,
): CalculationHistoryItem[] {
  const newHistory = history.filter((item) => item.id !== id);
  saveHistory(newHistory);
  return newHistory;
}

/**
 * Get history statistics
 */
export function getHistoryStats(history: CalculationHistoryItem[]): {
  totalCalculations: number;
  safetyLevels: Record<SafetyLevel, number>;
  mostUsedAnimals: Array<{ name: string; count: number }>;
  mostUsedMedications: Array<{ name: string; count: number }>;
} {
  const stats = {
    mostUsedAnimals: [] as Array<{ name: string; count: number }>,
    mostUsedMedications: [] as Array<{ name: string; count: number }>,
    safetyLevels: { caution: 0, danger: 0, safe: 0 } as Record<
      SafetyLevel,
      number
    >,
    totalCalculations: history.length,
  };

  // Count safety levels
  for (const item of history) {
    stats.safetyLevels[item.safetyLevel]++;
  }

  // Count animals and medications
  const animalCounts = new Map<string, number>();
  const medicationCounts = new Map<string, number>();

  for (const item of history) {
    animalCounts.set(
      item.animalName,
      (animalCounts.get(item.animalName) || 0) + 1,
    );
    medicationCounts.set(
      item.medicationName,
      (medicationCounts.get(item.medicationName) || 0) + 1,
    );
  }

  // Convert to sorted arrays
  stats.mostUsedAnimals = Array.from(animalCounts.entries())
    .map(([name, count]) => ({ count, name }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  stats.mostUsedMedications = Array.from(medicationCounts.entries())
    .map(([name, count]) => ({ count, name }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return stats;
}
