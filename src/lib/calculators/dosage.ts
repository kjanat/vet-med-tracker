/**
 * Veterinary Dosage Calculator Engine
 * Provides accurate, species-specific dosage calculations with safety validation
 */

import { VetUnitConversions } from "./unit-conversions.ts";

export type WeightUnit = "kg" | "lbs";
export type SafetyLevel = "safe" | "caution" | "danger";
export type CalculationMethod =
  | "basic_weight"
  | "species_adjusted"
  | "age_adjusted"
  | "breed_adjusted"
  | "complex_multi_factor";

export type TargetUnit = "mg" | "ml" | "tablets";

// Legacy aliases for backward compatibility
export type AnimalInfo = Animal;
export type MedicationData = Medication;

const DEFAULT_DOSAGE_RANGE = {
  maxMultiplier: 1.2,
  minMultiplier: 0.8,
} as const;

const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH_APPROX = 30;
const DAYS_PER_YEAR = 365;
const HOURS_PER_DAY = 24;

const AGE_THRESHOLDS_DAYS = {
  juvenile: 120, // < 4 months
  neonatal: 60, // < 2 months
} as const;

const WEIGHT_THRESHOLD_KG = {
  max: 50,
  min: 1,
} as const;

const SPECIES_LIFESPAN_YEARS: Record<string, number> = {
  bird: 10,
  cat: 15,
  dog: 13,
  ferret: 7,
  rabbit: 8,
  reptile: 15,
};
const DEFAULT_SPECIES_LIFESPAN_YEARS = 10;

const SPECIES_BASELINE_MULTIPLIERS: Record<
  string,
  { multiplier: number; reason: string }
> = {
  bird: { multiplier: 1.3, reason: "Avian metabolic rate adjustment" },
  cat: { multiplier: 0.9, reason: "Feline hepatic metabolism adjustment" },
  dog: { multiplier: 1.0, reason: "Standard canine dosage" },
  ferret: { multiplier: 1.2, reason: "Rapid metabolism adjustment" },
  rabbit: { multiplier: 1.1, reason: "Higher metabolic rate adjustment" },
  reptile: { multiplier: 0.7, reason: "Lower metabolic rate adjustment" },
};

const ROUTE_BASELINE_MULTIPLIERS: Record<
  string,
  { multiplier: number; reason: string }
> = {
  im: { multiplier: 0.9, reason: "High bioavailability - slight reduction" },
  iv: { multiplier: 0.8, reason: "100% bioavailability - reduced dose" },
  oral: { multiplier: 1.0, reason: "Standard oral bioavailability" },
  sq: { multiplier: 1.0, reason: "Standard subcutaneous dosage" },
  topical: { multiplier: 1.2, reason: "Lower absorption - increased dose" },
};

const BREED_GROUP_ADJUSTMENTS = {
  giant: {
    adjustment: {
      multiplier: 0.9,
      reason: "Giant breed dose adjustment",
    },
    breeds: ["great dane", "mastiff", "saint bernard", "newfoundland"],
  },
  sighthound: {
    adjustment: {
      multiplier: 0.8,
      reason: "Sighthound metabolism adjustment",
    },
    breeds: ["greyhound", "whippet", "saluki", "afghan", "borzoi"],
  },
  toy: {
    adjustment: {
      multiplier: 1.1,
      reason: "Toy breed metabolism adjustment",
    },
    breeds: ["chihuahua", "yorkshire", "pomeranian", "maltese"],
  },
} as const;

const AGE_MULTIPLIERS = {
  adult: { multiplier: 1.0, reason: "Adult dose - no age adjustment" },
  geriatric: {
    multiplier: 0.85,
    reason: "Geriatric dose reduction for reduced metabolism",
  },
  juvenile: {
    multiplier: 0.8,
    reason: "Juvenile dose adjustment",
  },
  neonatal: {
    multiplier: 0.6,
    reason: "Pediatric dose reduction for immature metabolism",
  },
} as const;

const UNAPPROVED_SPECIES_MULTIPLIER = 0.8;
const GERIATRIC_THRESHOLD_RATIO = 0.75;

export interface Animal {
  species: string;
  weight: number;
  weightUnit: WeightUnit;
  breed?: string;
  // Age can be specified in multiple ways for flexibility
  age?: {
    value: number;
    unit: "days" | "weeks" | "months" | "years";
  };
  ageYears?: number;
  ageMonths?: number;
  healthConditions?: string[];
  conditions?: string[]; // Alias for healthConditions
}

export interface Medication {
  id: string;
  genericName: string;
  brandName?: string | null;
  category: string;
  formulation: string;

