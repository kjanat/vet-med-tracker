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
  { value: "ROOM", label: "Room Temperature", description: "Store at 15-25°C" },
  { value: "FRIDGE", label: "Refrigerated", description: "Store at 2-8°C" },
  { value: "FREEZER", label: "Frozen", description: "Store below 0°C" },
  {
    value: "CONTROLLED",
    label: "Controlled",
    description: "Special storage requirements",
  },
] as const;

/**
 * Data transformation service for inventory form data
 *
 * Handles conversion between form data and API payloads, generates
 * default values, and calculates derived fields. Extracted from
 * the main hook to follow Single Responsibility Principle.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class for data transformation
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
      householdId: household.id,
      medicationId: formData.medicationId,
      brandOverride: formData.brand || undefined,
      lot: formData.lot || undefined,
      expiresOn: formData.expiresOn,
      storage: formData.storage,
      unitsTotal: formData.quantityUnits,
      unitsRemaining: formData.unitsRemaining,
      unitType: "units", // TODO: Make this configurable
      notes: undefined, // TODO: Add notes field to form
      assignedAnimalId: formData.assignedAnimalId || undefined,
    };
  }

  /**
   * Generate default form values based on options
   */
  static setDefaultValues(options: FormOptions = {}): InventoryFormData {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays ?? 730));

    return {
      medicationId: "",
      name: "",
      isCustomMedication: false,
      brand: "",
      route: "",
      form: "",
      strength: "",
      concentration: "",
      quantityUnits: options.quantityUnits ?? 1,
      unitsRemaining: options.quantityUnits ?? 1,
      lot: "",
      expiresOn: expiryDate,
      storage: options.storage ?? "ROOM",
      assignedAnimalId: "",
      barcode: "",
      setInUse: false,
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
      percentRemaining,
      daysUntilExpiry,
      isExpiringSoon,
      isQuantityLow,
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
      // Trim string fields
      medicationId: data.medicationId?.trim() || "",
      name: data.name?.trim() || "",
      brand: data.brand?.trim() || "",
      route: data.route?.trim() || "",
      form: data.form?.trim() || "",
      strength: data.strength?.trim() || "",
      concentration: data.concentration?.trim() || "",
      lot: data.lot?.trim() || "",
      assignedAnimalId: data.assignedAnimalId?.trim() || "",
      barcode: data.barcode?.trim() || "",

      // Ensure positive numbers
      quantityUnits: Math.max(0, data.quantityUnits || 1),
      unitsRemaining: Math.max(0, data.unitsRemaining || 1),
    };
  }

  /**
   * Create instrumentation event data for tracking
   */
  static createInstrumentationData(data: InventoryFormData) {
    return {
      medicationId: data.medicationId,
      medicationName: data.name,
      quantity: data.quantityUnits,
      storage: data.storage,
      assignedAnimalId: data.assignedAnimalId || null,
      isCustomMedication: data.isCustomMedication,
      hasLotNumber: !!data.lot?.trim(),
      hasBarcode: !!data.barcode?.trim(),
      daysUntilExpiry: data.expiresOn
        ? Math.ceil(
            (data.expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          )
        : null,
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
      utilizationRate: 100 - derived.percentRemaining,
      isFullStock: derived.percentRemaining === 100,
      isEmptyStock: derived.percentRemaining === 0,
      stockStatus: InventoryDataTransformer.getStockStatus(
        derived.percentRemaining,
      ),
      expiryStatus: InventoryDataTransformer.getExpiryStatus(
        derived.daysUntilExpiry,
      ),
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
