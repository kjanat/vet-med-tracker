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
  static transformRecord(rawRecord: any): MedicalRecord {
    return {
      date: new Date(rawRecord.date || Date.now()),
      description: rawRecord.description || "No description",
      dosage: rawRecord.dosage,
      id: rawRecord.id || "unknown",
      medication: rawRecord.medication,
    };
  }

  static transformRecords(rawRecords: any[]): MedicalRecord[] {
    return rawRecords.map((record) =>
      MedicalHistoryTransformer.transformRecord(record),
    );
  }

  // Transform raw administration records to AdministrationRecord format
  static transformAdministrationRecords(
    rawRecords: RawAdministrationRecord[],
  ): AdministrationRecord[] {
    return rawRecords.map((record) => ({
      animalId: record.animalId,
      animalName: record.animalName || "Unknown",
      caregiverName: record.caregiverName || "Unknown",
      cosignedAt: record.coSignedAt || undefined,
      cosignPending: record.cosignPending || false,
      cosignUser: record.cosignUser || undefined,
      editedAt: record.editedAt || undefined,
      editedBy: record.editedBy || undefined,
      form: record.form || "",
      id: record.id,
      isDeleted: record.isDeleted || false,
      isEdited: record.isEdited || false,
      media: record.media || undefined,
      medicationName: record.medicationName || "Unknown",
      notes: record.notes || undefined,
      recordedAt: record.recordedAt,
      route: record.route || "",
      scheduledFor: record.scheduledFor || undefined,
      site: record.site || undefined,
      slot: record.slot || undefined,
      sourceItem: record.sourceItemName
        ? {
            expiresOn: record.sourceItemExpiresOn || undefined,
            lot: record.sourceItemLot || undefined,
            name: record.sourceItemName,
          }
        : undefined,
      status: (record.status as any) || "PRN",
      strength: record.strength || "",
    }));
  }
}

// Export alias for backward compatibility
export const transformMedicalRecords =
  MedicalHistoryTransformer.transformAdministrationRecords.bind(
    MedicalHistoryTransformer,
  );
