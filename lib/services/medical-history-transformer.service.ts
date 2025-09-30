import type { AdministrationRecord } from "@/lib/utils/types";

export interface MedicalRecord {
  id: string;
  date: Date;
  description: string;
  medication?: string;
  dosage?: string;
}

// Raw record from the API
interface RawAdministrationRecord {
  id: string;
  animalId: string;
  animalName?: string;
  medicationName?: string;
  strength?: string;
  route?: string;
  form?: string;
  slot?: string | null;
  scheduledFor: Date | null;
  recordedAt: Date;
  caregiverName?: string;
  status?: string;
  cosignPending?: boolean;
  cosignUser?: string | null;
  coSignedAt: Date | null;
  sourceItemName?: string | null;
  sourceItemLot?: string | null;
  sourceItemExpiresOn?: Date | null;
  site?: string | null;
  notes?: string | null;
  media?: string[] | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  editedBy?: string | null;
  editedAt: Date | null;
}

export class MedicalHistoryTransformer {
  static transformRecord(rawRecord: Record<string, unknown>): MedicalRecord {
    return {
      date: new Date((rawRecord["date"] as string | number) || Date.now()),
      description: (rawRecord["description"] as string) || "No description",
      dosage: rawRecord["dosage"] as string | undefined,
      id: (rawRecord["id"] as string) || "unknown",
      medication: rawRecord["medication"] as string | undefined,
    };
  }

  static transformRecords(
    rawRecords: Record<string, unknown>[],
  ): MedicalRecord[] {
    return rawRecords.map((record) =>
      MedicalHistoryTransformer.transformRecord(record),
    );
  }

  // Transform raw administration records to AdministrationRecord format
  static transformAdministrationRecords(
    rawRecords: RawAdministrationRecord[],
  ): AdministrationRecord[] {
    return rawRecords.map((record) =>
      MedicalHistoryTransformer.transformSingleRecord(record),
    );
  }

  private static transformSingleRecord(
    record: RawAdministrationRecord,
  ): AdministrationRecord {
    const baseFields = MedicalHistoryTransformer.extractBaseFields(record);
    const trackingFields =
      MedicalHistoryTransformer.extractTrackingFields(record);
    const medicationFields =
      MedicalHistoryTransformer.extractMedicationFields(record);

    return {
      ...baseFields,
      ...trackingFields,
      ...medicationFields,
      sourceItem: MedicalHistoryTransformer.buildSourceItem(record),
      status: MedicalHistoryTransformer.normalizeStatus(record.status),
    };
  }

  private static extractBaseFields(record: RawAdministrationRecord) {
    return {
      animalId: record.animalId,
      animalName: record.animalName || "Unknown",
      caregiverName: record.caregiverName || "Unknown",
      id: record.id,
      media: record.media || undefined,
      notes: record.notes || undefined,
      recordedAt: record.recordedAt,
      scheduledFor: record.scheduledFor || undefined,
      slot: record.slot || undefined,
    };
  }

  private static extractTrackingFields(record: RawAdministrationRecord) {
    return {
      cosignedAt: record.coSignedAt || undefined,
      cosignPending: record.cosignPending || false,
      cosignUser: record.cosignUser || undefined,
      editedAt: record.editedAt || undefined,
      editedBy: record.editedBy || undefined,
      isDeleted: record.isDeleted || false,
      isEdited: record.isEdited || false,
    };
  }

  private static extractMedicationFields(record: RawAdministrationRecord) {
    return {
      form: record.form || "",
      medicationName: record.medicationName || "Unknown",
      route: record.route || "",
      site: record.site || undefined,
      strength: record.strength || "",
    };
  }

  private static buildSourceItem(
    record: RawAdministrationRecord,
  ): { name: string; lot?: string; expiresOn?: Date } | undefined {
    if (!record.sourceItemName) return undefined;

    return {
      expiresOn: record.sourceItemExpiresOn || undefined,
      lot: record.sourceItemLot || undefined,
      name: record.sourceItemName,
    };
  }

  private static normalizeStatus(
    status?: string,
  ): "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN" {
    return (
      (status as "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN") || "PRN"
    );
  }
}

// Export alias for backward compatibility
export const transformMedicalRecords =
  MedicalHistoryTransformer.transformAdministrationRecords.bind(
    MedicalHistoryTransformer,
  );
