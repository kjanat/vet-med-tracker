import {
  BaseDataTransformer,
  extractBoolean,
  extractOptionalArray,
  extractOptionalDate,
  extractOptionalString,
  extractRequiredString,
} from "@/lib/utils/data-transformer";
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

export class MedicalHistoryTransformer extends BaseDataTransformer<
  AdministrationRecord,
  RawAdministrationRecord
> {
  // Legacy static methods for backward compatibility
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
      animalName: extractRequiredString(record.animalName, "Unknown"),
      caregiverName: extractRequiredString(record.caregiverName, "Unknown"),
      id: record.id,
      media: extractOptionalArray(record.media),
      notes: extractOptionalString(record.notes),
      recordedAt: record.recordedAt,
      scheduledFor: extractOptionalDate(record.scheduledFor),
      slot: extractOptionalString(record.slot),
    };
  }

  private static extractTrackingFields(record: RawAdministrationRecord) {
    return {
      cosignedAt: extractOptionalDate(record.coSignedAt),
      cosignPending: extractBoolean(record.cosignPending),
      cosignUser: extractOptionalString(record.cosignUser),
      editedAt: extractOptionalDate(record.editedAt),
      editedBy: extractOptionalString(record.editedBy),
      isDeleted: extractBoolean(record.isDeleted),
      isEdited: extractBoolean(record.isEdited),
    };
  }

  private static extractMedicationFields(record: RawAdministrationRecord) {
    return {
      form: record.form || "",
      medicationName: extractRequiredString(record.medicationName, "Unknown"),
      route: record.route || "",
      site: extractOptionalString(record.site),
      strength: record.strength || "",
    };
  }

  private static buildSourceItem(
    record: RawAdministrationRecord,
  ): { name: string; lot?: string; expiresOn?: Date } | undefined {
    if (!record.sourceItemName) return undefined;

    return {
      expiresOn: extractOptionalDate(record.sourceItemExpiresOn),
      lot: extractOptionalString(record.sourceItemLot),
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

  // Implement BaseDataTransformer abstract methods
  override toApi(
    formData: AdministrationRecord,
    _context: Record<string, unknown>,
  ): Omit<RawAdministrationRecord, "id"> {
    return {
      animalId: formData.animalId,
      animalName: formData.animalName,
      caregiverName: formData.caregiverName,
      coSignedAt: formData.cosignedAt || null,
      cosignPending: formData.cosignPending,
      cosignUser: formData.cosignUser || null,
      editedAt: formData.editedAt || null,
      editedBy: formData.editedBy || null,
      form: formData.form,
      isDeleted: formData.isDeleted,
      isEdited: formData.isEdited,
      media: formData.media || null,
      medicationName: formData.medicationName,
      notes: formData.notes || null,
      recordedAt: formData.recordedAt,
      route: formData.route,
      scheduledFor: formData.scheduledFor || null,
      site: formData.site || null,
      slot: formData.slot || null,
      sourceItemExpiresOn: formData.sourceItem?.expiresOn || null,
      sourceItemLot: formData.sourceItem?.lot || null,
      sourceItemName: formData.sourceItem?.name || null,
      status: formData.status,
      strength: formData.strength,
    };
  }

  override toForm(apiData: RawAdministrationRecord): AdministrationRecord {
    return MedicalHistoryTransformer.transformSingleRecord(apiData);
  }

  override createDefaultValues(
    _options?: Record<string, unknown>,
  ): AdministrationRecord {
    return {
      animalId: "",
      animalName: "Unknown",
      caregiverName: "Unknown",
      cosignPending: false,
      form: "",
      id: "",
      isDeleted: false,
      isEdited: false,
      medicationName: "Unknown",
      recordedAt: new Date(),
      route: "",
      status: "PRN",
      strength: "",
    };
  }
}

// Export singleton instance for convenience (consistent with other transformers)
export const medicalHistoryTransformer = new MedicalHistoryTransformer();

// Export alias for backward compatibility
export const transformMedicalRecords =
  MedicalHistoryTransformer.transformAdministrationRecords.bind(
    MedicalHistoryTransformer,
  );
