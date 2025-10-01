// Inventory data transformer service

import type { InventoryFormData } from "@/lib/schemas/inventory";
import {
  BaseDataTransformer,
  extractBoolean,
  extractOptionalString,
  parseStringToDate,
} from "@/lib/utils/data-transformer";

// Placeholder UUID for medications without a specific catalog entry
export const PLACEHOLDER_MEDICATION_ID = "00000000-0000-0000-0000-000000000000";

// API input type for creating/updating inventory items (matches tRPC schema)
export interface InventoryApiInput {
  householdId: string;
  medicationId: string;
  assignedAnimalId?: string;
  brandOverride?: string;
  expiresOn: Date;
  lot?: string;
  notes?: string;
  storage: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  unitsRemaining?: number;
  unitsTotal: number;
  unitType: string;
}

// API data type for inventory items (database representation)
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

export class InventoryDataTransformer extends BaseDataTransformer<
  InventoryFormData,
  InventoryApiData
> {
  // Returns mutation input format (what tRPC endpoints expect)
  toApiInput(
    formData: InventoryFormData,
    context: Record<string, unknown>,
  ): InventoryApiInput {
    return {
      assignedAnimalId: formData.assignedAnimalId,
      brandOverride: formData.brand,
      expiresOn: formData.expiresOn,
      householdId: context["householdId"] as string,
      lot: formData.lot,
      medicationId: formData.medicationId || PLACEHOLDER_MEDICATION_ID,
      notes: formData.notes,
      storage: formData.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
      unitsRemaining: formData.unitsRemaining,
      unitsTotal: formData.quantityUnits,
      unitType: formData.unitType,
    };
  }

  // Returns data format (for base class compatibility)
  override toApi(
    formData: InventoryFormData,
    context: Record<string, unknown>,
  ): Omit<InventoryApiData, "id" | "createdAt" | "updatedAt"> {
    // For base class compatibility, convert input to full data shape
    const input = this.toApiInput(formData, context);
    return {
      ...input,
      barcode: formData.barcode ?? null,
      brand: formData.brand ?? null,
      concentration: formData.concentration ?? null,
      expiresOn: formData.expiresOn.toISOString(),
      form: formData.form,
      isCustomMedication: formData.isCustomMedication,
      name: formData.name,
      quantityUnits: formData.quantityUnits,
      route: formData.route,
      strength: formData.strength ?? null,
    } as Omit<InventoryApiData, "id" | "createdAt" | "updatedAt">;
  }

  override toForm(apiData: InventoryApiData): InventoryFormData {
    return {
      assignedAnimalId: extractOptionalString(apiData.assignedAnimalId),
      barcode: extractOptionalString(apiData.barcode),
      brand: extractOptionalString(apiData.brand),
      concentration: extractOptionalString(apiData.concentration),
      expiresOn: parseStringToDate(apiData.expiresOn) ?? new Date(),
      form: apiData.form,
      isCustomMedication: extractBoolean(apiData.isCustomMedication),
      lot: extractOptionalString(apiData.lot),
      medicationId: extractOptionalString(apiData.medicationId),
      name: apiData.name,
      notes: extractOptionalString(apiData.notes),
      quantityUnits: apiData.quantityUnits,
      route: apiData.route,
      setInUse: false,
      storage: apiData.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
      strength: extractOptionalString(apiData.strength),
      unitsRemaining: apiData.unitsRemaining,
      unitType: apiData.unitType,
    };
  }

  override createDefaultValues(options?: {
    expiryDays?: number;
    storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  }): InventoryFormData {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (options?.expiryDays || 365));

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
      storage: options?.storage || "ROOM",
      strength: undefined,
      unitsRemaining: 1,
      unitType: "",
    };
  }

  // Override instrumentation to use specific event names
  override toInstrumentationData(
    data: InventoryFormData,
    isNew: boolean,
    itemId?: string,
  ) {
    return super.toInstrumentationData(data, isNew, itemId, "inventory");
  }

  // Domain-specific methods
  getStorageOptions() {
    return ["refrigerator", "freezer", "room temperature", "cabinet"];
  }

  syncRemainingUnits(data: InventoryFormData, quantityUnits: number) {
    if (data.unitsRemaining > quantityUnits) {
      return { ...data, unitsRemaining: quantityUnits };
    }
    return data;
  }

  calculateDerivedFields(data: InventoryFormData) {
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

  // Override to specify required fields
  override isCompleteRecord(data: InventoryFormData): boolean {
    return this.hasRequiredFields(data, [
      "name",
      "form",
      "route",
      "storage",
      "unitType",
    ]);
  }
}

// Export singleton instance for convenience
export const inventoryTransformer = new InventoryDataTransformer();
