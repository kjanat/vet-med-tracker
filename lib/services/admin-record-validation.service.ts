/**
 * AdminRecordValidationService
 *
 * Handles form validation, medical safety checks, and business rule enforcement
 * for medication administration records.
 */

import type { InventorySource } from "@/types/inventory";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DueRegimen {
  id: string;
  animalId: string;
  animalName: string;
  animalSpecies?: string;
  animalPhotoUrl?: string | null;
  medicationName: string;
  brandName?: string | null;
  route: string;
  form: string;
  strength: string;
  dose?: string;
  targetTime?: string;
  isPRN: boolean;
  isHighRisk: boolean;
  requiresCoSign: boolean;
  compliance: number;
  section: "due" | "later" | "prn";
  isOverdue?: boolean;
  minutesUntilDue?: number;
  instructions?: string | null;
  prnReason?: string | null;
  lastAdministration?: {
    id: string;
    recordedAt: string;
    status: string;
  } | null;
}

export interface AdminRecord {
  selectedRegimen: DueRegimen | null;
  inventorySourceId: string | null;
  allowOverride: boolean;
  requiresCoSign: boolean;
  notes: string;
  site: string;
  conditionTags: string[];
  photoUrls: string[];
}

export class AdminRecordValidationService {
  /**
   * Validates a complete administration record before submission
   */
  static validateAdministration(record: AdminRecord): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!record.selectedRegimen) {
      errors.push("No medication regimen selected");
    }

    // High-risk medication validation
    if (record.selectedRegimen?.isHighRisk) {
      if (!record.requiresCoSign) {
        warnings.push(
          "High-risk medication should require co-sign verification",
        );
      }
    }

    // PRN medication validation
    if (record.selectedRegimen?.isPRN && !record.notes.trim()) {
      warnings.push("PRN medications should include reason for administration");
    }

    // Photo evidence validation for high-risk meds
    if (record.selectedRegimen?.isHighRisk && record.photoUrls.length === 0) {
      warnings.push("Consider adding photo evidence for high-risk medications");
    }

    // Site validation for injections
    if (
      record.selectedRegimen?.route.toLowerCase().includes("injection") &&
      !record.site.trim()
    ) {
      warnings.push("Consider specifying injection site");
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validates inventory source selection and override requirements
   */
  static validateInventorySource(
    sourceId: string | null,
    sources: InventorySource[],
    allowOverride: boolean,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sourceId) {
      warnings.push(
        "No inventory source selected - administration will not track inventory",
      );
      return { errors, isValid: true, warnings };
    }

    const selectedSource = sources.find((s) => s.id === sourceId);
    if (!selectedSource) {
      errors.push("Selected inventory source not found");
      return { errors, isValid: false, warnings };
    }

    // Check for expired medication
    if (selectedSource.isExpired && !allowOverride) {
      errors.push("Cannot use expired medication without override approval");
    }

    // Check for wrong medication
    if (selectedSource.isWrongMed && !allowOverride) {
      errors.push("Medication mismatch detected - requires override approval");
    }

    const remainingUnits =
      AdminRecordValidationService.getUnitsRemaining(selectedSource);

    // Check for low quantity
    if (remainingUnits <= 1) {
      warnings.push("Low inventory - consider reordering this medication");
    }

    // Expired medication warning
    if (selectedSource.isExpired && allowOverride) {
      warnings.push("Using expired medication with override approval");
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  private static getUnitsRemaining(source: InventorySource): number {
    const quantity = (source as { quantity?: number }).quantity;
    if (typeof quantity === "number") {
      return quantity;
    }

    return typeof source.unitsRemaining === "number"
      ? source.unitsRemaining
      : 0;
  }

  /**
   * Validates medical compliance and timing requirements
   */
  static validateMedicalCompliance(regimen: DueRegimen): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Compliance threshold check
    if (regimen.compliance < 70) {
      warnings.push(
        `Low compliance rate (${regimen.compliance}%) - consider reviewing schedule`,
      );
    }

    // Overdue medication check
    if (regimen.isOverdue && regimen.minutesUntilDue) {
      const hoursOverdue = Math.abs(regimen.minutesUntilDue) / 60;
      if (hoursOverdue > 4) {
        warnings.push(`Medication is ${hoursOverdue.toFixed(1)} hours overdue`);
      }
    }

    // Recent administration check
    if (regimen.lastAdministration) {
      const lastAdmin = new Date(regimen.lastAdministration.recordedAt);
      const now = new Date();
      const hoursSinceLastAdmin =
        (now.getTime() - lastAdmin.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAdmin < 1 && !regimen.isPRN) {
        warnings.push(
          "Medication was recently administered - verify dosing schedule",
        );
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validates condition tags for medical appropriateness
   */
  static validateConditionTags(tags: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validTags = [
      "Normal",
      "Improved",
      "No Change",
      "Worse",
      "Side Effects",
    ];
    const invalidTags = tags.filter((tag) => !validTags.includes(tag));

    if (invalidTags.length > 0) {
      errors.push(`Invalid condition tags: ${invalidTags.join(", ")}`);
    }

    // Check for concerning combinations
    if (tags.includes("Worse") && tags.includes("Improved")) {
      warnings.push("Conflicting condition tags selected - please review");
    }

    if (tags.includes("Side Effects")) {
      warnings.push("Side effects reported - consider veterinary consultation");
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Validates photo evidence requirements and limits
   */
  static validatePhotoEvidence(photoUrls: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (photoUrls.length > 4) {
      errors.push("Maximum 4 photos allowed per administration");
    }

    // Validate URL format (basic check)
    const invalidUrls = photoUrls.filter((url) => !url.startsWith("http"));
    if (invalidUrls.length > 0) {
      errors.push("Invalid photo URLs detected");
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Comprehensive validation combining all validation rules
   */
  static validateComplete(
    record: AdminRecord,
    inventorySources: InventorySource[],
  ): ValidationResult {
    const adminValidation =
      AdminRecordValidationService.validateAdministration(record);
    const inventoryValidation =
      AdminRecordValidationService.validateInventorySource(
        record.inventorySourceId,
        inventorySources,
        record.allowOverride,
      );
    const complianceValidation = record.selectedRegimen
      ? AdminRecordValidationService.validateMedicalCompliance(
          record.selectedRegimen,
        )
      : { errors: [], isValid: true, warnings: [] };
    const tagsValidation = AdminRecordValidationService.validateConditionTags(
      record.conditionTags,
    );
    const photoValidation = AdminRecordValidationService.validatePhotoEvidence(
      record.photoUrls,
    );

    const allErrors = [
      ...adminValidation.errors,
      ...inventoryValidation.errors,
      ...complianceValidation.errors,
      ...tagsValidation.errors,
      ...photoValidation.errors,
    ];

    const allWarnings = [
      ...adminValidation.warnings,
      ...inventoryValidation.warnings,
      ...complianceValidation.warnings,
      ...tagsValidation.warnings,
      ...photoValidation.warnings,
    ];

    return {
      errors: allErrors,
      isValid: allErrors.length === 0,
      warnings: allWarnings,
    };
  }
}
