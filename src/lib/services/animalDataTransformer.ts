// Animal data transformer service

import type { AnimalApiData, AnimalFormData } from "@/lib/schemas/animal";
import {
  BaseDataTransformer,
  ensureArray,
  extractBoolean,
  extractOptionalString,
  parseStringToDate,
  parseStringToNumber,
} from "@/lib/utils/data-transformer";
import type { Animal } from "@/lib/utils/types";

export class AnimalDataTransformer extends BaseDataTransformer<
  AnimalFormData,
  AnimalApiData
> {
  toApi(
    formData: AnimalFormData,
    context: Record<string, unknown>,
  ): Omit<AnimalApiData, "id" | "createdAt" | "updatedAt"> {
    // For API compatibility, convert to shape expected by tRPC endpoints
    // weightKg is stored as string in database but form uses number
    return {
      allergies: formData.allergies,
      breed: formData.breed,
      conditions: formData.conditions,
      householdId: context["householdId"] as string,
      name: formData.name,
      neutered: formData.neutered,
      species: formData.species,
      timezone: formData.timezone,
      weightKg: formData.weightKg?.toString(),
    };
  }

  toForm(apiData: AnimalApiData): AnimalFormData {
    return {
      allergies: ensureArray(apiData.allergies),
      breed: extractOptionalString(apiData.breed),
      clinicName: extractOptionalString(apiData.clinicName),
      color: extractOptionalString(apiData.color),
      conditions: ensureArray(apiData.conditions),
      dob: parseStringToDate(apiData.dob),
      microchipId: extractOptionalString(apiData.microchipId),
      name: apiData.name,
      neutered: extractBoolean(apiData.neutered),
      notes: extractOptionalString(apiData.notes),
      photoUrl: undefined,
      sex: apiData.sex,
      species: apiData.species,
      timezone: apiData.timezone,
      vetEmail: extractOptionalString(apiData.vetEmail),
      vetName: extractOptionalString(apiData.vetName),
      vetPhone: extractOptionalString(apiData.vetPhone),
      weightKg: parseStringToNumber(apiData.weightKg),
    };
  }

  override createDefaultValues(
    _options?: Record<string, unknown>,
  ): AnimalFormData {
    return {
      allergies: [],
      breed: undefined,
      clinicName: undefined,
      color: undefined,
      conditions: [],
      dob: undefined,
      microchipId: undefined,
      name: "",
      neutered: false,
      notes: undefined,
      photoUrl: undefined,
      sex: undefined,
      species: "",
      timezone: "UTC",
      vetEmail: undefined,
      vetName: undefined,
      vetPhone: undefined,
      weightKg: undefined,
    };
  }

  // Override instrumentation to use specific event names
  override toInstrumentationData(
    data: AnimalFormData,
    isNew: boolean,
    animalId?: string,
  ) {
    return super.toInstrumentationData(data, isNew, animalId, "animal");
  }

  fromAnimalRecord(record: Animal | AnimalApiData): AnimalFormData {
    // Handle both Animal and AnimalApiData types
    const dob = record.dob instanceof Date ? record.dob : undefined;

    return {
      allergies: ensureArray(record.allergies),
      breed: extractOptionalString(record.breed),
      clinicName: extractOptionalString((record as Animal).clinicName),
      color: extractOptionalString(record.color),
      conditions: ensureArray(record.conditions),
      dob,
      microchipId: extractOptionalString(record.microchipId),
      name: record.name,
      neutered: extractBoolean(record.neutered),
      notes: extractOptionalString((record as Animal).notes),
      photoUrl: undefined,
      sex: record.sex,
      species: record.species,
      timezone: record.timezone,
      vetEmail: extractOptionalString((record as Animal).vetEmail),
      vetName: extractOptionalString(record.vetName),
      vetPhone: extractOptionalString((record as Animal).vetPhone),
      weightKg:
        typeof record.weightKg === "string"
          ? parseFloat(record.weightKg)
          : record.weightKg,
    };
  }

  // Override to specify required fields
  override isCompleteRecord(data: AnimalFormData): boolean {
    return this.hasRequiredFields(data, ["name", "species"]);
  }
}

// Export singleton instance for convenience
export const animalTransformer = new AnimalDataTransformer();
