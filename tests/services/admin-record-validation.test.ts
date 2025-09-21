/**
 * Tests for AdminRecordValidationService
 */

import { describe, expect, it } from "bun:test";
import {
  type AdminRecord,
  AdminRecordValidationService,
  type DueRegimen,
} from "@/lib/services/admin-record-validation.service";
import type { InventorySource } from "@/types/inventory";

describe("AdminRecordValidationService", () => {
  // Mock data
  const mockRegimen: DueRegimen = {
    animalId: "animal-1",
    animalName: "Fluffy",
    animalSpecies: "Cat",
    compliance: 85,
    form: "Tablet",
    id: "regimen-1",
    isHighRisk: false,
    isPRN: false,
    medicationName: "Amoxicillin",
    requiresCoSign: false,
    route: "Oral",
    section: "due",
    strength: "250mg",
  };

  const mockHighRiskRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-2",
    isHighRisk: true,
    medicationName: "Insulin",
    requiresCoSign: true,
  };

  const mockPRNRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-3",
    isPRN: true,
    medicationName: "Pain Relief",
  };

  const mockAdminRecord: AdminRecord = {
    allowOverride: false,
    conditionTags: [],
    inventorySourceId: "inv-1",
    notes: "",
    photoUrls: [],
    requiresCoSign: false,
    selectedRegimen: mockRegimen,
    site: "",
  };

  const mockInventorySource: InventorySource = {
    brandName: "Generic",
    expiresOn: new Date("2025-12-31"),
    id: "inv-1",
    inUse: false,
    isExpired: false,
    isWrongMed: false,
    lot: "",
    name: "Amoxicillin 250mg",
    unitsRemaining: 10,
  };

  describe("validateAdministration", () => {
    it("should pass validation for valid record", () => {
      const result =
        AdminRecordValidationService.validateAdministration(mockAdminRecord);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when no regimen is selected", () => {
      const record = { ...mockAdminRecord, selectedRegimen: null };
      const result =
        AdminRecordValidationService.validateAdministration(record);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("No medication regimen selected");
    });

    it("should warn about high-risk medication without co-sign", () => {
      const record = {
        ...mockAdminRecord,
        requiresCoSign: false,
        selectedRegimen: mockHighRiskRegimen,
      };
      const result =
        AdminRecordValidationService.validateAdministration(record);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "High-risk medication should require co-sign verification",
      );
    });

    it("should warn about PRN medication without notes", () => {
      const record = {
        ...mockAdminRecord,
        notes: "",
        selectedRegimen: mockPRNRegimen,
      };
      const result =
        AdminRecordValidationService.validateAdministration(record);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "PRN medications should include reason for administration",
      );
    });

    it("should warn about high-risk medication without photo evidence", () => {
      const record = {
        ...mockAdminRecord,
        photoUrls: [],
        selectedRegimen: mockHighRiskRegimen,
      };
      const result =
        AdminRecordValidationService.validateAdministration(record);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Consider adding photo evidence for high-risk medications",
      );
    });

    it("should warn about injection without site specification", () => {
      const injectionRegimen = {
        ...mockRegimen,
        route: "Subcutaneous injection",
      };
      const record = {
        ...mockAdminRecord,
        selectedRegimen: injectionRegimen,
        site: "",
      };
      const result =
        AdminRecordValidationService.validateAdministration(record);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Consider specifying injection site");
    });
  });

  describe("validateInventorySource", () => {
    it("should pass validation for valid inventory source", () => {
      const result = AdminRecordValidationService.validateInventorySource(
        "inv-1",
        [mockInventorySource],
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should warn when no inventory source is selected", () => {
      const result = AdminRecordValidationService.validateInventorySource(
        null,
        [mockInventorySource],
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "No inventory source selected - administration will not track inventory",
      );
    });

    it("should fail when selected source is not found", () => {
      const result = AdminRecordValidationService.validateInventorySource(
        "invalid-id",
        [mockInventorySource],
        false,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Selected inventory source not found");
    });

    it("should fail when using expired medication without override", () => {
      const expiredSource = { ...mockInventorySource, isExpired: true };
      const result = AdminRecordValidationService.validateInventorySource(
        "inv-1",
        [expiredSource],
        false,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Cannot use expired medication without override approval",
      );
    });

    it("should pass when using expired medication with override", () => {
      const expiredSource = { ...mockInventorySource, isExpired: true };
      const result = AdminRecordValidationService.validateInventorySource(
        "inv-1",
        [expiredSource],
        true,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Using expired medication with override approval",
      );
    });

    it("should fail when medication mismatch detected without override", () => {
      const wrongMedSource = { ...mockInventorySource, isWrongMed: true };
      const result = AdminRecordValidationService.validateInventorySource(
        "inv-1",
        [wrongMedSource],
        false,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Medication mismatch detected - requires override approval",
      );
    });

    it("should warn about low inventory", () => {
      const lowQuantitySource = { ...mockInventorySource, quantity: 1 };
      const result = AdminRecordValidationService.validateInventorySource(
        "inv-1",
        [lowQuantitySource],
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Low inventory - consider reordering this medication",
      );
    });
  });

  describe("validateMedicalCompliance", () => {
    it("should warn about low compliance rate", () => {
      const lowComplianceRegimen = { ...mockRegimen, compliance: 65 };
      const result =
        AdminRecordValidationService.validateMedicalCompliance(
          lowComplianceRegimen,
        );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Low compliance rate (65%) - consider reviewing schedule",
      );
    });

    it("should warn about overdue medication", () => {
      const overdueRegimen = {
        ...mockRegimen,
        isOverdue: true,
        minutesUntilDue: -300, // 5 hours overdue
      };
      const result =
        AdminRecordValidationService.validateMedicalCompliance(overdueRegimen);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Medication is 5.0 hours overdue");
    });

    it("should warn about recent administration", () => {
      const recentAdminRegimen = {
        ...mockRegimen,
        lastAdministration: {
          id: "admin-1",
          recordedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          status: "completed",
        },
      };
      const result =
        AdminRecordValidationService.validateMedicalCompliance(
          recentAdminRegimen,
        );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Medication was recently administered - verify dosing schedule",
      );
    });
  });

  describe("validateConditionTags", () => {
    it("should pass validation for valid tags", () => {
      const result = AdminRecordValidationService.validateConditionTags([
        "Normal",
        "Improved",
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for invalid tags", () => {
      const result = AdminRecordValidationService.validateConditionTags([
        "Invalid",
        "Bad Tag",
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid condition tags: Invalid, Bad Tag",
      );
    });

    it("should warn about conflicting tags", () => {
      const result = AdminRecordValidationService.validateConditionTags([
        "Worse",
        "Improved",
      ]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Conflicting condition tags selected - please review",
      );
    });

    it("should warn about side effects", () => {
      const result = AdminRecordValidationService.validateConditionTags([
        "Side Effects",
      ]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Side effects reported - consider veterinary consultation",
      );
    });
  });

  describe("validatePhotoEvidence", () => {
    it("should pass validation for valid photo URLs", () => {
      const result = AdminRecordValidationService.validatePhotoEvidence([
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when too many photos are provided", () => {
      const photos = Array.from(
        { length: 5 },
        (_, i) => `https://example.com/photo${i + 1}.jpg`,
      );
      const result = AdminRecordValidationService.validatePhotoEvidence(photos);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Maximum 4 photos allowed per administration",
      );
    });

    it("should fail for invalid photo URLs", () => {
      const result = AdminRecordValidationService.validatePhotoEvidence([
        "invalid-url",
        "another-bad-url",
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid photo URLs detected");
    });
  });

  describe("validateComplete", () => {
    it("should combine all validations correctly", () => {
      const record: AdminRecord = {
        allowOverride: false,
        conditionTags: ["Normal"],
        inventorySourceId: "inv-1",
        notes: "Test administration",
        photoUrls: ["https://example.com/photo.jpg"],
        requiresCoSign: true,
        selectedRegimen: mockHighRiskRegimen,
        site: "Left leg",
      };

      const result = AdminRecordValidationService.validateComplete(record, [
        mockInventorySource,
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should collect all errors from different validation methods", () => {
      const record: AdminRecord = {
        allowOverride: false,
        conditionTags: ["Invalid Tag"],
        inventorySourceId: "invalid-id",
        notes: "",
        photoUrls: Array.from(
          { length: 5 },
          (_, i) => `https://example.com/photo${i}.jpg`,
        ),
        requiresCoSign: false,
        selectedRegimen: null,
        site: "",
      };

      const result = AdminRecordValidationService.validateComplete(record, [
        mockInventorySource,
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain("No medication regimen selected");
      expect(result.errors).toContain("Selected inventory source not found");
      expect(result.errors).toContain("Invalid condition tags: Invalid Tag");
      expect(result.errors).toContain(
        "Maximum 4 photos allowed per administration",
      );
    });
  });
});