  // Legacy compatibility properties
  form?: string; // Alias for formulation
  unitType?: string; // Unit type for calculations

  // Core dosage information (required for calculations)
  dosageMinMgKg: number | null;
  dosageMaxMgKg: number | null;
  dosageTypicalMgKg: number | null;
  maxDailyDoseMg?: number | null;

  // Concentration and unit information
  concentrationMgMl?: number | null;
  unitsPerTablet?: number | null;

  // Administration details
  frequencyPerDay: number;
  duration: string;
  route: string;

  // Legacy frequency properties for test compatibility
  typicalFrequencyHours?: number;
  maxFrequencyPerDay?: number;

  // Species and safety information
  species: string[];
  warnings?: string | null;
  sideEffects?: string | null;
  contraindications?: string | string[] | null;

  // Advanced dosage adjustments (for enhanced calculations)
  speciesAdjustments?: Record<string, number>;
  routeAdjustments?: Record<string, number>;
  ageAdjustments?: Record<string, number>;
  breedConsiderations?: Record<string, string | number>;

  // Regulatory information
  isControlledSubstance: boolean;
  prescriptionRequired: boolean;
  pregnancyCategory?: string | null;
}

export interface DosageCalculationInput {
  animal: Animal;
  medication: Medication;
  targetUnit?: TargetUnit;
  route?: string;
}

export interface DosageResult {
  dose: number;
  unit: string;
  minDose: number;
  maxDose: number;
  frequencyPerDay: number;
  route: string;
  safetyLevel: SafetyLevel;
  warnings: string[];

  // Flattened metadata for easier access (backward compatibility)
  calculationMethod: CalculationMethod;
  appliedAdjustments: string[];
  weightInKg: number;
  baseDoseMgKg: number;
  finalDoseMgKg: number;

  // Additional properties for test compatibility
  alternativeFormats?: Array<{
    dose: number;
    unit: string;
    description?: string;
  }>;

  dailyInfo?: {
    totalDailyDose: number;
    dosesPerDay: number;
    timeBetweenDoses: string;
  };

  metadata: {
    calculationMethod: CalculationMethod;
    appliedAdjustments: string[];
    weightInKg: number;
    baseDoseMgKg: number;
    finalDoseMgKg: number;

    alternativeFormats?: Array<{
      dose: number;
      unit: string;
      description?: string;
    }>;

    safetyMargin: {
      percentOfMax: number;
      bufferZone: number;
    };

    pharmacokinetics?: {
      totalDailyDose: number;
      dosesPerDay: number;
      timeBetweenDoses: string;
    };
  };
}

/**
 * Main Dosage Calculator Class
 */
export class DosageCalculator {
  /**
   * Calculate dosage for a given animal and medication
   */
  static calculate(input: DosageCalculationInput): DosageResult {
    DosageCalculator.validateInput(input);

    const { animal, medication, targetUnit = "mg", route } = input;

    // Convert weight to kg for calculations
    const weightInKg = VetUnitConversions.Weight.toKg(
      animal.weight,
      animal.weightUnit,
    );

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
    const targetDose = DosageCalculator.convertToTargetUnit(
      finalDoseMg,
      targetUnit,
      medication,
    );
    const targetMinDose = DosageCalculator.convertToTargetUnit(
      minDoseMg,
      targetUnit,
      medication,
    );
    const targetMaxDose = DosageCalculator.convertToTargetUnit(
      maxDoseMg,
      targetUnit,
      medication,
    );

    // Generate safety warnings
    const warnings = DosageCalculator.generateWarnings(
      animal,
      medication,
      finalDoseMg,
      weightInKg,
    );

    // Determine calculation method
    const calculationMethod = DosageCalculator.determineCalculationMethod([
      speciesAdjustment,
      breedAdjustment,
      ageAdjustment,
      routeAdjustment,
    ]);

    // Generate alternative formats
    const alternativeFormats = DosageCalculator.generateAlternativeFormats(
      finalDoseMg,
      medication,
    );

    // Calculate safety margin
    const safetyMargin = DosageCalculator.calculateSafetyMargin(
      finalDoseMg,
      maxDoseMg,
    );

    // Generate pharmacokinetic information
    const pharmacokinetics = DosageCalculator.generatePharmacokinetics(
      finalDoseMg,
      medication.frequencyPerDay,
    );

    const appliedAdjustments = [
      speciesAdjustment,
      breedAdjustment,
      ageAdjustment,
      routeAdjustment,
    ]
      .filter((adj) => adj.multiplier !== 1)
      .map((adj) => adj.reason);

    const roundedWeightInKg = VetUnitConversions.Utils.roundToVetPrecision(
      weightInKg,
      "kg",
    );
    const roundedFinalDoseMgKg = VetUnitConversions.Utils.roundToVetPrecision(
      finalDoseMgKg,
      "mg",
    );
    const safetyLevel = DosageCalculator.determineSafetyLevel(warnings);

    return {
      // Additional properties for test compatibility
      alternativeFormats,
      appliedAdjustments,
      baseDoseMgKg: baseDosage.typical,

      // Flattened properties for backward compatibility
      calculationMethod,
      dailyInfo: pharmacokinetics,
      dose: targetDose.dose,
      finalDoseMgKg: roundedFinalDoseMgKg,
      frequencyPerDay: medication.frequencyPerDay,
      maxDose: targetMaxDose.dose,

      metadata: {
        alternativeFormats,
        appliedAdjustments,
        baseDoseMgKg: baseDosage.typical,
        calculationMethod,
        finalDoseMgKg: roundedFinalDoseMgKg,
        pharmacokinetics,
        safetyMargin,
        weightInKg: roundedWeightInKg,
      },
      minDose: targetMinDose.dose,
      route: route || medication.route,
      safetyLevel,
      unit: targetDose.unit,
      warnings,
      weightInKg: roundedWeightInKg,
    };
  }

