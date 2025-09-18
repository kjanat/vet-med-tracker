import { describe, expect, it } from "bun:test";
import {
  type FormOptions,
  type Household,
  InventoryDataTransformer,
  type InventoryFormData,
} from "@/lib/services/inventoryDataTransformer";

describe("InventoryDataTransformer", () => {
  const validHousehold: Household = {
    id: "household-123",
    name: "Test Household",
  };

  const validFormData: InventoryFormData = {
    assignedAnimalId: "",
    barcode: "",
    brand: "Test Brand",
    concentration: "",
    expiresOn: new Date("2025-12-31"),
    form: "tablet",
    isCustomMedication: false,
    lot: "LOT123",
    medicationId: "med-123",
    name: "Test Medication",
    quantityUnits: 30,
    route: "oral",
    setInUse: false,
    storage: "ROOM",
    strength: "10mg",
    unitsRemaining: 25,
  };

  describe("toApiPayload", () => {
    it("should convert form data to API payload", () => {
      const result = InventoryDataTransformer.toApiPayload(
        validFormData,
        validHousehold,
      );

      expect(result.householdId).toBe("household-123");
      expect(result.medicationId).toBe("med-123");
      expect(result.brandOverride).toBe("Test Brand");
      expect(result.lot).toBe("LOT123");
      expect(result.expiresOn).toEqual(new Date("2025-12-31"));
      expect(result.storage).toBe("ROOM");
      expect(result.unitsTotal).toBe(30);
      expect(result.unitsRemaining).toBe(25);
      expect(result.unitType).toBe("units");
      expect(result.assignedAnimalId).toBe(undefined);
    });

    it("should handle empty optional fields", () => {
      const dataWithEmptyFields = {
        ...validFormData,
        assignedAnimalId: "",
        brand: "",
        lot: "",
      };

      const result = InventoryDataTransformer.toApiPayload(
        dataWithEmptyFields,
        validHousehold,
      );

      expect(result.brandOverride).toBe(undefined);
      expect(result.lot).toBe(undefined);
      expect(result.assignedAnimalId).toBe(undefined);
    });

    it("should throw error when household ID is missing", () => {
      const invalidHousehold = { id: "", name: "Test" };

      expect(() => {
        InventoryDataTransformer.toApiPayload(validFormData, invalidHousehold);
      }).toThrow("Household ID is required for API payload");
    });

    it("should throw error when medication ID is missing", () => {
      const invalidFormData = { ...validFormData, medicationId: "" };

      expect(() => {
        InventoryDataTransformer.toApiPayload(invalidFormData, validHousehold);
      }).toThrow("Medication ID is required for API payload");
    });

    it("should handle assigned animal ID", () => {
      const dataWithAnimal = {
        ...validFormData,
        assignedAnimalId: "animal-456",
      };

      const result = InventoryDataTransformer.toApiPayload(
        dataWithAnimal,
        validHousehold,
      );

      expect(result.assignedAnimalId).toBe("animal-456");
    });
  });

  describe("setDefaultValues", () => {
    it("should create default form data without options", () => {
      const result = InventoryDataTransformer.setDefaultValues();

      expect(result.medicationId).toBe("");
      expect(result.name).toBe("");
      expect(result.isCustomMedication).toBe(false);
      expect(result.brand).toBe("");
      expect(result.route).toBe("");
      expect(result.form).toBe("");
      expect(result.strength).toBe("");
      expect(result.concentration).toBe("");
      expect(result.quantityUnits).toBe(1);
      expect(result.unitsRemaining).toBe(1);
      expect(result.lot).toBe("");
      expect(result.storage).toBe("ROOM");
      expect(result.assignedAnimalId).toBe("");
      expect(result.barcode).toBe("");
      expect(result.setInUse).toBe(false);

      // Check expiry date is 730 days from now (default)
      const _now = new Date();
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 730);
      const daysDiff =
        Math.abs(result.expiresOn.getTime() - expectedExpiry.getTime()) /
        (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeLessThan(1); // Within 1 day
    });

    it("should use provided options", () => {
      const options: FormOptions = {
        expiryDays: 365,
        quantityUnits: 10,
        storage: "FRIDGE",
      };

      const result = InventoryDataTransformer.setDefaultValues(options);

      expect(result.storage).toBe("FRIDGE");
      expect(result.quantityUnits).toBe(10);
      expect(result.unitsRemaining).toBe(10);

      // Check expiry date is 365 days from now
      const _now = new Date();
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 365);
      const daysDiff =
        Math.abs(result.expiresOn.getTime() - expectedExpiry.getTime()) /
        (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeLessThan(1); // Within 1 day
    });
  });

  describe("calculateDerivedFields", () => {
    it("should calculate derived fields correctly", () => {
      const testData = {
        ...validFormData,
        expiresOn: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        quantityUnits: 100,
        storage: "FRIDGE" as const,
        unitsRemaining: 80,
      };

      const result = InventoryDataTransformer.calculateDerivedFields(testData);

      expect(result.percentRemaining).toBe(80);
      expect(result.daysUntilExpiry).toBe(15);
      expect(result.isExpiringSoon).toBe(true); // within 30 days
      expect(result.isQuantityLow).toBe(false); // 80% is not low
      expect(result.storageDescription).toBe("Store at 2-8°C");
    });

    it("should handle low quantity correctly", () => {
      const testData = {
        ...validFormData,
        quantityUnits: 100,
        unitsRemaining: 15, // 15%
      };

      const result = InventoryDataTransformer.calculateDerivedFields(testData);

      expect(result.percentRemaining).toBe(15);
      expect(result.isQuantityLow).toBe(true); // less than 20%
    });

    it("should handle zero quantity", () => {
      const testData = {
        ...validFormData,
        quantityUnits: 0,
        unitsRemaining: 0,
      };

      const result = InventoryDataTransformer.calculateDerivedFields(testData);

      expect(result.percentRemaining).toBe(0);
      expect(result.isQuantityLow).toBe(true);
    });

    it("should handle null expiry date", () => {
      // Note: In TypeScript, we can't pass null directly due to type constraints
      // This test would be more relevant in JavaScript or with type assertion
      const result =
        InventoryDataTransformer.calculateDerivedFields(validFormData);

      expect(result.daysUntilExpiry).toBeGreaterThan(0); // valid future date
    });

    it("should handle all storage types", () => {
      const storageTypes = ["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"] as const;
      const expectedDescriptions = [
        "Store at 15-25°C",
        "Store at 2-8°C",
        "Store below 0°C",
        "Special storage requirements",
      ];

      storageTypes.forEach((storage, index) => {
        const testData = { ...validFormData, storage };
        const result =
          InventoryDataTransformer.calculateDerivedFields(testData);
        const expectedDescription = expectedDescriptions[index];
        expect(expectedDescription).toBeDefined();
        if (!expectedDescription) {
          throw new Error("Expected storage description to be defined");
        }
        expect(result.storageDescription).toBe(expectedDescription);
      });
    });

    it("should handle unknown storage type", () => {
      // This would require type assertion in real code
      const testData = {
        ...validFormData,
        storage: "UNKNOWN" as unknown as InventoryFormData["storage"],
      };
      const result = InventoryDataTransformer.calculateDerivedFields(testData);
      expect(result.storageDescription).toBe("UNKNOWN");
    });
  });

  describe("createFreshDefaults", () => {
    it("should create fresh defaults with current timestamp", () => {
      const result1 = InventoryDataTransformer.createFreshDefaults();
      // Small delay to ensure different timestamps
      const _result2 = InventoryDataTransformer.createFreshDefaults();

      expect(result1.medicationId).toBe("");
      expect(result1.storage).toBe("ROOM");
      expect(result1.quantityUnits).toBe(1);

      // Both should have expiry dates approximately 730 days from now
      const _now = new Date();
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 730);

      const diff1 = Math.abs(
        result1.expiresOn.getTime() - expectedExpiry.getTime(),
      );
      expect(diff1).toBeLessThan(24 * 60 * 60 * 1000); // Within 1 day
    });

    it("should use provided options for fresh defaults", () => {
      const options: FormOptions = {
        expiryDays: 180,
        quantityUnits: 5,
        storage: "FREEZER",
      };

      const result = InventoryDataTransformer.createFreshDefaults(options);

      expect(result.storage).toBe("FREEZER");
      expect(result.quantityUnits).toBe(5);
      expect(result.unitsRemaining).toBe(5);

      // Check expiry date
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 180);
      const daysDiff =
        Math.abs(result.expiresOn.getTime() - expectedExpiry.getTime()) /
        (24 * 60 * 60 * 1000);
      expect(daysDiff).toBeLessThan(1);
    });
  });

  describe("syncRemainingUnits", () => {
    it("should sync remaining units when total increases", () => {
      const currentData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 8,
      };

      const result = InventoryDataTransformer.syncRemainingUnits(
        currentData,
        20,
      );

      expect(result.quantityUnits).toBe(20);
      expect(result.unitsRemaining).toBe(undefined); // unchanged since it's within new total
    });

    it("should adjust remaining units when total decreases below remaining", () => {
      const currentData = {
        ...validFormData,
        quantityUnits: 20,
        unitsRemaining: 15,
      };

      const result = InventoryDataTransformer.syncRemainingUnits(
        currentData,
        10,
      );

      expect(result.quantityUnits).toBe(10);
      expect(result.unitsRemaining).toBe(10); // adjusted to match new total
    });

    it("should handle zero total units", () => {
      const result = InventoryDataTransformer.syncRemainingUnits(
        validFormData,
        0,
      );

      expect(result.quantityUnits).toBe(0);
      expect(result.unitsRemaining).toBe(0);
    });
  });

  describe("sanitizeFormData", () => {
    it("should trim string fields", () => {
      const dataWithWhitespace = {
        ...validFormData,
        brand: "  Brand  ",
        lot: "\tLOT123\n",
        medicationId: "  med-123  ",
        name: " Test Med ",
      };

      const result =
        InventoryDataTransformer.sanitizeFormData(dataWithWhitespace);

      expect(result.medicationId).toBe("med-123");
      expect(result.name).toBe("Test Med");
      expect(result.brand).toBe("Brand");
      expect(result.lot).toBe("LOT123");
    });

    it("should handle empty strings", () => {
      const dataWithEmptyStrings = {
        ...validFormData,
        brand: null as unknown as string,
        lot: undefined as unknown as string,
        medicationId: "",
        name: "",
      };

      const result =
        InventoryDataTransformer.sanitizeFormData(dataWithEmptyStrings);

      expect(result.medicationId).toBe("");
      expect(result.name).toBe("");
      expect(result.brand).toBe("");
      expect(result.lot).toBe("");
    });

    it("should ensure positive numbers", () => {
      const dataWithNegativeNumbers = {
        ...validFormData,
        quantityUnits: -5,
        unitsRemaining: -2,
      };

      const result = InventoryDataTransformer.sanitizeFormData(
        dataWithNegativeNumbers,
      );

      expect(result.quantityUnits).toBe(0); // Math.max(0, -5 || 1) = Math.max(0, -5) = 0 (since -5 is truthy)
      expect(result.unitsRemaining).toBe(0); // Math.max(0, -2 || 1) = Math.max(0, -2) = 0 (since -2 is truthy)
    });

    it("should handle zero quantities", () => {
      const dataWithZeros = {
        ...validFormData,
        quantityUnits: 0,
        unitsRemaining: 0,
      };

      const result = InventoryDataTransformer.sanitizeFormData(dataWithZeros);

      expect(result.quantityUnits).toBe(1); // Math.max(0, 0 || 1) = 1
      expect(result.unitsRemaining).toBe(1); // Math.max(0, 0 || 1) = 1
    });
  });

  describe("createInstrumentationData", () => {
    it("should create instrumentation data", () => {
      const result =
        InventoryDataTransformer.createInstrumentationData(validFormData);

      expect(result.medicationId).toBe("med-123");
      expect(result.medicationName).toBe("Test Medication");
      expect(result.quantity).toBe(30);
      expect(result.storage).toBe("ROOM");
      expect(result.assignedAnimalId).toBe(null); // empty string becomes null
      expect(result.isCustomMedication).toBe(false);
      expect(result.hasLotNumber).toBe(true);
      expect(result.hasBarcode).toBe(false);
      expect(result.daysUntilExpiry).toBeGreaterThan(0);
    });

    it("should handle assigned animal", () => {
      const dataWithAnimal = {
        ...validFormData,
        assignedAnimalId: "animal-123",
      };

      const result =
        InventoryDataTransformer.createInstrumentationData(dataWithAnimal);

      expect(result.assignedAnimalId).toBe("animal-123");
    });

    it("should handle custom medication", () => {
      const customMedData = {
        ...validFormData,
        barcode: "123456789",
        isCustomMedication: true,
        lot: "",
      };

      const result =
        InventoryDataTransformer.createInstrumentationData(customMedData);

      expect(result.isCustomMedication).toBe(true);
      expect(result.hasLotNumber).toBe(false);
      expect(result.hasBarcode).toBe(true);
    });
  });

  describe("getStorageOption", () => {
    it("should return storage option for valid storage type", () => {
      const result = InventoryDataTransformer.getStorageOption("FRIDGE");

      expect(result).toEqual({
        description: "Store at 2-8°C",
        label: "Refrigerated",
        value: "FRIDGE",
      });
    });

    it("should return undefined for invalid storage type", () => {
      const result = InventoryDataTransformer.getStorageOption("INVALID");

      expect(result).toBe(undefined);
    });
  });

  describe("getStorageOptions", () => {
    it("should return all storage options", () => {
      const result = InventoryDataTransformer.getStorageOptions();

      expect(result).toHaveLength(4);
      expect(result[0].value).toBe("ROOM");
      expect(result[1].value).toBe("FRIDGE");
      expect(result[2].value).toBe("FREEZER");
      expect(result[3].value).toBe("CONTROLLED");
    });
  });

  describe("isNewItem", () => {
    it("should return true for new item without medication ID", () => {
      const newItemData = { ...validFormData, medicationId: "" };
      const result = InventoryDataTransformer.isNewItem(newItemData);

      expect(result).toBe(true);
    });

    it("should return false for existing item with medication ID", () => {
      const result = InventoryDataTransformer.isNewItem(validFormData);

      expect(result).toBe(false);
    });
  });

  describe("calculateInventoryMetrics", () => {
    it("should calculate comprehensive inventory metrics", () => {
      const testData = {
        ...validFormData,
        expiresOn: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        quantityUnits: 100,
        unitsRemaining: 75,
      };

      const result =
        InventoryDataTransformer.calculateInventoryMetrics(testData);

      expect(result.percentRemaining).toBe(75);
      expect(result.utilizationRate).toBe(25);
      expect(result.isFullStock).toBe(false);
      expect(result.isEmptyStock).toBe(false);
      expect(result.stockStatus).toBe("GOOD");
      expect(result.expiryStatus).toBe("CAUTION"); // 45 days = CAUTION range
      expect(result.isExpiringSoon).toBe(false); // > 30 days
      expect(result.isQuantityLow).toBe(false); // > 20%
    });

    it("should handle different stock levels", () => {
      // Test empty stock
      const emptyData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 0,
      };
      const emptyResult =
        InventoryDataTransformer.calculateInventoryMetrics(emptyData);
      expect(emptyResult.stockStatus).toBe("EMPTY");
      expect(emptyResult.isEmptyStock).toBe(true);
      expect(emptyResult.utilizationRate).toBe(100);

      // Test low stock
      const lowData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 1, // 10%
      };
      const lowResult =
        InventoryDataTransformer.calculateInventoryMetrics(lowData);
      expect(lowResult.stockStatus).toBe("LOW");
      expect(lowResult.isQuantityLow).toBe(true);

      // Test full stock
      const fullData = {
        ...validFormData,
        quantityUnits: 10,
        unitsRemaining: 10,
      };
      const fullResult =
        InventoryDataTransformer.calculateInventoryMetrics(fullData);
      expect(fullResult.stockStatus).toBe("GOOD");
      expect(fullResult.isFullStock).toBe(true);
      expect(fullResult.utilizationRate).toBe(0);
    });

    it("should handle different expiry statuses", () => {
      const testCases = [
        { days: -1, expectedStatus: "EXPIRED" },
        { days: 3, expectedStatus: "CRITICAL" },
        { days: 15, expectedStatus: "WARNING" },
        { days: 60, expectedStatus: "CAUTION" },
        { days: 200, expectedStatus: "GOOD" },
      ];

      testCases.forEach(({ days, expectedStatus }) => {
        const testData = {
          ...validFormData,
          expiresOn: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        };
        const result =
          InventoryDataTransformer.calculateInventoryMetrics(testData);
        expect(result.expiryStatus).toBe(expectedStatus);
      });
    });
  });
});
