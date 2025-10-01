// noinspection MagicNumberJS

import { describe, expect, it } from "bun:test";
import type { InventoryFormData } from "@/lib/schemas/inventory.ts";
import {
  type InventoryApiData,
  inventoryTransformer,
} from "@/lib/services/inventoryDataTransformer.ts";

describe("InventoryDataTransformer", () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const mockFormData: InventoryFormData = {
    assignedAnimalId: "animal-456-uuid",
    brand: "Generic",
    expiresOn: futureDate,
    form: "tablet",
    isCustomMedication: false,
    lot: "LOT-789",
    medicationId: "med-123-uuid",
    name: "Amoxicillin",
    notes: "Test notes",
    quantityUnits: 30,
    route: "oral",
    setInUse: false,
    storage: "ROOM",
    unitsRemaining: 25,
    unitType: "mg",
  };

  const mockApiData: InventoryApiData = {
    assignedAnimalId: "animal-456-uuid",
    barcode: null,
    brand: "Generic",
    concentration: null,
    createdAt: new Date().toISOString(),
    expiresOn: futureDate.toISOString(),
    form: "tablet",
    householdId: "household-123",
    id: "inv-001",
    isCustomMedication: false,
    lot: "LOT-789",
    medicationId: "med-123-uuid",
    name: "Amoxicillin",
    notes: "Test notes",
    quantityUnits: 30,
    route: "oral",
    storage: "ROOM",
    strength: null,
    unitsRemaining: 25,
    unitType: "mg",
    updatedAt: new Date().toISOString(),
  };

  describe("transformInventoryFormToApi", () => {
    it("should transform form data to API format", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-123",
      });

      expect(result.householdId).toBe("household-123");
      expect(result.medicationId).toBe("med-123-uuid");
      expect(result.unitsTotal).toBe(30);
      expect(result.unitsRemaining).toBe(25);
      expect(result.storage).toBe("ROOM");
      expect(result.assignedAnimalId).toBe("animal-456-uuid");
    });

    it("should use placeholder medicationId when not provided", () => {
      const formWithoutMedId = { ...mockFormData, medicationId: undefined };
      const result = inventoryTransformer.toApiInput(formWithoutMedId, {
        householdId: "household-123",
      });

      expect(result.medicationId).toBe("00000000-0000-0000-0000-000000000000");
    });

    it("should map quantityUnits to unitsTotal", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-123",
      });

      expect(result.unitsTotal).toBe(mockFormData.quantityUnits);
      expect(result.unitsRemaining).toBe(mockFormData.unitsRemaining);
    });

    it("should preserve optional fields when present", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-123",
      });

      expect(result.lot).toBe("LOT-789");
      expect(result.notes).toBe("Test notes");
      expect(result.brandOverride).toBe("Generic");
    });

    it("should handle custom medication flag", () => {
      const customMedFormData = {
        ...mockFormData,
        isCustomMedication: true,
        medicationId: undefined,
      };

      const result = inventoryTransformer.toApiInput(customMedFormData, {
        householdId: "household-123",
      });

      expect(result.medicationId).toBe("00000000-0000-0000-0000-000000000000");
    });

    it("should handle Date objects for expiresOn", () => {
      const dateFormData = {
        ...mockFormData,
        expiresOn: new Date("2025-12-31"),
      };

      const result = inventoryTransformer.toApiInput(dateFormData, {
        householdId: "household-123",
      });

      expect(result.expiresOn).toBeInstanceOf(Date);
    });

    it("should map quantityUnits to quantityUnits in database format", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-123",
      });

      expect(result.unitsTotal).toBe(30);
    });

    it("should default unitsRemaining to match quantityUnits when not specified", () => {
      const formWithoutRemaining = {
        ...mockFormData,
        unitsRemaining: 10,
      };

      const result = inventoryTransformer.toApiInput(formWithoutRemaining, {
        householdId: "household-123",
      });

      expect(result.unitsRemaining).toBe(10);
    });

    it("should handle undefined optional fields", () => {
      const minimalFormData: InventoryFormData = {
        expiresOn: futureDate,
        form: "tablet",
        isCustomMedication: false,
        name: "Medication",
        quantityUnits: 10,
        route: "oral",
        setInUse: false,
        storage: "ROOM",
        unitsRemaining: 10,
        unitType: "mg",
      };

      const result = inventoryTransformer.toApiInput(minimalFormData, {
        householdId: "household-123",
      });

      expect(result.householdId).toBe("household-123");
      expect(result.unitsTotal).toBe(10);
      expect(result.assignedAnimalId).toBeUndefined();
      expect(result.lot).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe("transformInventoryApiToForm", () => {
    it("should transform API data to form format", () => {
      const result = inventoryTransformer.toForm(mockApiData);

      expect(result.name).toBe("Amoxicillin");
      expect(result.form).toBe("tablet");
      expect(result.route).toBe("oral");
      expect(result.quantityUnits).toBe(30);
      expect(result.unitsRemaining).toBe(25);
      expect(result.storage).toBe("ROOM");
      expect(result.isCustomMedication).toBe(false);
    });

    it("should convert ISO date string to Date object", () => {
      const result = inventoryTransformer.toForm(mockApiData);

      expect(result.expiresOn).toBeInstanceOf(Date);
      expect(result.expiresOn.getFullYear()).toBe(futureDate.getFullYear());
    });

    it("should set setInUse to false by default", () => {
      const result = inventoryTransformer.toForm(mockApiData);

      expect(result.setInUse).toBe(false);
    });

    it("should convert null values to undefined", () => {
      const apiWithNulls: InventoryApiData = {
        ...mockApiData,
        assignedAnimalId: null,
        brand: null,
        lot: null,
        notes: null,
      };

      const result = inventoryTransformer.toForm(apiWithNulls);

      expect(result.assignedAnimalId).toBeUndefined();
      expect(result.brand).toBeUndefined();
      expect(result.lot).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it("should preserve all required fields", () => {
      const result = inventoryTransformer.toForm(mockApiData);

      expect(result.name).toBeTruthy();
      expect(result.form).toBeTruthy();
      expect(result.route).toBeTruthy();
      expect(result.unitType).toBeTruthy();
      expect(result.storage).toBeTruthy();
      expect(typeof result.quantityUnits).toBe("number");
      expect(typeof result.unitsRemaining).toBe("number");
      expect(typeof result.isCustomMedication).toBe("boolean");
      expect(typeof result.setInUse).toBe("boolean");
    });

    it("should provide toForm alias for transformInventoryApiToForm", () => {
      const result1 = inventoryTransformer.toForm(mockApiData);
      const result2 = inventoryTransformer.toForm(mockApiData);

      expect(result1).toEqual(result2);
    });
  });

  describe("InventoryDataTransformer class methods", () => {
    it("should provide toApi method for transformation", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-123",
      });

      expect(result.householdId).toBe("household-123");
      expect(result.medicationId).toBeDefined();
    });

    it("should provide toForm alias for transformInventoryApiToForm", () => {
      const result1 = inventoryTransformer.toForm(mockApiData);
      const result2 = inventoryTransformer.toForm(mockApiData);

      expect(result1).toEqual(result2);
    });

    it("should return storage options", () => {
      const options = inventoryTransformer.getStorageOptions();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      expect(options).toContain("refrigerator");
      expect(options).toContain("room temperature");
    });

    it("should create default values with custom expiry days", () => {
      const result = inventoryTransformer.createDefaultValues({
        expiryDays: 90,
      });

      expect(result.quantityUnits).toBe(1);
      expect(result.unitsRemaining).toBe(1);
      expect(result.storage).toBe("ROOM");
      expect(result.isCustomMedication).toBe(false);
      expect(result.setInUse).toBe(false);

      const daysUntilExpiry = Math.ceil(
        (result.expiresOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysUntilExpiry).toBeGreaterThanOrEqual(89);
      expect(daysUntilExpiry).toBeLessThanOrEqual(91);
    });

    it("should create default values with custom storage", () => {
      const result = inventoryTransformer.createDefaultValues({
        storage: "FRIDGE",
      });

      expect(result.storage).toBe("FRIDGE");
    });

    it("should create instrumentation data", () => {
      const result = inventoryTransformer.toInstrumentationData(
        mockFormData,
        true,
      );

      expect(result.eventType).toBe("inventory:created");
      expect(result.detail.data).toEqual(mockFormData);
    });

    it("should sync remaining units when exceeds quantity", () => {
      const dataWithExcessRemaining = {
        ...mockFormData,
        quantityUnits: 30,
        unitsRemaining: 50,
      };

      const result = inventoryTransformer.syncRemainingUnits(
        dataWithExcessRemaining,
        30,
      );

      expect(result.unitsRemaining).toBe(30);
      expect(result.quantityUnits).toBe(30);
    });

    it("should not modify remaining units when within quantity", () => {
      const result = inventoryTransformer.syncRemainingUnits(mockFormData, 30);

      expect(result.unitsRemaining).toBe(25);
      expect(result.quantityUnits).toBe(30);
    });

    it("should calculate derived fields correctly", () => {
      const result = inventoryTransformer.calculateDerivedFields(mockFormData);

      expect(result.percentRemaining).toBeCloseTo(83.33, 1);
      expect(result.daysUntilExpiry).toBeGreaterThan(300);
      expect(result.isExpired).toBe(false);
      expect(result.isExpiringSoon).toBe(false);
      expect(result.storageDescription).toBe("ROOM");
    });

    it("should detect expiring soon items", () => {
      const soonToExpire = new Date();
      soonToExpire.setDate(soonToExpire.getDate() + 15);

      const dataExpiringSoon = {
        ...mockFormData,
        expiresOn: soonToExpire,
      };

      const result =
        inventoryTransformer.calculateDerivedFields(dataExpiringSoon);

      expect(result.isExpiringSoon).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(30);
      expect(result.daysUntilExpiry).toBeGreaterThan(0);
    });

    it("should detect expired items", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const expiredData = {
        ...mockFormData,
        expiresOn: pastDate,
      };

      const result = inventoryTransformer.calculateDerivedFields(expiredData);

      expect(result.isExpired).toBe(true);
      expect(result.isExpiringSoon).toBe(false);
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(0);
    });

    it("should handle zero quantity gracefully", () => {
      const zeroQuantityData = {
        ...mockFormData,
        quantityUnits: 0,
        unitsRemaining: 0,
      };

      const result =
        inventoryTransformer.calculateDerivedFields(zeroQuantityData);

      expect(result.percentRemaining).toBe(0);
      expect(Number.isNaN(result.percentRemaining)).toBe(false);
    });

    it("should create fresh defaults", () => {
      const result = inventoryTransformer.createDefaultValues({
        expiryDays: 180,
        storage: "FREEZER",
      });

      expect(result.storage).toBe("FREEZER");
      expect(result.quantityUnits).toBe(1);
      expect(result.unitsRemaining).toBe(1);

      const daysUntilExpiry = Math.ceil(
        (result.expiresOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysUntilExpiry).toBeGreaterThanOrEqual(179);
      expect(daysUntilExpiry).toBeLessThanOrEqual(181);
    });

    it("should create API payload", () => {
      const result = inventoryTransformer.toApiInput(mockFormData, {
        householdId: "household-xyz",
      });

      expect(result.householdId).toBe("household-xyz");
      expect(result.unitsTotal).toBe(30);
      expect(result.medicationId).toBe("med-123-uuid");
    });
  });

  describe("Edge cases and robustness", () => {
    it("should handle very large quantity values", () => {
      const largeQuantity = {
        ...mockFormData,
        quantityUnits: 999999,
        unitsRemaining: 500000,
      };

      const result = inventoryTransformer.calculateDerivedFields(largeQuantity);

      expect(result.percentRemaining).toBeCloseTo(50, 1);
      expect(Number.isFinite(result.percentRemaining)).toBe(true);
    });

    it("should handle dates at exact boundaries", () => {
      const exactly30Days = new Date();
      exactly30Days.setDate(exactly30Days.getDate() + 30);

      const boundaryData = {
        ...mockFormData,
        expiresOn: exactly30Days,
      };

      const result = inventoryTransformer.calculateDerivedFields(boundaryData);

      expect(result.daysUntilExpiry).toBeGreaterThanOrEqual(29);
      expect(result.daysUntilExpiry).toBeLessThanOrEqual(31);
      // isExpiringSoon is true for daysUntilExpiry <= 30 and > 0
      const shouldBeExpiringSoon =
        result.daysUntilExpiry <= 30 && result.daysUntilExpiry > 0;
      expect(result.isExpiringSoon).toBe(shouldBeExpiringSoon);
      expect(result.isExpired).toBe(false);
    });

    it("should round-trip API to Form to API correctly", () => {
      const formResult = inventoryTransformer.toForm(mockApiData);
      const apiResult = inventoryTransformer.toApiInput(formResult, {
        householdId: "household-123",
      });

      expect(apiResult.unitsRemaining).toBe(mockApiData.unitsRemaining);
      expect(apiResult.unitsTotal).toBe(mockApiData.quantityUnits);
      expect(apiResult.storage).toBe(
        mockApiData.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
      );
    });
  });
});
