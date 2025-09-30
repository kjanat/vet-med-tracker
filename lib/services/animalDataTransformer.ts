// Animal data transformer service

export interface AnimalFormData {
  name: string;
  species: string;
  breed?: string;
  dateOfBirth?: Date;
  weight?: number;
  weightUnit?: "kg" | "lbs";
  sex?: "male" | "female" | "unknown";
  color?: string;
  microchipNumber?: string;
  notes?: string;
}

export interface AnimalApiData {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  dateOfBirth?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  sex?: string | null;
  color?: string | null;
  microchipNumber?: string | null;
  notes?: string | null;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

export function transformAnimalFormToApi(
  formData: AnimalFormData,
  householdId: string,
): Omit<AnimalApiData, "id" | "createdAt" | "updatedAt"> {
  return {
    breed: formData.breed || null,
    color: formData.color || null,
    dateOfBirth: formData.dateOfBirth?.toISOString() || null,
    householdId,
    microchipNumber: formData.microchipNumber || null,
    name: formData.name,
    notes: formData.notes || null,
    sex: formData.sex || null,
    species: formData.species,
    weight: formData.weight || null,
    weightUnit: formData.weightUnit || null,
  };
}

export function transformAnimalApiToForm(
  apiData: AnimalApiData,
): AnimalFormData {
  return {
    breed: apiData.breed || undefined,
    color: apiData.color || undefined,
    dateOfBirth: apiData.dateOfBirth
      ? new Date(apiData.dateOfBirth)
      : undefined,
    microchipNumber: apiData.microchipNumber || undefined,
    name: apiData.name,
    notes: apiData.notes || undefined,
    sex: (apiData.sex as "male" | "female" | "unknown") || undefined,
    species: apiData.species,
    weight: apiData.weight || undefined,
    weightUnit: (apiData.weightUnit as "kg" | "lbs") || undefined,
  };
}
