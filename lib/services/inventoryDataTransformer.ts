import type { z } from "zod";
import type { inventoryFormSchema } from "@/lib/schemas/inventory";

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

/**
 * Household context for transformations
 */
interface Household {
  id: string;
  name: string;
}

/**
 * API payload structure for inventory creation
 */
interface CreateInventoryItemData {
  householdId: string;
  medicationId: string;
  brandOverride?: string;
  lot?: string;
  expiresOn: Date;
  storage: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  unitsTotal: number;
  unitsRemaining: number;
  unitType: string;
  notes?: string;
  assignedAnimalId?: string;
}

/**
 * Default values configuration
 */
interface DefaultsConfig {
  storage: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  expiryDays: number;
  quantityUnits: number;
  unitType: string;
}

/**
 * Form options for generating default values
 */
interface FormOptions {
  storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  expiryDays?: number;
  quantityUnits?: number;
  unitType?: string;
}

/**
 * Derived fields calculated from form data
 */
interface DerivedFields {
  percentRemaining: number;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isQuantityLow: boolean;
  storageDescription: string;
}

/**
 * Storage type options with descriptions
 */
const STORAGE_OPTIONS = [
  { description: "Store at 15-25°C", label: "Room Temperature", value: "ROOM" },
  { description: "Store at 2-8°C", label: "Refrigerated", value: "FRIDGE" },
  { description: "Store below 0°C", label: "Frozen", value: "FREEZER" },
  {
    description: "Special storage requirements",
    label: "Controlled",
    value: "CONTROLLED",
  },
] as const;

/**
 * Data transformation service for inventory form data
 *
 * Handles conversion between form data and API payloads, generates
 * default values, and calculates derived fields. Extracted from
 * the main hook to follow Single Responsibility Principle.
 */
export class InventoryDataTransformer {
  /**
   * Transform form data to API payload for inventory creation
   */
  static toApiPayload(
    formData: InventoryFormData,
    household: Household,
  ): CreateInventoryItemData {
    if (!household.id) {
      throw new Error("Household ID is required for API payload");
    }

    if (!formData.medicationId) {
      throw new Error("Medication ID is required for API payload");
    }

    return {
      assignedAnimalId: formData.assignedAnimalId || undefined,
      brandOverride: formData.brand || undefined,
      expiresOn: formData.expiresOn,
      householdId: household.id,
      lot: formData.lot || undefined,
      medicationId: formData.medicationId,
      notes: undefined, // TODO: Add notes field to form
      storage: formData.storage,
      unitsRemaining: formData.unitsRemaining,
      unitsTotal: formData.quantityUnits,
      unitType: "units", // TODO: Make this configurable
    };
  }

