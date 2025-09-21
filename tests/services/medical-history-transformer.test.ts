/**
 * Medical History Transformer Service Tests
 * Validates record transformation logic and medical data integrity
 */

import { describe, expect, it } from "bun:test";
import {
  MedicalHistoryTransformer,
  type RawAdministrationRecord,
  transformMedicalRecord,
  transformMedicalRecords,
} from "@/lib/services/medical-history-transformer.service";
import type { AdministrationRecord } from "@/lib/utils/types";

// Mock raw record with minimal required fields
const createMockRawRecord = (
  overrides: Partial<RawAdministrationRecord> = {},
): RawAdministrationRecord => ({
  animalId: "animal-456",
  id: "test-id-123",
  recordedAt: new Date("2024-01-15T10:30:00Z"),
  status: "ON_TIME",
  ...overrides,
});

describe("MedicalHistoryTransformer", () => {
  describe("transformRecord", () => {
    it("should transform a basic record correctly", () => {
      const rawRecord = createMockRawRecord({
        animalName: "Fluffy",
        caregiverName: "Dr. Smith",
        medicationDisplayName: "Prednisone",
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.id).toBe("test-id-123");
      expect(result.animalId).toBe("animal-456");
      expect(result.animalName).toBe("Fluffy");
      expect(result.medicationName).toBe("Prednisone");
      expect(result.caregiverName).toBe("Dr. Smith");
      expect(result.recordedAt).toEqual(new Date("2024-01-15T10:30:00Z"));
      expect(result.status).toBe("ON_TIME");
      expect(result.cosignPending).toBe(false);
      expect(result.isEdited).toBe(false);
      expect(result.isDeleted).toBe(false);
    });

    it("should handle missing optional fields with proper fallbacks", () => {
      const rawRecord = createMockRawRecord();

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.animalName).toBe("Unknown Animal");
      expect(result.medicationName).toBe("Unknown Medication");
      expect(result.caregiverName).toBe("Unknown");
      expect(result.strength).toBe("");
      expect(result.route).toBe("Unknown");
      expect(result.form).toBe("Unknown");
      expect(result.scheduledFor).toBeUndefined();
      expect(result.cosignUser).toBeUndefined();
      expect(result.cosignedAt).toBeUndefined();
      expect(result.sourceItem).toBeUndefined();
    });

    it("should build sourceItem when inventory data is available", () => {
      const rawRecord = createMockRawRecord({
        inventoryExpiresOn: new Date("2024-12-31T00:00:00Z"),
        inventoryItemName: "Generic Prednisone",
        inventoryLot: "LOT123",
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.sourceItem).toEqual({
        expiresOn: new Date("2024-12-31T00:00:00Z"),
        lot: "LOT123",
        name: "Generic Prednisone",
      });
    });

    it("should handle cosign data correctly", () => {
      const rawRecord = createMockRawRecord({
        coSignedAt: new Date("2024-01-15T14:30:00Z"),
        coSignerDetails: { name: "Dr. Johnson" },
        cosignPending: true,
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.cosignPending).toBe(true);
      expect(result.cosignUser).toBe("Dr. Johnson");
      expect(result.cosignedAt).toEqual(new Date("2024-01-15T14:30:00Z"));
    });

    it("should handle edit tracking data", () => {
      const rawRecord = createMockRawRecord({
        editedAt: new Date("2024-01-15T16:45:00Z"),
        editedBy: "Dr. Wilson",
        isEdited: true,
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.isEdited).toBe(true);
      expect(result.editedBy).toBe("Dr. Wilson");
      expect(result.editedAt).toEqual(new Date("2024-01-15T16:45:00Z"));
    });

    it("should preserve all medical workflow fields", () => {
      const rawRecord = createMockRawRecord({
        mediaUrls: ["image1.jpg", "image2.jpg"],
        medicationDisplayForm: "Tablet",
        medicationDisplayRoute: "Oral",
        medicationDisplayStrength: "5mg",
        notes: "Patient responded well",
        site: "Left thigh",
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.strength).toBe("5mg");
      expect(result.route).toBe("Oral");
      expect(result.form).toBe("Tablet");
      expect(result.site).toBe("Left thigh");
      expect(result.notes).toBe("Patient responded well");
      expect(result.media).toEqual(["image1.jpg", "image2.jpg"]);
    });
  });

  describe("transformRecords", () => {
    it("should transform multiple records correctly", () => {
      const rawRecords = [
        createMockRawRecord({ animalName: "Cat1", id: "record-1" }),
        createMockRawRecord({ animalName: "Cat2", id: "record-2" }),
        createMockRawRecord({ animalName: "Cat3", id: "record-3" }),
      ];

      const results = MedicalHistoryTransformer.transformRecords(rawRecords);

      expect(results).toHaveLength(3);
      expect(results[0]!.id).toBe("record-1");
      expect(results[0]!.animalName).toBe("Cat1");
      expect(results[1]!.id).toBe("record-2");
      expect(results[1]!.animalName).toBe("Cat2");
      expect(results[2]!.id).toBe("record-3");
      expect(results[2]!.animalName).toBe("Cat3");
    });

    it("should handle empty array", () => {
      const results = MedicalHistoryTransformer.transformRecords([]);
      expect(results).toEqual([]);
    });
  });

  describe("convenience functions", () => {
    it("transformMedicalRecord should work correctly", () => {
      const rawRecord = createMockRawRecord({ animalName: "TestAnimal" });
      const result = transformMedicalRecord(rawRecord);

      expect(result.animalName).toBe("TestAnimal");
      expect(result.id).toBe("test-id-123");
    });

    it("transformMedicalRecords should work correctly", () => {
      const rawRecords = [
        createMockRawRecord({ id: "test-1" }),
        createMockRawRecord({ id: "test-2" }),
      ];

      const results = transformMedicalRecords(rawRecords);

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe("test-1");
      expect(results[1]!.id).toBe("test-2");
    });
  });

  describe("medical data integrity", () => {
    it("should maintain type safety for status field", () => {
      const rawRecord = createMockRawRecord({ status: "LATE" });
      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.status).toBe("LATE");
      // This should compile without errors due to proper typing
      const isValidStatus: AdministrationRecord["status"] = result.status;
      expect(isValidStatus).toBe("LATE");
    });

    it("should handle complex inventory scenarios", () => {
      const rawRecord = createMockRawRecord({
        inventoryBrandOverride: "Generic Override",
        inventoryExpiresOn: undefined, // No expiration
        inventoryItemName: "Brand Name Med",
        inventoryLot: undefined, // No lot number
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.sourceItem).toEqual({
        expiresOn: undefined,
        lot: undefined,
        name: "Brand Name Med",
      });
    });

    it("should not create sourceItem when no inventory data exists", () => {
      const rawRecord = createMockRawRecord({
        inventoryBrandOverride: undefined,
        inventoryItemName: undefined,
        inventoryLot: undefined,
      });

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.sourceItem).toBeUndefined();
    });
  });
});