  /**
   * Validate calculation input
   */
  private static validateInput(input: DosageCalculationInput): void {
    const { animal, medication } = input;

    if (!animal.species || animal.species.trim() === "") {
      throw new Error("Animal species is required for dosage calculation");
    }

    if (!animal.weight || animal.weight <= 0) {
      throw new Error("Animal weight must be a positive number");
    }

    if (!["kg", "lbs"].includes(animal.weightUnit)) {
      throw new Error("Weight unit must be 'kg' or 'lbs'");
    }

    if (!medication.dosageTypicalMgKg || medication.dosageTypicalMgKg <= 0) {
      throw new Error("Medication must have valid dosage information");
    }

    if (medication.frequencyPerDay <= 0) {
      throw new Error("Medication frequency must be positive");
    }
  }

  /**
   * Get base dosage ranges from medication
   */
  private static getBaseDosage(medication: Medication) {
    const typicalDosage = medication.dosageTypicalMgKg;
    if (!typicalDosage) {
      throw new Error("Medication must have valid typical dosage");
    }

    return {
      max:
        medication.dosageMaxMgKg ||
        typicalDosage * DEFAULT_DOSAGE_RANGE.maxMultiplier,
      min:
        medication.dosageMinMgKg ||
        typicalDosage * DEFAULT_DOSAGE_RANGE.minMultiplier,
      typical: typicalDosage,
    };
  }

  /**
   * Apply species-specific adjustments
   */
  private static getSpeciesAdjustment(
    medication: Medication,
    species: string,
  ): { multiplier: number; reason: string } {
    const normalizedSpecies = species.toLowerCase();

    // Check if species is supported
    if (
      medication.species &&
      medication.species.length > 0 &&
      !medication.species.some((s) =>
        s.toLowerCase().includes(normalizedSpecies),
      )
    ) {
      return {
        multiplier: UNAPPROVED_SPECIES_MULTIPLIER,
        reason: "Species not specifically approved - reduced dosage",
      };
    }

    // Species-specific multipliers based on veterinary standards
    for (const [key, adjustment] of Object.entries(
      SPECIES_BASELINE_MULTIPLIERS,
    )) {
      if (normalizedSpecies.includes(key)) {
        return adjustment;
      }
    }

    return { multiplier: 1.0, reason: "Standard dosage" };
  }

  /**
   * Apply breed-specific adjustments
   */
  private static getBreedAdjustment(
    _medication: Medication,
    breed?: string,
    species?: string,
  ): { multiplier: number; reason: string } {
    if (!breed) {
      return { multiplier: 1.0, reason: "No breed adjustment" };
    }

    const normalizedBreed = breed.toLowerCase();
    const normalizedSpecies = species?.toLowerCase();

    // Breed-specific considerations (primarily for dogs)
    if (normalizedSpecies?.includes("dog")) {
      for (const { breeds, adjustment } of Object.values(
        BREED_GROUP_ADJUSTMENTS,
      )) {
        if (breeds.some((b) => normalizedBreed.includes(b))) {
          return adjustment;
        }
      }
    }

    return { multiplier: 1.0, reason: "No breed-specific adjustment needed" };
  }

