/**
 * Dosage Validation Service
 * Handles input validation for dosage calculator
 */

import { z } from "zod";

// Form schema for dosage calculation
export const dosageCalculatorSchema = z.object({
  animalId: z.string().min(1, "Please select an animal"),
  customAdjustment: z.string().optional(),
  medicationId: z.string().min(1, "Please select a medication"),
  route: z.string().optional(),
  targetUnit: z.enum(["mg", "ml", "tablets"]),
  weight: z.number().positive("Weight must be positive"),
  weightUnit: z.enum(["kg", "lbs"]),
});

export type DosageCalculatorForm = z.infer<typeof dosageCalculatorSchema>;

// Routes commonly used in veterinary medicine
export const ADMINISTRATION_ROUTES = [
  { label: "Oral (PO)", value: "oral" },
  { label: "Intramuscular (IM)", value: "intramuscular" },
  { label: "Intravenous (IV)", value: "intravenous" },
  { label: "Subcutaneous (SC)", value: "subcutaneous" },
  { label: "Topical", value: "topical" },
  { label: "Rectal (PR)", value: "rectal" },
  { label: "Ophthalmic", value: "ophthalmic" },
  { label: "Otic", value: "otic" },
] as const;

/**
 * Validate dosage calculator form data
 */
export function validateForm(
  data: unknown,
):
  | { success: true; data: DosageCalculatorForm }
  | { success: false; error: z.ZodError } {
  const result = dosageCalculatorSchema.safeParse(data);

  if (result.success) {
    return { data: result.data, success: true };
  }

  return { error: result.error, success: false };
}

/**
 * Check if calculation can be performed with current form data
 */
export function canCalculate(
  animalId: string,
  medicationId: string,
  weight: number,
  animals: Array<{ id: string; species: string }>,
): boolean {
  return Boolean(
    animalId &&
      medicationId &&
      weight > 0 &&
      animals.find((a) => a.id === animalId),
  );
}

/**
 * Get default form values
 */
export function getDefaultValues(
  selectedAnimalId?: string,
): DosageCalculatorForm {
  return {
    animalId: selectedAnimalId || "",
    customAdjustment: "",
    medicationId: "",
    route: "",
    targetUnit: "mg",
    weight: 0,
    weightUnit: "kg",
  };
}

/**
 * Validate weight input
 */
export function validateWeight(
  weight: number,
  weightUnit: "kg" | "lbs",
): string[] {
  const warnings: string[] = [];

  if (weight <= 0) {
    warnings.push("Weight must be positive");
    return warnings;
  }

  // Convert to kg for validation
  const weightInKg = weightUnit === "lbs" ? weight * 0.453592 : weight;

  if (weightInKg < 0.1) {
    warnings.push("Extremely low weight - verify accuracy");
  } else if (weightInKg < 1) {
    warnings.push("Very small animal - consider dose reduction");
  } else if (weightInKg > 50) {
    warnings.push("Large animal - verify dose scaling appropriateness");
  }

  return warnings;
}

/**
 * Validate animal species for medication compatibility
 */
export function validateSpeciesCompatibility(
  animalSpecies: string,
  medicationSpecies: string[],
): string[] {
  const warnings: string[] = [];

  if (medicationSpecies.length === 0) {
    return warnings;
  }

  const isCompatible = medicationSpecies.some((species) =>
    species.toLowerCase().includes(animalSpecies.toLowerCase()),
  );

  if (!isCompatible) {
    warnings.push(
      `Not approved for ${animalSpecies} - use with veterinary guidance`,
    );
  }

  return warnings;
}
