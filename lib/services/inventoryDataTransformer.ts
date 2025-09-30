// Inventory data transformer service

import type { InventoryFormData } from "@/lib/schemas/inventory";

export interface InventoryApiData {
  id: string;
  householdId: string;
  assignedAnimalId?: string | null;
  barcode?: string | null;
  brand?: string | null;
  concentration?: string | null;
  expiresOn: string;
  form: string;
  isCustomMedication: boolean;
  lot?: string | null;
  medicationId?: string | null;
  name: string;
  notes?: string | null;
  quantityUnits: number;
  route: string;
  storage: string;
  strength?: string | null;
  unitsRemaining: number;
  unitType: string;
  createdAt: string;
  updatedAt: string;
}

export function transformInventoryFormToApi(
  formData: InventoryFormData,
  householdId: string,
) {
  // The API expects different field names than the form
  // Map: quantityUnits -> unitsTotal, use medicationId or create placeholder
  return {
    assignedAnimalId: formData.assignedAnimalId,
    brandOverride: formData.brand,
    expiresOn: formData.expiresOn, // API expects Date object
    householdId,
    lot: formData.lot,
    medicationId:
      formData.medicationId || "00000000-0000-0000-0000-000000000000", // Required by API
    notes: formData.notes,
    storage: formData.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
    unitsRemaining: formData.unitsRemaining,
    unitsTotal: formData.quantityUnits, // Map form field to API field
    unitType: formData.unitType,
  };
}

export function transformInventoryApiToForm(
  apiData: InventoryApiData,
): InventoryFormData {
  return {
    assignedAnimalId: apiData.assignedAnimalId || undefined,
    barcode: apiData.barcode || undefined,
    brand: apiData.brand || undefined,
    concentration: apiData.concentration || undefined,
    expiresOn: new Date(apiData.expiresOn),
    form: apiData.form,
    isCustomMedication: apiData.isCustomMedication,
    lot: apiData.lot || undefined,
    medicationId: apiData.medicationId || undefined,
    name: apiData.name,
    notes: apiData.notes || undefined,
    quantityUnits: apiData.quantityUnits,
    route: apiData.route,
    setInUse: false,
    storage: apiData.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
    strength: apiData.strength || undefined,
    unitsRemaining: apiData.unitsRemaining,
    unitType: apiData.unitType,
  };
}

export class InventoryDataTransformer {
  static toApi = transformInventoryFormToApi;
  static toForm = transformInventoryApiToForm;

  static getStorageOptions() {
    return ["refrigerator", "freezer", "room temperature", "cabinet"];
  }

  static setDefaultValues(options: {
    expiryDays?: number;
    storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  }): InventoryFormData {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays || 365));

    return {
      assignedAnimalId: undefined,
      barcode: undefined,
      brand: undefined,
      concentration: undefined,
      expiresOn: expiryDate,
      form: "",
      isCustomMedication: false,
      lot: undefined,
      medicationId: undefined,
      name: "",
      notes: undefined,
      quantityUnits: 1,
      route: "",
      setInUse: false,
      storage: options.storage || "ROOM",
      strength: undefined,
      unitsRemaining: 1,
      unitType: "",
    };
  }

  static toApiPayload(data: InventoryFormData, householdId: string) {
    return transformInventoryFormToApi(data, householdId);
  }

  static createInstrumentationData(data: InventoryFormData) {
    return { action: "create", formData: data };
  }

  static createFreshDefaults(options: {
    expiryDays?: number;
    storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  }): InventoryFormData {
    return InventoryDataTransformer.setDefaultValues(options);
  }

  static syncRemainingUnits(data: InventoryFormData, quantityUnits: number) {
    if (data.unitsRemaining > quantityUnits) {
      return { ...data, unitsRemaining: quantityUnits };
    }
    return data;
  }

  static calculateDerivedFields(data: InventoryFormData) {
    const percentRemaining =
      data.quantityUnits > 0
        ? (data.unitsRemaining / data.quantityUnits) * 100
        : 0;

    const daysUntilExpiry = Math.ceil(
      (data.expiresOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry <= 0;

    return {
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      percentRemaining,
      storageDescription: data.storage,
    };
  }
}
