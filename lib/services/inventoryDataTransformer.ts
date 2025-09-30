// Inventory data transformer service

export interface InventoryFormData {
  itemId: string;
  quantity: number;
  quantityUnit?: string;
  expirationDate?: Date;
  lotNumber?: string;
  location?: string;
  notes?: string;
  inUse: boolean;
  assignedAnimalId?: string;
}

export interface InventoryApiData {
  id: string;
  householdId: string;
  itemId: string;
  quantity: number;
  quantityUnit?: string | null;
  expirationDate?: string | null;
  lotNumber?: string | null;
  location?: string | null;
  notes?: string | null;
  inUse: boolean;
  assignedAnimalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function transformInventoryFormToApi(
  formData: InventoryFormData,
  householdId: string,
): Omit<InventoryApiData, "id" | "createdAt" | "updatedAt"> {
  return {
    assignedAnimalId: formData.assignedAnimalId || null,
    expirationDate: formData.expirationDate?.toISOString() || null,
    householdId,
    inUse: formData.inUse,
    itemId: formData.itemId,
    location: formData.location || null,
    lotNumber: formData.lotNumber || null,
    notes: formData.notes || null,
    quantity: formData.quantity,
    quantityUnit: formData.quantityUnit || null,
  };
}

export function transformInventoryApiToForm(
  apiData: InventoryApiData,
): InventoryFormData {
  return {
    assignedAnimalId: apiData.assignedAnimalId || undefined,
    expirationDate: apiData.expirationDate
      ? new Date(apiData.expirationDate)
      : undefined,
    inUse: apiData.inUse,
    itemId: apiData.itemId,
    location: apiData.location || undefined,
    lotNumber: apiData.lotNumber || undefined,
    notes: apiData.notes || undefined,
    quantity: apiData.quantity,
    quantityUnit: apiData.quantityUnit || undefined,
  };
}
