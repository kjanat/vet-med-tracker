import { describe, expect, test } from "bun:test";
import { MedicalHistoryTransformer } from "@/lib/services/medical-history-transformer.service.ts";
import type { AdministrationRecord } from "@/lib/utils/types.ts";

describe("MedicalHistoryTransformer", () => {
  describe("transformRecord", () => {
    test("should transform basic medical record", () => {
      const rawRecord = {
        date: "2024-01-15",
        description: "Annual checkup",
        dosage: "100mg",
        id: "123",
        medication: "Aspirin",
      };

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.id).toBe("123");
      expect(result.date).toBeInstanceOf(Date);
      expect(result.description).toBe("Annual checkup");
      expect(result.medication).toBe("Aspirin");
      expect(result.dosage).toBe("100mg");
    });

    test("should handle missing optional fields", () => {
      const rawRecord = {
        date: Date.now(),
        id: "456",
      };

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.id).toBe("456");
      expect(result.description).toBe("No description");
      expect(result.medication).toBeUndefined();
      expect(result.dosage).toBeUndefined();
    });

    test("should handle missing id with fallback", () => {
      const rawRecord = {
        date: "2024-01-15",
      };

      const result = MedicalHistoryTransformer.transformRecord(rawRecord);

      expect(result.id).toBe("unknown");
    });
  });

  describe("transformRecords", () => {
    test("should transform multiple records", () => {
      const rawRecords = [
        { date: "2024-01-15", description: "First", id: "1" },
        { date: "2024-01-16", description: "Second", id: "2" },
      ];

      const results = MedicalHistoryTransformer.transformRecords(rawRecords);

      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe("1");
      expect(results[1]?.id).toBe("2");
    });

    test("should handle empty array", () => {
      const results = MedicalHistoryTransformer.transformRecords([]);
      expect(results).toEqual([]);
    });
  });

  describe("transformAdministrationRecords", () => {
    test("should transform complete administration record", () => {
      const rawRecord = {
        animalId: "animal-123",
        animalName: "Fluffy",
        caregiverName: "Dr. Smith",
        coSignedAt: null,
        cosignPending: false,
        cosignUser: null,
        editedAt: null,
        editedBy: null,
        form: "tablet",
        id: "admin-1",
        isDeleted: false,
        isEdited: false,
        media: ["photo1.jpg"],
        medicationName: "Amoxicillin",
        notes: "No issues",
        recordedAt: new Date("2024-01-15T09:05:00Z"),
        route: "oral",
        scheduledFor: new Date("2024-01-15T09:00:00Z"),
        site: "left leg",
        slot: "morning",
        sourceItemExpiresOn: new Date("2025-12-31"),
        sourceItemLot: "LOT-456",
        sourceItemName: "Amox Batch 123",
        status: "ON_TIME",
        strength: "500mg",
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      expect(results).toHaveLength(1);
      const record = results[0] as AdministrationRecord;

      expect(record.id).toBe("admin-1");
      expect(record.animalId).toBe("animal-123");
      expect(record.animalName).toBe("Fluffy");
      expect(record.medicationName).toBe("Amoxicillin");
      expect(record.strength).toBe("500mg");
      expect(record.route).toBe("oral");
      expect(record.form).toBe("tablet");
      expect(record.status).toBe("ON_TIME");
      expect(record.caregiverName).toBe("Dr. Smith");
      expect(record.site).toBe("left leg");
      expect(record.notes).toBe("No issues");
      expect(record.media).toEqual(["photo1.jpg"]);
    });

    test("should handle minimal administration record with defaults", () => {
      const rawRecord = {
        animalId: "animal-456",
        coSignedAt: null,
        editedAt: null,
        id: "admin-2",
        recordedAt: new Date("2024-01-15T10:00:00Z"),
        scheduledFor: null,
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      expect(results).toHaveLength(1);
      const record = results[0] as AdministrationRecord;

      expect(record.id).toBe("admin-2");
      expect(record.animalName).toBe("Unknown");
      expect(record.medicationName).toBe("Unknown");
      expect(record.caregiverName).toBe("Unknown");
      expect(record.form).toBe("");
      expect(record.route).toBe("");
      expect(record.strength).toBe("");
      expect(record.status).toBe("PRN");
      expect(record.cosignPending).toBe(false);
      expect(record.isDeleted).toBe(false);
      expect(record.isEdited).toBe(false);
    });

    test("should handle source item correctly", () => {
      const withSource = {
        animalId: "animal-789",
        coSignedAt: null,
        editedAt: null,
        id: "admin-3",
        recordedAt: new Date(),
        scheduledFor: null,
        sourceItemExpiresOn: new Date("2025-06-30"),
        sourceItemLot: "LOT-999",
        sourceItemName: "Med Batch X",
      };

      const withoutSource = {
        animalId: "animal-999",
        coSignedAt: null,
        editedAt: null,
        id: "admin-4",
        recordedAt: new Date(),
        scheduledFor: null,
        sourceItemExpiresOn: null,
        sourceItemLot: null,
        sourceItemName: null,
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        withSource,
        withoutSource,
      ]);

      const recordWithSource = results[0] as AdministrationRecord;
      const recordWithoutSource = results[1] as AdministrationRecord;

      expect(recordWithSource.sourceItem).toBeDefined();
      expect(recordWithSource.sourceItem?.name).toBe("Med Batch X");
      expect(recordWithSource.sourceItem?.lot).toBe("LOT-999");

      expect(recordWithoutSource.sourceItem).toBeUndefined();
    });

    test("should normalize all valid status values", () => {
      const statuses = [
        "ON_TIME",
        "LATE",
        "VERY_LATE",
        "MISSED",
        "PRN",
      ] as const;

      for (const status of statuses) {
        const rawRecord = {
          animalId: "animal-test",
          coSignedAt: null,
          editedAt: null,
          id: `admin-${status}`,
          recordedAt: new Date(),
          scheduledFor: null,
          status,
        };

        const results =
          MedicalHistoryTransformer.transformAdministrationRecords([rawRecord]);

        expect(results[0]?.status).toBe(status);
      }
    });

    test("should default to PRN for missing or invalid status", () => {
      const rawRecord = {
        animalId: "animal-test",
        coSignedAt: null,
        editedAt: null,
        id: "admin-no-status",
        recordedAt: new Date(),
        scheduledFor: null,
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      expect(results[0]?.status).toBe("PRN");
    });

    test("should handle cosign fields correctly", () => {
      const rawRecord = {
        animalId: "animal-cosign",
        coSignedAt: new Date("2024-01-15T11:00:00Z"),
        cosignPending: true,
        cosignUser: "Dr. Jones",
        editedAt: null,
        id: "admin-cosign",
        recordedAt: new Date(),
        scheduledFor: null,
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      const record = results[0] as AdministrationRecord;

      expect(record.cosignPending).toBe(true);
      expect(record.cosignUser).toBe("Dr. Jones");
      expect(record.cosignedAt).toBeInstanceOf(Date);
    });

    test("should handle edit tracking fields", () => {
      const rawRecord = {
        animalId: "animal-edit",
        coSignedAt: null,
        editedAt: new Date("2024-01-15T12:00:00Z"),
        editedBy: "admin@example.com",
        id: "admin-edited",
        isDeleted: false,
        isEdited: true,
        recordedAt: new Date(),
        scheduledFor: null,
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      const record = results[0] as AdministrationRecord;

      expect(record.isEdited).toBe(true);
      expect(record.editedBy).toBe("admin@example.com");
      expect(record.editedAt).toBeInstanceOf(Date);
      expect(record.isDeleted).toBe(false);
    });

    test("should transform empty array", () => {
      const results = MedicalHistoryTransformer.transformAdministrationRecords(
        [],
      );
      expect(results).toEqual([]);
    });

    test("should preserve all date objects", () => {
      const scheduledDate = new Date("2024-01-15T09:00:00Z");
      const recordedDate = new Date("2024-01-15T09:05:00Z");
      const cosignDate = new Date("2024-01-15T09:10:00Z");
      const editedDate = new Date("2024-01-15T09:15:00Z");
      const expiresDate = new Date("2025-12-31");

      const rawRecord = {
        animalId: "animal-dates",
        coSignedAt: cosignDate,
        editedAt: editedDate,
        id: "admin-dates",
        recordedAt: recordedDate,
        scheduledFor: scheduledDate,
        sourceItemExpiresOn: expiresDate,
        sourceItemLot: "LOT-001",
        sourceItemName: "Test Med",
      };

      const results = MedicalHistoryTransformer.transformAdministrationRecords([
        rawRecord,
      ]);

      const record = results[0] as AdministrationRecord;

      expect(record.scheduledFor).toBe(scheduledDate);
      expect(record.recordedAt).toBe(recordedDate);
      expect(record.cosignedAt).toBe(cosignDate);
      expect(record.editedAt).toBe(editedDate);
      expect(record.sourceItem?.expiresOn).toBe(expiresDate);
    });
  });
});
