/**
 * Medical validation service for veterinary regimens
 * Handles dosage safety, drug interactions, and compliance validation
 */

export interface MedicalValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface DosageValidation {
  isWithinSafeRange: boolean;
  recommendedDosage?: string;
  warnings: string[];
}

export interface InteractionCheck {
  hasInteractions: boolean;
  interactions: {
    medication: string;
    severity: "MINOR" | "MODERATE" | "MAJOR" | "CONTRAINDICATED";
    description: string;
  }[];
}

export interface ContraindicationCheck {
  hasContraindications: boolean;
  contraindications: {
    type: "AGE" | "WEIGHT" | "SPECIES" | "CONDITION" | "ALLERGY";
    description: string;
    severity: "WARNING" | "CONTRAINDICATED";
  }[];
}

export class RegimenValidationService {
  /**
   * Validate veterinary dosage based on animal weight and medication
   */
  static validateDosage(
    medicationName: string,
    dose: string,
    animalWeight: number,
    animalSpecies: string,
  ): DosageValidation {
    const warnings: string[] = [];

    // Extract numeric dose if possible
    const doseMatch = dose.match(/([0-9.]+)\s*(mg|g|ml|units?)/i);
    if (!doseMatch) {
      warnings.push("Dose format unclear - verify dosage calculation");
      return {
        isWithinSafeRange: false,
        warnings,
      };
    }

    const doseValue = doseMatch[1] ?? "0";
    const unit = doseMatch[2] ?? "mg";
    const numericDose = parseFloat(doseValue);
    const dosagePerKg = numericDose / animalWeight;

    // Species-specific dosage ranges (example ranges - would be from veterinary database)
    const dosageRanges = RegimenValidationService.getSpeciesDosageRanges(
      medicationName,
      animalSpecies,
    );

    if (dosageRanges) {
      if (dosagePerKg < dosageRanges.min) {
        warnings.push(
          `Dose may be below therapeutic range (${dosagePerKg.toFixed(2)} ${unit}/kg)`,
        );
      } else if (dosagePerKg > dosageRanges.max) {
        warnings.push(
          `Dose exceeds recommended maximum (${dosagePerKg.toFixed(2)} ${unit}/kg)`,
        );
        return {
          isWithinSafeRange: false,
          recommendedDosage: `${(dosageRanges.max * animalWeight).toFixed(1)} ${unit}`,
          warnings,
        };
      }
    }

    return {
      isWithinSafeRange: true,
      warnings,
    };
  }

  /**
   * Check for drug interactions with existing medications
   */
  static checkDrugInteractions(
    newMedication: string,
    existingMedications: string[],
  ): InteractionCheck {
    const interactions: InteractionCheck["interactions"] = [];

    // Known interaction patterns (would be from veterinary drug database)
    const interactionDatabase =
      RegimenValidationService.getInteractionDatabase();

    existingMedications.forEach((existing) => {
      const interaction = interactionDatabase.find(
        (i) =>
          (i.drug1 === newMedication && i.drug2 === existing) ||
          (i.drug1 === existing && i.drug2 === newMedication),
      );

      if (interaction) {
        interactions.push({
          description: interaction.description,
          medication: existing,
          severity: interaction.severity,
        });
      }
    });

    return {
      hasInteractions: interactions.length > 0,
      interactions,
    };
  }

  /**
   * Check for contraindications based on animal characteristics
   */
  static checkContraindications(
    medicationName: string,
    animal: {
      species: string;
      age?: number;
      weight: number;
      conditions?: string[];
      allergies?: string[];
    },
  ): ContraindicationCheck {
    const contraindications: ContraindicationCheck["contraindications"] = [];

    // Age contraindications
    if (animal.age !== undefined) {
      const ageRestrictions = RegimenValidationService.getAgeRestrictions(
        medicationName,
        animal.species,
      );
      if (ageRestrictions && animal.age < ageRestrictions.minimumAgeMonths) {
        contraindications.push({
          description: `Not recommended for animals under ${ageRestrictions.minimumAgeMonths} months`,
          severity: "CONTRAINDICATED",
          type: "AGE",
        });
      }
    }

    // Weight contraindications
    const weightRestrictions = RegimenValidationService.getWeightRestrictions(
      medicationName,
      animal.species,
    );
    if (
      weightRestrictions &&
      animal.weight < weightRestrictions.minimumWeight
    ) {
      contraindications.push({
        description: `Not recommended for animals under ${weightRestrictions.minimumWeight}kg`,
        severity: "WARNING",
        type: "WEIGHT",
      });
    }

    // Species contraindications
    const speciesRestrictions =
      RegimenValidationService.getSpeciesRestrictions(medicationName);
    if (
      speciesRestrictions?.contraindicated.includes(
        animal.species.toLowerCase(),
      )
    ) {
      contraindications.push({
        description: `Contraindicated in ${animal.species}`,
        severity: "CONTRAINDICATED",
        type: "SPECIES",
      });
    }

    // Condition contraindications
    if (animal.conditions) {
      const conditionRestrictions =
        RegimenValidationService.getConditionRestrictions(medicationName);
      animal.conditions.forEach((condition) => {
        if (
          conditionRestrictions?.contraindicated.includes(
            condition.toLowerCase(),
          )
        ) {
          contraindications.push({
            description: `Contraindicated with ${condition}`,
            severity: "CONTRAINDICATED",
            type: "CONDITION",
          });
        }
      });
    }

    // Allergy contraindications
    if (animal.allergies) {
      animal.allergies.forEach((allergy) => {
        if (medicationName.toLowerCase().includes(allergy.toLowerCase())) {
          contraindications.push({
            description: `Patient allergic to ${allergy}`,
            severity: "CONTRAINDICATED",
            type: "ALLERGY",
          });
        }
      });
    }

    return {
      contraindications,
      hasContraindications: contraindications.length > 0,
    };
  }

