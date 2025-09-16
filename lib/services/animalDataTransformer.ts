import type { AnimalFormData } from "@/lib/schemas/animal";
import type { Animal } from "@/lib/utils/types";
import { BROWSER_ZONE } from "@/utils/timezone-helpers";

/**
 * Animal data transformation and utility functions
 *
 * This service handles:
 * - Converting form data to API payload format
 * - Converting animal records to form data
 * - Setting up default form values
 * - Data sanitization and transformation
 */

// biome-ignore lint/complexity/noStaticOnlyClass: explanation missing
export class AnimalDataTransformer {
  /**
   * Transform form data for API calls
   *
   * Converts form data to the format expected by the API,
   * handling optional fields and data type conversions.
   */
  static toApiPayload(data: AnimalFormData) {
    return {
      ...data,
      dob: data.dob ? data.dob.toISOString() : undefined,
      weightKg: data.weightKg || undefined,
      breed: data.breed || undefined,
      microchipId: data.microchipId || undefined,
      color: data.color || undefined,
      vetName: data.vetName || undefined,
      vetPhone: data.vetPhone || undefined,
      vetEmail: data.vetEmail || undefined,
      clinicName: data.clinicName || undefined,
      notes: data.notes || undefined,
      photoUrl: data.photoUrl || undefined,
    };
  }

  /**
   * Convert animal record to form data
   *
   * Transforms an existing animal record into the format
   * expected by the form, handling optional fields and defaults.
   */
  static fromAnimalRecord(animal: Animal): AnimalFormData {
    return {
      name: animal.name,
      species: animal.species,
      breed: animal.breed || "",
      sex: animal.sex,
      neutered: animal.neutered || false,
      dob: animal.dob,
      weightKg: animal.weightKg,
      microchipId: animal.microchipId || "",
      color: animal.color || "",
      timezone: animal.timezone || BROWSER_ZONE || "America/New_York",
      vetName: animal.vetName || "",
      vetPhone: animal.vetPhone || "",
      vetEmail: animal.vetEmail || "",
      clinicName: animal.clinicName || "",
      notes: animal.notes || "",
      allergies: animal.allergies || [],
      conditions: animal.conditions || [],
      photoUrl: animal.photo || "",
    };
  }

  /**
   * Create default form values
   *
   * Returns a complete set of default values for the animal form,
   * ensuring all required fields have appropriate defaults.
   */
  static createDefaultValues(): AnimalFormData {
    return {
      name: "",
      species: "",
      breed: "",
      sex: undefined,
      neutered: false,
      dob: undefined,
      weightKg: undefined,
      microchipId: "",
      color: "",
      timezone: BROWSER_ZONE || "America/New_York",
      vetName: "",
      vetPhone: "",
      vetEmail: "",
      clinicName: "",
      notes: "",
      allergies: [],
      conditions: [],
      photoUrl: "",
    };
  }

  /**
   * Prepare create mutation payload
   *
   * Specifically formats data for creating a new animal,
   * ensuring required fields are properly handled.
   */
  static toCreatePayload(data: AnimalFormData) {
    const basePayload = AnimalDataTransformer.toApiPayload(data);

    return {
      ...basePayload,
      name: data.name,
      species: data.species,
      allergies: data.allergies || [],
      conditions: data.conditions || [],
      timezone: data.timezone || BROWSER_ZONE || "America/New_York",
    };
  }

  /**
   * Prepare update mutation payload
   *
   * Specifically formats data for updating an existing animal,
   * including the animal ID and all transformed data.
   */
  static toUpdatePayload(data: AnimalFormData, animalId: string) {
    const basePayload = AnimalDataTransformer.toApiPayload(data);

    return {
      id: animalId,
      ...basePayload,
    };
  }

  /**
   * Prepare instrumentation event data
   *
   * Creates structured data for analytics and instrumentation events.
   */
  static toInstrumentationData(
    data: AnimalFormData,
    isNew: boolean,
    animalId?: string,
  ) {
    const eventType = isNew
      ? "settings_animals_create"
      : "settings_animals_update";

    return {
      eventType,
      detail: {
        animalId: animalId || null,
        name: data.name,
        species: data.species,
        isNew,
        hasBreed: !!data.breed,
        hasWeight: !!data.weightKg,
        hasVetInfo: !!(data.vetName || data.vetPhone || data.vetEmail),
        allergyCount: data.allergies?.length || 0,
        conditionCount: data.conditions?.length || 0,
      },
    };
  }

  /**
   * Validate required fields for API submission
   *
   * Performs basic validation to ensure required fields are present
   * before attempting API calls.
   */
  static hasRequiredFields(data: AnimalFormData): boolean {
    return !!(data.name?.trim() && data.species?.trim());
  }

  /**
   * Check if form data represents a complete animal record
   *
   * Determines whether the form data contains enough information
   * to represent a meaningful animal record.
   * Fixed to be more lenient - requires just basic info + one additional field
   */
  static isCompleteRecord(data: AnimalFormData): boolean {
    const hasBasicInfo = AnimalDataTransformer.hasRequiredFields(data);
    if (!hasBasicInfo) {
      return false;
    }

    // Check for any additional meaningful information beyond required fields
    const hasAdditionalInfo = !!(
      data.breed?.trim() ||
      data.weightKg ||
      data.dob ||
      data.microchipId?.trim() ||
      data.color?.trim() ||
      data.vetName?.trim() ||
      data.vetPhone?.trim() ||
      data.vetEmail?.trim() ||
      data.clinicName?.trim() ||
      data.notes?.trim() ||
      (data.allergies && data.allergies.length > 0) ||
      (data.conditions && data.conditions.length > 0) ||
      data.photoUrl?.trim()
    );

    return hasBasicInfo && hasAdditionalInfo;
  }

  /**
   * Calculate form completeness percentage
   *
   * Returns a percentage (0-100) indicating how complete the form data is,
   * useful for progress indicators or validation feedback.
   * Fixed to properly evaluate field completeness
   */
  static calculateCompleteness(data: AnimalFormData): number {
    // Define what constitutes a "completed" field for each type
    const fields = [
      data.name?.trim(), // string field
      data.species?.trim(), // string field
      data.breed?.trim(), // optional string field
      data.sex, // enum field
      data.weightKg, // number field
      data.dob, // date field
      data.microchipId?.trim(), // optional string field
      data.color?.trim(), // optional string field
      data.vetName?.trim(), // optional string field
      data.vetPhone?.trim(), // optional string field
      data.vetEmail?.trim(), // optional string field
      data.clinicName?.trim(), // optional string field
      data.notes?.trim(), // optional string field
      data.allergies && data.allergies.length > 0, // array field
      data.conditions && data.conditions.length > 0, // array field
      data.photoUrl?.trim(), // optional string field
    ];

    // Filter out empty/falsy values and count non-empty fields
    const completedFields = fields.filter((field) => {
      if (typeof field === "string") {
        return field.length > 0; // Non-empty string
      }
      if (typeof field === "number") {
        return field > 0; // Positive number
      }
      if (field instanceof Date) {
        return true; // Any valid date
      }
      if (typeof field === "boolean") {
        return field; // True boolean values
      }
      return false; // Everything else is incomplete
    }).length;

    // Note: neutered and timezone are not counted as they have defaults
    // neutered defaults to false, timezone has a default value
    return Math.round((completedFields / fields.length) * 100);
  }
}
