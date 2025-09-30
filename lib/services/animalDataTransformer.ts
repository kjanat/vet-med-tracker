// Animal data transformer service

import type { AnimalApiData, AnimalFormData } from "@/lib/schemas/animal";
import type { Animal } from "@/lib/utils/types";

export function transformAnimalFormToApi(
  formData: AnimalFormData,
  householdId: string,
): Omit<AnimalApiData, "id" | "createdAt" | "updatedAt"> {
  return {
    allergies: formData.allergies,
    breed: formData.breed,
    clinicName: formData.clinicName,
    color: formData.color,
    conditions: formData.conditions,
    dob: formData.dob?.toISOString(),
    householdId,
    microchipId: formData.microchipId,
    name: formData.name,
    neutered: formData.neutered,
    notes: formData.notes,
    sex: formData.sex,
    species: formData.species,
    timezone: formData.timezone,
    vetEmail: formData.vetEmail,
    vetName: formData.vetName,
    vetPhone: formData.vetPhone,
    weightKg: formData.weightKg?.toString(),
  };
}

export function transformAnimalApiToForm(
  apiData: AnimalApiData,
): AnimalFormData {
  return {
    allergies: apiData.allergies ?? [],
    breed: apiData.breed,
    clinicName: apiData.clinicName,
    color: apiData.color,
    conditions: apiData.conditions ?? [],
    dob: apiData.dob ? new Date(apiData.dob) : undefined,
    microchipId: apiData.microchipId,
    name: apiData.name,
    neutered: apiData.neutered,
    notes: apiData.notes,
    photoUrl: undefined,
    sex: apiData.sex,
    species: apiData.species,
    timezone: apiData.timezone,
    vetEmail: apiData.vetEmail,
    vetName: apiData.vetName,
    vetPhone: apiData.vetPhone,
    weightKg: apiData.weightKg ? parseFloat(apiData.weightKg) : undefined,
  };
}

export class AnimalDataTransformer {
  static toApi = transformAnimalFormToApi;
  static toForm = transformAnimalApiToForm;

  static createDefaultValues(): AnimalFormData {
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

  static toInstrumentationData(
    data: AnimalFormData,
    isNew: boolean,
    animalId?: string,
  ) {
    return {
      detail: { animalId, data, isNew },
      eventType: isNew ? "animal:created" : "animal:updated",
    };
  }

  static fromAnimalRecord(record: Animal | AnimalApiData): AnimalFormData {
    // Handle both Animal and AnimalApiData types
    const dob = record.dob instanceof Date ? record.dob : undefined;

    return {
      allergies: record.allergies ?? [],
      breed: record.breed,
      clinicName: (record as Animal).clinicName ?? undefined,
      color: record.color,
      conditions: record.conditions ?? [],
      dob,
      microchipId: record.microchipId,
      name: record.name,
      neutered: record.neutered ?? false,
      notes: (record as Animal).notes ?? undefined,
      photoUrl: undefined,
      sex: record.sex,
      species: record.species,
      timezone: record.timezone,
      vetEmail: (record as Animal).vetEmail ?? undefined,
      vetName: record.vetName,
      vetPhone: (record as Animal).vetPhone ?? undefined,
      weightKg: record.weightKg,
    };
  }

  static toUpdatePayload(data: AnimalFormData) {
    return data;
  }

  static toCreatePayload(data: AnimalFormData) {
    return data;
  }

  static calculateCompleteness(data: AnimalFormData): number {
    const fields = Object.values(data).filter(
      (v) => v !== undefined && v !== "",
    );
    return (fields.length / Object.keys(data).length) * 100;
  }

  static isCompleteRecord(data: AnimalFormData): boolean {
    return !!data.name && !!data.species;
  }

  static hasRequiredFields(data: AnimalFormData): boolean {
    return !!data.name && !!data.species;
  }
}