  /**
   * Convert animal age to days for consistent comparison
   */
  private static convertAgeToDays(animal: Animal): number | null {
    if (animal.age) {
      const conversions: Record<"days" | "weeks" | "months" | "years", number> =
        // biome-ignore assist/source/useSortedKeys: just no
        {
          days: 1,
          weeks: DAYS_PER_WEEK,
          months: DAYS_PER_MONTH_APPROX,
          years: DAYS_PER_YEAR,
        };
      return animal.age.value * conversions[animal.age.unit];
    }

    if (animal.ageYears) {
      return animal.ageYears * DAYS_PER_YEAR;
    }

    if (animal.ageMonths) {
      return animal.ageMonths * DAYS_PER_MONTH_APPROX;
    }

    return null;
  }

  /**
   * Determine age category for dosage adjustments
   */
  private static determineAgeCategory(
    ageInDays: number,
    speciesLifespan: number,
  ): keyof typeof AGE_MULTIPLIERS {
    if (ageInDays < AGE_THRESHOLDS_DAYS.neonatal) {
      return "neonatal";
    }

    if (ageInDays < AGE_THRESHOLDS_DAYS.juvenile) {
      return "juvenile";
    }

    const geriatricThreshold =
      speciesLifespan * GERIATRIC_THRESHOLD_RATIO * DAYS_PER_YEAR;

    if (ageInDays > geriatricThreshold) {
      return "geriatric";
    }

    return "adult";
  }

  /**
   * Apply age-based adjustments
   */
  private static getAgeAdjustment(
    _medication: Medication,
    animal: Animal,
  ): { multiplier: number; reason: string } {
    const ageInDays = DosageCalculator.convertAgeToDays(animal);

    if (ageInDays === null) {
      return { multiplier: 1.0, reason: "Age not specified" };
    }

    const speciesLifespan = DosageCalculator.getSpeciesLifespan(animal.species);
    const category = DosageCalculator.determineAgeCategory(
      ageInDays,
      speciesLifespan,
    );

    return AGE_MULTIPLIERS[category];
  }

  /**
   * Get typical lifespan for species (in years)
   */
  private static getSpeciesLifespan(species: string): number {
    const normalizedSpecies = species.toLowerCase();
    for (const [key, lifespan] of Object.entries(SPECIES_LIFESPAN_YEARS)) {
      if (normalizedSpecies.includes(key)) {
        return lifespan;
      }
    }

    return DEFAULT_SPECIES_LIFESPAN_YEARS;
  }

  /**
   * Apply route-specific adjustments
   */
  private static getRouteAdjustment(
    _medication: Medication,
    route: string,
  ): { multiplier: number; reason: string } {
    const normalizedRoute = route.toLowerCase();
    for (const [key, adjustment] of Object.entries(
      ROUTE_BASELINE_MULTIPLIERS,
    )) {
      if (normalizedRoute.includes(key)) {
        return adjustment;
      }
    }

    return { multiplier: 1.0, reason: "Standard route adjustment" };
  }

  /**
   * Convert dose to target unit
   */
  private static convertToTargetUnit(
    doseMg: number,
    targetUnit: TargetUnit,
    medication: Medication,
  ): { dose: number; unit: string } {
    switch (targetUnit) {
      case "mg":
        return {
          dose: VetUnitConversions.Utils.roundToVetPrecision(doseMg, "mg"),
          unit: "mg",
        };

      case "ml":
        if (
          !medication.concentrationMgMl ||
          medication.concentrationMgMl <= 0
        ) {
          throw new Error(
            "Medication concentration (mg/mL) is required for mL dosing",
          );
        }
        return {
          dose: VetUnitConversions.Utils.roundToVetPrecision(
            doseMg / medication.concentrationMgMl,
            "ml",
          ),
          unit: "mL",
        };

      case "tablets":
        if (!medication.unitsPerTablet || medication.unitsPerTablet <= 0) {
          throw new Error("Units per tablet is required for tablet dosing");
        }
        return {
          dose: VetUnitConversions.Utils.roundToVetPrecision(
            doseMg / medication.unitsPerTablet,
            "tablets",
          ),
          unit: "tablets",
        };

      default:
        throw new Error(`Unsupported target unit: ${targetUnit}`);
    }
  }

