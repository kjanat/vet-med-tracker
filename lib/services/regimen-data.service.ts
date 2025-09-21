/**
 * Regimen Data Service
 *
 * Handles data transformations, API operations, and data management for regimens.
 * Provides a clean interface between tRPC queries and UI components.
 */

// Type for regimen data from tRPC - matches actual schema
export type RegimenWithDetails = {
  regimen: {
    id: string;
    animalId: string;
    medicationId: string | null;
    name: string | null;
    instructions: string | null;
    scheduleType: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
    timesLocal: string[] | null;
    intervalHours: number | null;
    startDate: Date;
    endDate: Date | null;
    prnReason: string | null;
    maxDailyDoses: number | null;
    cutoffMinutes: number;
    highRisk: boolean;
    requiresCoSign: boolean;
    active: boolean;
    pausedAt: Date | null;
    pauseReason: string | null;
    dose: string | null;
    route: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  };
  animal: {
    id: string;
    householdId: string;
    name: string;
    species: string;
    breed: string | null;
    sex: string | null;
    neutered: boolean;
    dob: string | null;
    weightKg: string | null;
    microchipId: string | null;
    color: string | null;
    photoUrl: string | null;
    timezone: string;
    vetName: string | null;
    vetPhone: string | null;
    vetEmail: string | null;
    clinicName: string | null;
    allergies: string[] | null;
    conditions: string[] | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  };
  medication: {
    id: string;
    genericName: string;
    brandName: string | null;
    strength: string | null;
    route:
      | "ORAL"
      | "SC"
      | "IM"
      | "IV"
      | "TOPICAL"
      | "OTIC"
      | "OPHTHALMIC"
      | "INHALED"
      | "RECTAL"
      | "OTHER";
    form:
      | "TABLET"
      | "CAPSULE"
      | "LIQUID"
      | "INJECTION"
      | "CREAM"
      | "OINTMENT"
      | "DROPS"
      | "SPRAY"
      | "POWDER"
      | "PATCH"
      | "OTHER";
    controlledSubstance: boolean;
    commonDosing: string | null;
    warnings: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

// Interface for display with validation support
export interface Regimen {
  id: string;
  animalId: string;
  animalName: string;
  medicationName: string;
  medicationId: string | null;
  route: string;
  form: string;
  strength?: string;
  scheduleType: "FIXED" | "PRN";
  timesLocal?: string[];
  startDate?: Date;
  endDate?: Date;
  cutoffMins: number;
  highRisk: boolean;
  isActive: boolean;
  createdAt: Date;
  status: "active" | "ended" | "paused";
  validationWarnings?: string[]; // Medical validation warnings
}

// Type for regimen update input based on tRPC schema
export type RegimenUpdateInput = {
  id: string;
  householdId: string;
  name?: string;
  instructions?: string;
  scheduleType?: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
  timesLocal?: string[];
  intervalHours?: number;
  startDate?: string;
  endDate?: string;
  prnReason?: string;
  maxDailyDoses?: number;
  cutoffMinutes?: number;
  highRisk?: boolean;
  requiresCoSign?: boolean;
  dose?: string;
  route?: string;
};

// Type for regimen create input based on tRPC schema
export type RegimenCreateInput = {
  householdId: string;
  animalId: string;
  medicationId?: string;
  scheduleType: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
  startDate: string;
  name?: string;
  instructions?: string;
  timesLocal?: string[];
  intervalHours?: number;
  endDate?: string;
  prnReason?: string;
  maxDailyDoses?: number;
  cutoffMinutes?: number;
  highRisk?: boolean;
  requiresCoSign?: boolean;
  dose?: string;
  route?: string;
};

export class RegimenDataService {
  /**
   * Transform tRPC data to display format with medical validation
   */
  static transformRegimenData(
    data: RegimenWithDetails[],
    validationService?: { validate: (regimen: unknown) => unknown },
  ): Regimen[] {
    return data.map((item) =>
      RegimenDataService.transformSingleRegimen(item, validationService),
    );
  }

  private static transformSingleRegimen(
    item: RegimenWithDetails,
    validationService?: { validate: (regimen: unknown) => unknown },
  ): Regimen {
    const { regimen, animal, medication } = item;
    const now = new Date();

    const status = RegimenDataService.calculateRegimenStatus(regimen, now);
    const medicationName = RegimenDataService.getMedicationName(
      regimen,
      medication,
    );
    const validationWarnings = RegimenDataService.getValidationWarnings(
      status,
      animal,
      regimen,
      medication,
      medicationName,
      validationService,
      now,
    );

    return {
      animalId: animal.id,
      animalName: animal.name,
      createdAt: regimen.createdAt,
      cutoffMins: regimen.cutoffMinutes,
      endDate: regimen.endDate || undefined,
      form: medication?.form || "TABLET",
      highRisk: regimen.highRisk,
      id: regimen.id,
      isActive: status === "active",
      medicationId: regimen.medicationId,
      medicationName,
      route: regimen.route || medication?.route || "ORAL",
      scheduleType: regimen.scheduleType as "FIXED" | "PRN",
      startDate: regimen.startDate,
      status,
      strength: medication?.strength || undefined,
      timesLocal: (regimen.timesLocal as string[] | undefined) || undefined,
      validationWarnings,
    };
  }

  private static calculateRegimenStatus(
    regimen: RegimenWithDetails["regimen"],
    now: Date,
  ): "active" | "ended" | "paused" {
    if (!regimen.active || regimen.pausedAt) {
      return "paused";
    }
    const endDate =
      regimen.endDate instanceof Date
        ? regimen.endDate
        : regimen.endDate
          ? new Date(regimen.endDate)
          : null;

    if (endDate && !Number.isNaN(endDate.getTime()) && endDate < now) {
      return "ended";
    }
    return "active";
  }

  private static getMedicationName(
    regimen: RegimenWithDetails["regimen"],
    medication: RegimenWithDetails["medication"],
  ): string {
    return (
      medication?.genericName ||
      medication?.brandName ||
      regimen.name ||
      "Unknown Medication"
    );
  }

  private static getValidationWarnings(
    status: "active" | "ended" | "paused",
    animal: RegimenWithDetails["animal"],
    regimen: RegimenWithDetails["regimen"],
    medication: RegimenWithDetails["medication"],
    medicationName: string,
    validationService: { validate: (regimen: unknown) => unknown } | undefined,
    now: Date,
  ): string[] {
    if (
      status !== "active" ||
      !animal.weightKg ||
      !regimen.dose ||
      !validationService
    ) {
      return [];
    }

    const validation = validationService.validate({
      age: animal.dob
        ? Math.floor(
            (now.getTime() - new Date(animal.dob).getTime()) /
              (1000 * 60 * 60 * 24 * 30),
          )
        : undefined,
      allergies: animal.allergies || undefined,
      conditions: animal.conditions || undefined,
      dose: regimen.dose,
      highRisk: regimen.highRisk,
      name: medicationName,
      route: regimen.route || medication?.route || "ORAL",
      species: animal.species,
      weight: parseFloat(animal.weightKg),
    });

    return (validation as { warnings: string[] }).warnings || [];
  }

  /**
   * Filter regimens by criteria
   */
  static filterRegimens(
    regimens: Regimen[],
    criteria: {
      animalId?: string;
      activeOnly?: boolean;
      excludeEnded?: boolean;
    },
  ): Regimen[] {
    return regimens.filter((regimen) => {
      // Animal filter
      if (
        criteria.animalId &&
        criteria.animalId !== "all" &&
        regimen.animalId !== criteria.animalId
      ) {
        return false;
      }

      // Active only filter
      if (criteria.activeOnly && !regimen.isActive) {
        return false;
      }

      // Exclude ended filter
      if (criteria.excludeEnded && regimen.status === "ended") {
        return false;
      }

      return true;
    });
  }

  /**
   * Group regimens by animal
   */
  static groupRegimensByAnimal(regimens: Regimen[]): Record<string, Regimen[]> {
    return regimens.reduce(
      (groups, regimen) => {
        const key = regimen.animalId;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(regimen);
        return groups;
      },
      {} as Record<string, Regimen[]>,
    );
  }

  /**
   * Build update data for tRPC mutation
   */
  static buildUpdateData(
    data: Partial<Regimen>,
    editingRegimen: Regimen,
    householdId: string,
  ): RegimenUpdateInput {
    const updateData: RegimenUpdateInput = {
      cutoffMinutes: data.cutoffMins,
      dose: data.strength || "",
      highRisk: data.highRisk,
      householdId,
      id: editingRegimen.id,
      instructions:
        `${data.strength || ""} ${data.form || ""} - ${data.route || ""}`.trim(),
      name: data.medicationName,
      requiresCoSign: data.highRisk, // High risk medications require co-sign
      route: data.route,
      scheduleType: data.scheduleType as "FIXED" | "PRN" | "INTERVAL" | "TAPER",
      timesLocal: data.timesLocal,
    };

    // Only add dates if they exist
    if (data.startDate) {
      updateData.startDate = RegimenDataService.formatDateForAPI(
        data.startDate,
      );
    }
    if (data.endDate) {
      updateData.endDate = RegimenDataService.formatDateForAPI(data.endDate);
    }

    return updateData;
  }

  /**
   * Build create data for tRPC mutation
   */
  static buildCreateData(
    data: Partial<Regimen>,
    householdId: string,
  ): RegimenCreateInput {
    const createData: RegimenCreateInput = {
      animalId: data.animalId || "",
      cutoffMinutes: data.cutoffMins || 240,
      dose: data.strength || "",
      highRisk: data.highRisk || false,
      householdId,
      instructions:
        `${data.strength || ""} ${data.form || ""} - ${data.route || ""}`.trim(),
      medicationId: data.medicationId || undefined,
      name: data.medicationName,
      requiresCoSign: data.highRisk || false, // High risk medications require co-sign
      route: data.route,
      scheduleType: data.scheduleType as "FIXED" | "PRN" | "INTERVAL" | "TAPER",
      startDate: RegimenDataService.formatDateForAPIRequired(data.startDate),
      timesLocal: data.timesLocal,
    };

    // Only add endDate if it exists
    if (data.endDate) {
      createData.endDate = RegimenDataService.formatDateForAPI(data.endDate);
    }

    return createData;
  }

  /**
   * Format date for API (optional)
   */
  private static formatDateForAPI(date?: Date): string | undefined {
    return date?.toISOString().slice(0, 10);
  }

  /**
   * Format date for API (required)
   */
  private static formatDateForAPIRequired(date?: Date): string {
    const isoDate = (date || new Date()).toISOString();
    const datePart = isoDate.split("T")[0];
    return datePart ?? isoDate; // Fallback to full ISO string if split fails
  }
}