  /**
   * Generate default form values based on options
   */
  static setDefaultValues(options: FormOptions = {}): InventoryFormData {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays ?? 730));

    return {
      assignedAnimalId: "",
      barcode: "",
      brand: "",
      concentration: "",
      expiresOn: expiryDate,
      form: "",
      isCustomMedication: false,
      lot: "",
      medicationId: "",
      name: "",
      quantityUnits: options.quantityUnits ?? 1,
      route: "",
      setInUse: false,
      storage: options.storage ?? "ROOM",
      strength: "",
      unitsRemaining: options.quantityUnits ?? 1,
    };
  }

  /**
   * Calculate derived fields from form data
   */
  static calculateDerivedFields(data: InventoryFormData): DerivedFields {
    // Calculate percentage remaining
    const percentRemaining =
      data.quantityUnits > 0
        ? Math.round((data.unitsRemaining / data.quantityUnits) * 100)
        : 0;

    // Calculate days until expiry
    const daysUntilExpiry = data.expiresOn
      ? Math.ceil(
          (data.expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        )
      : null;

    // Check if expiring soon (within 30 days)
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

    // Check if quantity is low (less than 20%)
    const isQuantityLow = percentRemaining < 20;

    // Get storage description
    const storageOption = STORAGE_OPTIONS.find(
      (opt) => opt.value === data.storage,
    );
    const storageDescription = storageOption?.description || data.storage;

    return {
      daysUntilExpiry,
      isExpiringSoon,
      isQuantityLow,
      percentRemaining,
      storageDescription,
    };
  }

  /**
   * Create fresh default values with current timestamp
   */
  static createFreshDefaults(options: FormOptions = {}): InventoryFormData {
    return InventoryDataTransformer.setDefaultValues({
      ...options,
      // Ensure fresh expiry date
      expiryDays: options.expiryDays ?? 730,
    });
  }

  /**
   * Sync remaining units with total units when total changes
   * Used for form field synchronization
   */
  static syncRemainingUnits(
    formData: InventoryFormData,
    newTotalUnits: number,
  ): Partial<InventoryFormData> {
    const updates: Partial<InventoryFormData> = {
      quantityUnits: newTotalUnits,
    };

    // If remaining exceeds new total, adjust to match
    if (formData.unitsRemaining > newTotalUnits) {
      updates.unitsRemaining = newTotalUnits;
    }

    return updates;
  }

  /**
   * Validate and sanitize form data before transformation
   */
  static sanitizeFormData(data: InventoryFormData): InventoryFormData {
    return {
      ...data,
      assignedAnimalId: data.assignedAnimalId?.trim() || "",
      barcode: data.barcode?.trim() || "",
      brand: data.brand?.trim() || "",
      concentration: data.concentration?.trim() || "",
      form: data.form?.trim() || "",
      lot: data.lot?.trim() || "",
      // Trim string fields
      medicationId: data.medicationId?.trim() || "",
      name: data.name?.trim() || "",

      // Ensure positive numbers
      quantityUnits: Math.max(0, data.quantityUnits || 1),
      route: data.route?.trim() || "",
      strength: data.strength?.trim() || "",
      unitsRemaining: Math.max(0, data.unitsRemaining || 1),
    };
  }

  /**
   * Create instrumentation event data for tracking
   */
  static createInstrumentationData(data: InventoryFormData) {
    return {
      assignedAnimalId: data.assignedAnimalId || null,
      daysUntilExpiry: data.expiresOn
        ? Math.ceil(
            (data.expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          )
        : null,
      hasBarcode: Boolean(data.barcode?.trim()),
      hasLotNumber: Boolean(data.lot?.trim()),
      isCustomMedication: data.isCustomMedication,
      medicationId: data.medicationId,
      medicationName: data.name,
      quantity: data.quantityUnits,
      storage: data.storage,
    };
  }

  /**
   * Get storage option configuration by value
   */
  static getStorageOption(storage: string) {
    return STORAGE_OPTIONS.find((opt) => opt.value === storage);
  }

  /**
   * Get all available storage options
   */
  static getStorageOptions() {
    return STORAGE_OPTIONS;
  }

  /**
   * Check if form data represents a new item vs existing item update
   */
  static isNewItem(data: InventoryFormData): boolean {
    // New items don't have an ID yet
    return !data.medicationId || data.medicationId === "";
  }

  /**
   * Calculate inventory value metrics (for reporting)
   */
  static calculateInventoryMetrics(data: InventoryFormData) {
    const derived = InventoryDataTransformer.calculateDerivedFields(data);

    return {
      ...derived,
      expiryStatus: InventoryDataTransformer.getExpiryStatus(
        derived.daysUntilExpiry,
      ),
      isEmptyStock: derived.percentRemaining === 0,
      isFullStock: derived.percentRemaining === 100,
      stockStatus: InventoryDataTransformer.getStockStatus(
        derived.percentRemaining,
      ),
      utilizationRate: 100 - derived.percentRemaining,
    };
  }

  /**
   * Get stock status classification
   */
  private static getStockStatus(percentRemaining: number): string {
    if (percentRemaining === 0) return "EMPTY";
    if (percentRemaining < 20) return "LOW";
    if (percentRemaining < 50) return "MEDIUM";
    return "GOOD";
  }

  /**
   * Get expiry status classification
   */
  private static getExpiryStatus(daysUntilExpiry: number | null): string {
    if (daysUntilExpiry === null) return "UNKNOWN";
    if (daysUntilExpiry < 0) return "EXPIRED";
    if (daysUntilExpiry <= 7) return "CRITICAL";
    if (daysUntilExpiry <= 30) return "WARNING";
    if (daysUntilExpiry <= 90) return "CAUTION";
    return "GOOD";
  }
}

// Export types for use in other modules
export type {
  InventoryFormData,
  Household,
  CreateInventoryItemData,
  DefaultsConfig,
  FormOptions,
  DerivedFields,
};