  /**
   * Generate safety warnings
   */
  private static generateWarnings(
    animal: Animal,
    medication: Medication,
    doseMg: number,
    weightInKg: number,
  ): string[] {
    const warnings: string[] = [];

    // Check maximum daily dose
    if (medication.maxDailyDoseMg && doseMg > medication.maxDailyDoseMg) {
      warnings.push(
        `Dose exceeds maximum daily limit (${medication.maxDailyDoseMg}mg)`,
      );
    }

    // Check controlled substances
    if (medication.isControlledSubstance) {
      warnings.push("Controlled substance - requires DEA compliance");
    }

    // Check species compatibility
    if (
      medication.species &&
      medication.species.length > 0 &&
      !medication.species.some((s) =>
        s.toLowerCase().includes(animal.species.toLowerCase()),
      )
    ) {
      warnings.push(
        `Not approved for ${animal.species} - use with veterinary guidance`,
      );
    }

    // Add medication-specific warnings
    if (medication.warnings) {
      warnings.push(medication.warnings);
    }

    // Weight-based warnings
    if (weightInKg < WEIGHT_THRESHOLD_KG.min) {
      warnings.push("Very small animal - consider dose reduction");
    } else if (weightInKg > WEIGHT_THRESHOLD_KG.max) {
      warnings.push("Large animal - verify dose scaling appropriateness");
    }

    // Pregnancy warnings
    if (medication.pregnancyCategory && medication.pregnancyCategory !== "A") {
      warnings.push(
        `Pregnancy category ${medication.pregnancyCategory} - use with caution`,
      );
    }

    return warnings;
  }

  /**
   * Determine overall safety level
   */
  private static determineSafetyLevel(warnings: string[]): SafetyLevel {
    const dangerKeywords = ["exceeds maximum", "danger", "toxic", "overdose"];
    const cautionKeywords = ["controlled", "not approved", "caution"];

    if (
      warnings.some((w) =>
        dangerKeywords.some((k) => w.toLowerCase().includes(k)),
      )
    ) {
      return "danger";
    }

    if (
      warnings.some((w) =>
        cautionKeywords.some((k) => w.toLowerCase().includes(k)),
      )
    ) {
      return "caution";
    }

    return "safe";
  }

  /**
   * Determine calculation method based on applied adjustments
   */
  private static determineCalculationMethod(
    adjustments: Array<{ multiplier: number; reason: string }>,
  ): CalculationMethod {
    const appliedCount = adjustments.filter(
      (adj) => adj.multiplier !== 1,
    ).length;

    if (appliedCount === 0) {
      return "basic_weight";
    } else if (appliedCount === 1) {
      if (adjustments[0]?.multiplier !== 1) return "species_adjusted";
      if (adjustments[2]?.multiplier !== 1) return "age_adjusted";
      if (adjustments[1]?.multiplier !== 1) return "breed_adjusted";
    }

    return "complex_multi_factor";
  }

  /**
   * Generate alternative format options
   */
  private static generateAlternativeFormats(
    doseMg: number,
    medication: Medication,
  ): Array<{ dose: number; unit: string; description?: string }> {
    const alternatives: Array<{
      dose: number;
      unit: string;
      description?: string;
    }> = [];

    // Add mL option if concentration is available
    if (medication.concentrationMgMl && medication.concentrationMgMl > 0) {
      const doseML = doseMg / medication.concentrationMgMl;
      alternatives.push({
        description: "Liquid volume",
        dose: VetUnitConversions.Utils.roundToVetPrecision(doseML, "ml"),
        unit: "mL",
      });
    }

    // Add tablet option if units per tablet is available
    if (medication.unitsPerTablet && medication.unitsPerTablet > 0) {
      const doseTablets = doseMg / medication.unitsPerTablet;
      alternatives.push({
        description: "Number of tablets",
        dose: VetUnitConversions.Utils.roundToVetPrecision(
          doseTablets,
          "tablets",
        ),
        unit: "tablets",
      });
    }

    return alternatives;
  }

  /**
   * Calculate safety margin
   */
  private static calculateSafetyMargin(
    currentDoseMg: number,
    maxDoseMg: number,
  ): { percentOfMax: number; bufferZone: number } {
    const percentOfMax = (currentDoseMg / maxDoseMg) * 100;
    const bufferZone = maxDoseMg - currentDoseMg;

    return {
      bufferZone: VetUnitConversions.Utils.roundToVetPrecision(
        bufferZone,
        "mg",
      ),
      percentOfMax: Math.round(percentOfMax),
    };
  }

  /**
   * Generate pharmacokinetic information
   */
  private static generatePharmacokinetics(
    doseMg: number,
    frequencyPerDay: number,
  ): {
    totalDailyDose: number;
    dosesPerDay: number;
    timeBetweenDoses: string;
  } {
    const totalDailyDose = doseMg * frequencyPerDay;
    const hoursPerDose = HOURS_PER_DAY / frequencyPerDay;

    return {
      dosesPerDay: frequencyPerDay,
      timeBetweenDoses: `${hoursPerDose} hours`,
      totalDailyDose: VetUnitConversions.Utils.roundToVetPrecision(
        totalDailyDose,
        "mg",
      ),
    };
  }
}