  /**
   * Comprehensive validation combining all checks
   */
  static validateRegimen(
    medication: {
      name: string;
      dose: string;
      route: string;
      highRisk: boolean;
    },
    animal: {
      species: string;
      weight: number;
      age?: number;
      conditions?: string[];
      allergies?: string[];
    },
    existingMedications: string[] = [],
  ): MedicalValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let riskLevel: MedicalValidationResult["riskLevel"] = "LOW";

    // Dosage validation
    const dosageCheck = RegimenValidationService.validateDosage(
      medication.name,
      medication.dose,
      animal.weight,
      animal.species,
    );
    warnings.push(...dosageCheck.warnings);
    if (!dosageCheck.isWithinSafeRange) {
      errors.push("Dosage outside safe range");
      riskLevel = "HIGH";
    }

    // Drug interaction check
    const interactionCheck = RegimenValidationService.checkDrugInteractions(
      medication.name,
      existingMedications,
    );
    if (interactionCheck.hasInteractions) {
      interactionCheck.interactions.forEach((interaction) => {
        if (interaction.severity === "CONTRAINDICATED") {
          errors.push(
            `Contraindicated with ${interaction.medication}: ${interaction.description}`,
          );
          riskLevel = "CRITICAL";
        } else if (interaction.severity === "MAJOR") {
          warnings.push(
            `Major interaction with ${interaction.medication}: ${interaction.description}`,
          );
          if (riskLevel === "LOW") riskLevel = "HIGH";
        } else {
          warnings.push(
            `${interaction.severity} interaction with ${interaction.medication}`,
          );
          if (riskLevel === "LOW") riskLevel = "MEDIUM";
        }
      });
    }

    // Contraindication check
    const contraindicationCheck =
      RegimenValidationService.checkContraindications(medication.name, animal);
    if (contraindicationCheck.hasContraindications) {
      contraindicationCheck.contraindications.forEach((contraindication) => {
        if (contraindication.severity === "CONTRAINDICATED") {
          errors.push(contraindication.description);
          riskLevel = "CRITICAL";
        } else {
          warnings.push(contraindication.description);
          if (riskLevel === "LOW") riskLevel = "MEDIUM";
        }
      });
    }

    // High-risk medication flag
    if (medication.highRisk && riskLevel === "LOW") {
      riskLevel = "MEDIUM";
      warnings.push("High-risk medication - requires careful monitoring");
    }

    return {
      errors,
      isValid: errors.length === 0,
      riskLevel,
      warnings,
    };
  }

  // Mock database methods (would be replaced with actual veterinary database calls)
  private static getSpeciesDosageRanges(medication: string, species: string) {
    // Mock data - would come from veterinary drug database
    const ranges: Record<
      string,
      Record<string, { min: number; max: number }>
    > = {
      amoxicillin: {
        cat: { max: 22, min: 12 },
        dog: { max: 25, min: 10 }, // mg/kg
      },
      carprofen: {
        cat: { max: 0, min: 0 }, // Contraindicated
        dog: { max: 4, min: 2 },
      },
    };
    return ranges[medication.toLowerCase()]?.[species.toLowerCase()];
  }

  private static getInteractionDatabase() {
    // Mock interaction database
    return [
      {
        description: "Increased risk of gastrointestinal ulceration",
        drug1: "carprofen",
        drug2: "prednisone",
        severity: "MAJOR" as const,
      },
      {
        description: "May increase sedation effects",
        drug1: "acepromazine",
        drug2: "tramadol",
        severity: "MODERATE" as const,
      },
    ];
  }

  private static getAgeRestrictions(medication: string, species: string) {
    // Mock age restrictions
    const restrictions: Record<
      string,
      Record<string, { minimumAgeMonths: number }>
    > = {
      carprofen: {
        dog: { minimumAgeMonths: 6 },
      },
    };
    return restrictions[medication.toLowerCase()]?.[species.toLowerCase()];
  }

  private static getWeightRestrictions(medication: string, species: string) {
    // Mock weight restrictions
    const restrictions: Record<
      string,
      Record<string, { minimumWeight: number }>
    > = {
      carprofen: {
        dog: { minimumWeight: 2.0 },
      },
    };
    return restrictions[medication.toLowerCase()]?.[species.toLowerCase()];
  }

  private static getSpeciesRestrictions(medication: string) {
    // Mock species restrictions
    const restrictions: Record<string, { contraindicated: string[] }> = {
      acetaminophen: { contraindicated: ["cat"] },
      carprofen: { contraindicated: ["cat"] },
      ibuprofen: { contraindicated: ["dog", "cat"] },
    };
    return restrictions[medication.toLowerCase()];
  }

  private static getConditionRestrictions(medication: string) {
    // Mock condition restrictions
    const restrictions: Record<string, { contraindicated: string[] }> = {
      carprofen: { contraindicated: ["kidney disease", "liver disease"] },
      prednisone: { contraindicated: ["diabetes mellitus"] },
    };
    return restrictions[medication.toLowerCase()];
  }
}
