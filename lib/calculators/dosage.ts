/**
 * Veterinary Dosage Calculator Engine
 * Provides accurate, species-specific dosage calculations with safety validation
 */

import { VetUnitConversions } from "./unit-conversions";

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
// biome-ignore lint/complexity/noStaticOnlyClass: Legacy API preserved for backward compatibility
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
      dose: targetDose.dose,
      unit: targetDose.unit,
      minDose: targetMinDose.dose,
      maxDose: targetMaxDose.dose,
      frequencyPerDay: medication.frequencyPerDay,
      route: route || medication.route,
      safetyLevel,
      warnings,

      // Flattened properties for backward compatibility
      calculationMethod,
      appliedAdjustments,
      weightInKg: roundedWeightInKg,
      baseDoseMgKg: baseDosage.typical,
      finalDoseMgKg: roundedFinalDoseMgKg,

      // Additional properties for test compatibility
      alternativeFormats,
      dailyInfo: pharmacokinetics,

      metadata: {
        calculationMethod,
        appliedAdjustments,
        weightInKg: roundedWeightInKg,
        baseDoseMgKg: baseDosage.typical,
        finalDoseMgKg: roundedFinalDoseMgKg,

        alternativeFormats,
        safetyMargin,
        pharmacokinetics,
      },
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
      min: medication.dosageMinMgKg || typicalDosage * 0.8,
      max: medication.dosageMaxMgKg || typicalDosage * 1.2,
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
        multiplier: 0.8,
        reason: "Species not specifically approved - reduced dosage",
      };
    }

    // Species-specific multipliers based on veterinary standards
    const speciesMultipliers: Record<
      string,
      { multiplier: number; reason: string }
    > = {
      cat: { multiplier: 0.9, reason: "Feline hepatic metabolism adjustment" },
      dog: { multiplier: 1.0, reason: "Standard canine dosage" },
      rabbit: { multiplier: 1.1, reason: "Higher metabolic rate adjustment" },
      ferret: { multiplier: 1.2, reason: "Rapid metabolism adjustment" },
      bird: { multiplier: 1.3, reason: "Avian metabolic rate adjustment" },
      reptile: { multiplier: 0.7, reason: "Lower metabolic rate adjustment" },
    };

    for (const [key, adjustment] of Object.entries(speciesMultipliers)) {
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
      // Sighthound adjustments (sensitive to anesthetics and some medications)
      const sighthounds = [
        "greyhound",
        "whippet",
        "saluki",
        "afghan",
        "borzoi",
      ];
      if (sighthounds.some((s) => normalizedBreed.includes(s))) {
        return {
          multiplier: 0.8,
          reason: "Sighthound metabolism adjustment",
        };
      }

      // Giant breed adjustments
      const giantBreeds = [
        "great dane",
        "mastiff",
        "saint bernard",
        "newfoundland",
      ];
      if (giantBreeds.some((g) => normalizedBreed.includes(g))) {
        return {
          multiplier: 0.9,
          reason: "Giant breed dose adjustment",
        };
      }

      // Toy breed adjustments
      const toyBreeds = ["chihuahua", "yorkshire", "pomeranian", "maltese"];
      if (toyBreeds.some((t) => normalizedBreed.includes(t))) {
        return {
          multiplier: 1.1,
          reason: "Toy breed metabolism adjustment",
        };
      }
    }

    return { multiplier: 1.0, reason: "No breed-specific adjustment needed" };
  }

  /**
   * Apply age-based adjustments
   */
  private static getAgeAdjustment(
    _medication: Medication,
    animal: Animal,
  ): { multiplier: number; reason: string } {
    // Convert age to days for consistent comparison
    let ageInDays: number | null = null;

    // Handle different age formats
    if (animal.age) {
      switch (animal.age.unit) {
        case "days":
          ageInDays = animal.age.value;
          break;
        case "weeks":
          ageInDays = animal.age.value * 7;
          break;
        case "months":
          ageInDays = animal.age.value * 30;
          break;
        case "years":
          ageInDays = animal.age.value * 365;
          break;
      }
    } else if (animal.ageYears) {
      ageInDays = animal.ageYears * 365;
    } else if (animal.ageMonths) {
      ageInDays = animal.ageMonths * 30;
    }

    if (ageInDays === null) {
      return { multiplier: 1.0, reason: "Age not specified" };
    }

    // Pediatric adjustments (young animals)
    if (ageInDays < 60) {
      // Under 2 months
      return {
        multiplier: 0.6,
        reason: "Pediatric dose reduction for immature metabolism",
      };
    } else if (ageInDays < 120) {
      // 2-4 months
      return {
        multiplier: 0.8,
        reason: "Juvenile dose adjustment",
      };
    }

    // Geriatric adjustments (older animals - species dependent)
    const speciesLifespan = DosageCalculator.getSpeciesLifespan(animal.species);
    const geriatricThreshold = speciesLifespan * 0.75 * 365; // 75% of lifespan

    if (ageInDays > geriatricThreshold) {
      return {
        multiplier: 0.85,
        reason: "Geriatric dose reduction for reduced metabolism",
      };
    }

    return { multiplier: 1.0, reason: "Adult dose - no age adjustment" };
  }

  /**
   * Get typical lifespan for species (in years)
   */
  private static getSpeciesLifespan(species: string): number {
    const lifespans: Record<string, number> = {
      dog: 13,
      cat: 15,
      rabbit: 8,
      ferret: 7,
      bird: 10,
      reptile: 15,
    };

    const normalizedSpecies = species.toLowerCase();
    for (const [key, lifespan] of Object.entries(lifespans)) {
      if (normalizedSpecies.includes(key)) {
        return lifespan;
      }
    }

    return 10; // Default lifespan
  }

  /**
   * Apply route-specific adjustments
   */
  private static getRouteAdjustment(
    _medication: Medication,
    route: string,
  ): { multiplier: number; reason: string } {
    const routeMultipliers: Record<
      string,
      { multiplier: number; reason: string }
    > = {
      oral: { multiplier: 1.0, reason: "Standard oral bioavailability" },
      iv: { multiplier: 0.8, reason: "100% bioavailability - reduced dose" },
      im: {
        multiplier: 0.9,
        reason: "High bioavailability - slight reduction",
      },
      sq: { multiplier: 1.0, reason: "Standard subcutaneous dosage" },
      topical: { multiplier: 1.2, reason: "Lower absorption - increased dose" },
    };

    const normalizedRoute = route.toLowerCase();
    for (const [key, adjustment] of Object.entries(routeMultipliers)) {
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
    if (weightInKg < 1) {
      warnings.push("Very small animal - consider dose reduction");
    } else if (weightInKg > 50) {
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
        dose: VetUnitConversions.Utils.roundToVetPrecision(doseML, "ml"),
        unit: "mL",
        description: "Liquid volume",
      });
    }

    // Add tablet option if units per tablet is available
    if (medication.unitsPerTablet && medication.unitsPerTablet > 0) {
      const doseTablets = doseMg / medication.unitsPerTablet;
      alternatives.push({
        dose: VetUnitConversions.Utils.roundToVetPrecision(
          doseTablets,
          "tablets",
        ),
        unit: "tablets",
        description: "Number of tablets",
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
      percentOfMax: Math.round(percentOfMax),
      bufferZone: VetUnitConversions.Utils.roundToVetPrecision(
        bufferZone,
        "mg",
      ),
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
    const hoursPerDose = 24 / frequencyPerDay;

    return {
      totalDailyDose: VetUnitConversions.Utils.roundToVetPrecision(
        totalDailyDose,
        "mg",
      ),
      dosesPerDay: frequencyPerDay,
      timeBetweenDoses: `${hoursPerDose} hours`,
    };
  }
}
