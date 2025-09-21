/**
 * Medical History Transformer Service
 * Handles transformation of administration records from API format to UI format
 * Extracted from complex dashboard transformation logic to reduce cognitive complexity
 */

import type { AdministrationRecord } from "@/lib/utils/types";

/**
 * Raw administration record from API (tRPC response format)
 * Updated to use Date objects for Phase 1 timestamp migration
 */
export interface RawAdministrationRecord {
  id: string;
  animalId: string;
  animalName?: string | null;
  medicationDisplayName?: string | null;
  medicationDisplayStrength?: string | null;
  medicationDisplayRoute?: string | null;
  medicationDisplayForm?: string | null;
  scheduledFor?: Date | null;
  recordedAt: Date;
  caregiverName?: string | null;
  status: string;
  cosignPending?: boolean | null;
  coSignerDetails?: {
    name?: string | null;
  } | null;
  coSignedAt?: Date | null;
  inventoryLot?: string | null;
  inventoryItemName?: string | null;
  inventoryBrandOverride?: string | null;
  inventoryExpiresOn?: Date | null;
  site?: string | null;
  notes?: string | null;
  mediaUrls?: string[] | null;
  isEdited?: boolean | null;
  editedBy?: string | null;
  editedAt?: Date | null;
}

/**
 * Medical History Transformer Service Class
 * Handles complex record transformation with medical data integrity
 */
export class MedicalHistoryTransformer {
  /**
   * Transform raw API record to UI format
   * Maintains all medical workflow features while reducing complexity
   */
  static transformRecord(
    record: RawAdministrationRecord,
  ): AdministrationRecord {
    return {
      animalId: record.animalId,
      animalName: MedicalHistoryTransformer.getAnimalName(record),
      caregiverName: MedicalHistoryTransformer.getCaregiverName(record),
      cosignedAt: record.coSignedAt || undefined,
      cosignPending: record.cosignPending || false,
      cosignUser: MedicalHistoryTransformer.getCosignUser(record),
      editedAt: record.editedAt || undefined,
      editedBy: record.editedBy || undefined,
      form: MedicalHistoryTransformer.getMedicationForm(record),
      id: record.id,
      isDeleted: false, // Soft delete not implemented yet, but edit tracking covers audit requirements
      isEdited: record.isEdited || false,
      media: record.mediaUrls || undefined,
      medicationName: MedicalHistoryTransformer.getMedicationName(record),
      notes: record.notes || undefined,
      recordedAt: record.recordedAt,
      route: MedicalHistoryTransformer.getMedicationRoute(record),
      scheduledFor: record.scheduledFor || undefined,
      site: record.site || undefined,
      slot: undefined, // Could be derived from scheduledFor time vs regimen times
      sourceItem: MedicalHistoryTransformer.buildSourceItem(record),
      status: record.status as AdministrationRecord["status"],
      strength: MedicalHistoryTransformer.getMedicationStrength(record),
    };
  }

  /**
   * Transform multiple records efficiently
   */
  static transformRecords(
    records: RawAdministrationRecord[],
  ): AdministrationRecord[] {
    return records.map((record) =>
      MedicalHistoryTransformer.transformRecord(record),
    );
  }

  /**
   * Get animal name with fallback
   */
  private static getAnimalName(record: RawAdministrationRecord): string {
    return record.animalName || "Unknown Animal";
  }

  /**
   * Get medication name with fallback
   */
  private static getMedicationName(record: RawAdministrationRecord): string {
    return record.medicationDisplayName || "Unknown Medication";
  }

  /**
   * Get medication strength with fallback
   */
  private static getMedicationStrength(
    record: RawAdministrationRecord,
  ): string {
    return record.medicationDisplayStrength || "";
  }

  /**
   * Get medication route with fallback
   */
  private static getMedicationRoute(record: RawAdministrationRecord): string {
    return record.medicationDisplayRoute || "Unknown";
  }

  /**
   * Get medication form with fallback
   */
  private static getMedicationForm(record: RawAdministrationRecord): string {
    return record.medicationDisplayForm || "Unknown";
  }

  /**
   * Get caregiver name with fallback
   */
  private static getCaregiverName(record: RawAdministrationRecord): string {
    return record.caregiverName || "Unknown";
  }

  /**
   * Get cosign user name
   */
  private static getCosignUser(
    record: RawAdministrationRecord,
  ): string | undefined {
    return record.coSignerDetails?.name || undefined;
  }

  /**
   * Build source item object for inventory tracking
   * Handles complex conditional logic for inventory source tracking
   */
  private static buildSourceItem(
    record: RawAdministrationRecord,
  ): AdministrationRecord["sourceItem"] {
    // Only create sourceItem if we have inventory data
    if (!record.inventoryLot && !record.inventoryItemName) {
      return undefined;
    }

    return {
      expiresOn: record.inventoryExpiresOn
        ? new Date(record.inventoryExpiresOn)
        : undefined,
      lot: record.inventoryLot || undefined,
      name:
        record.inventoryItemName || record.inventoryBrandOverride || undefined,
    };
  }
}

/**
 * Convenience function for transforming a single record
 */
export function transformMedicalRecord(
  record: RawAdministrationRecord,
): AdministrationRecord {
  return MedicalHistoryTransformer.transformRecord(record);
}

/**
 * Convenience function for transforming multiple records
 */
export function transformMedicalRecords(
  records: RawAdministrationRecord[],
): AdministrationRecord[] {
  return MedicalHistoryTransformer.transformRecords(records);
}
