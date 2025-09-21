/**
 * Tests for AdminRecordDataService
 */

import { describe, expect, it, jest } from "bun:test";
import {
  type AdminPayload,
  AdminRecordDataService,
  type MutationCallbacks,
} from "@/lib/services/admin-record-data.service";
import type { DueRegimen } from "@/lib/services/admin-record-validation.service";
import type { WorkflowState } from "@/lib/services/admin-record-workflow.service";
import type { InventorySource } from "@/types/inventory";

describe("AdminRecordDataService", () => {
  // Mock data
  const mockRegimen: DueRegimen = {
    animalId: "animal-1",
    animalName: "Fluffy",
    animalSpecies: "Cat",
    compliance: 85,
    dose: "5ml",
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

  const mockPRNRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-2",
    isPRN: true,
  };

  const mockWorkflowState: WorkflowState = {
    allowOverride: false,
    conditionTags: ["Normal"],
    inventorySourceId: "inv-1",
    isSubmitting: false,
    notes: "Test notes",
    photoUrls: ["https://example.com/photo.jpg"],
    requiresCoSign: false,
    selectedAnimalId: "animal-1",
    selectedRegimen: mockRegimen,
    site: "Left leg",
    step: "confirm",
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

  describe("createAdminPayload", () => {
    it("should create valid administration payload", () => {
      const result = AdminRecordDataService.createAdminPayload(
        mockWorkflowState,
        "household-1",
        "America/New_York",
      );

      expect(result.householdId).toBe("household-1");
      expect(result.animalId).toBe("animal-1");
      expect(result.regimenId).toBe("regimen-1");
      expect(result.inventorySourceId).toBe("inv-1");
      expect(result.notes).toBe("Test notes");
      expect(result.site).toBe("Left leg");
      expect(result.conditionTags).toEqual(["Normal"]);
      expect(result.mediaUrls).toEqual(["https://example.com/photo.jpg"]);
      expect(result.requiresCoSign).toBe(false);
      expect(result.allowOverride).toBe(false);
      expect(result.dose).toBe("5ml");
      expect(result.idempotencyKey).toBeDefined();
      expect(result.administeredAt).toBeDefined();
    });

    it("should handle PRN medication status", () => {
      const prnState = {
        ...mockWorkflowState,
        selectedRegimen: mockPRNRegimen,
      };

      const result = AdminRecordDataService.createAdminPayload(
        prnState,
        "household-1",
        "UTC",
      );

      expect(result.status).toBe("PRN");
    });

    it("should handle empty optional fields", () => {
      const minimalState: WorkflowState = {
        ...mockWorkflowState,
        conditionTags: [],
        inventorySourceId: null,
        notes: "",
        photoUrls: [],
        site: "",
      };

      const result = AdminRecordDataService.createAdminPayload(
        minimalState,
        "household-1",
        "UTC",
      );

      expect(result.inventorySourceId).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.site).toBeUndefined();
      expect(result.conditionTags).toBeUndefined();
      expect(result.mediaUrls).toBeUndefined();
    });

    it("should throw error when no regimen is selected", () => {
      const invalidState = {
        ...mockWorkflowState,
        selectedRegimen: null,
      };

      expect(() => {
        AdminRecordDataService.createAdminPayload(
          invalidState,
          "household-1",
          "UTC",
        );
      }).toThrow("No regimen selected for administration");
    });
  });

  describe("createInventoryPayload", () => {
    it("should create valid inventory update payload", () => {
      const result = AdminRecordDataService.createInventoryPayload(
        "inv-1",
        "household-1",
        "Fluffy",
      );

      expect(result.id).toBe("inv-1");
      expect(result.householdId).toBe("household-1");
      expect(result.quantityChange).toBe(-1);
      expect(result.reason).toBe("Administration for Fluffy");
    });
  });

  describe("processAdministration", () => {
    it("should handle successful administration", async () => {
      const mockMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockCallbacks: Pick<
        MutationCallbacks,
        "onAdminSuccess" | "onAdminError"
      > = {
        onAdminError: jest.fn(),
        onAdminSuccess: jest.fn().mockResolvedValue(undefined),
      };

      const payload: AdminPayload = {
        administeredAt: new Date().toISOString(),
        allowOverride: false,
        animalId: "animal-1",
        householdId: "household-1",
        idempotencyKey: "test-key",
        regimenId: "regimen-1",
        requiresCoSign: false,
      };

      await AdminRecordDataService.processAdministration(
        payload,
        mockMutation,
        mockCallbacks,
      );

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(payload);
      expect(mockCallbacks.onAdminSuccess).toHaveBeenCalled();
      expect(mockCallbacks.onAdminError).not.toHaveBeenCalled();
    });

    it("should handle administration error", async () => {
      const mockError = new Error("Network error");
      const mockMutation = {
        mutateAsync: jest.fn().mockRejectedValue(mockError),
      };
      const mockCallbacks: Pick<
        MutationCallbacks,
        "onAdminSuccess" | "onAdminError"
      > = {
        onAdminError: jest.fn(),
        onAdminSuccess: jest.fn(),
      };

      const payload: AdminPayload = {
        administeredAt: new Date().toISOString(),
        allowOverride: false,
        animalId: "animal-1",
        householdId: "household-1",
        idempotencyKey: "test-key",
        regimenId: "regimen-1",
        requiresCoSign: false,
      };

      await AdminRecordDataService.processAdministration(
        payload,
        mockMutation,
        mockCallbacks,
      );

      expect(mockCallbacks.onAdminSuccess).not.toHaveBeenCalled();
      expect(mockCallbacks.onAdminError).toHaveBeenCalledWith(mockError);
    });
  });

  describe("processInventoryUpdate", () => {
    it("should handle successful inventory update", async () => {
      const mockMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockCallbacks: Pick<
        MutationCallbacks,
        "onInventorySuccess" | "onInventoryError"
      > = {
        onInventoryError: jest.fn(),
        onInventorySuccess: jest.fn().mockResolvedValue(undefined),
      };

      const payload = {
        householdId: "household-1",
        id: "inv-1",
        quantityChange: -1,
        reason: "Administration for Fluffy",
      };

      await AdminRecordDataService.processInventoryUpdate(
        payload,
        mockMutation,
        mockCallbacks,
      );

      expect(mockMutation.mutateAsync).toHaveBeenCalledWith(payload);
      expect(mockCallbacks.onInventorySuccess).toHaveBeenCalled();
      expect(mockCallbacks.onInventoryError).not.toHaveBeenCalled();
    });

    it("should handle inventory update error", async () => {
      const mockError = new Error("Inventory error");
      const mockMutation = {
        mutateAsync: jest.fn().mockRejectedValue(mockError),
      };
      const mockCallbacks: Pick<
        MutationCallbacks,
        "onInventorySuccess" | "onInventoryError"
      > = {
        onInventoryError: jest.fn(),
        onInventorySuccess: jest.fn(),
      };

      const payload = {
        householdId: "household-1",
        id: "inv-1",
        quantityChange: -1,
        reason: "Administration for Fluffy",
      };

      await AdminRecordDataService.processInventoryUpdate(
        payload,
        mockMutation,
        mockCallbacks,
      );

      expect(mockCallbacks.onInventorySuccess).not.toHaveBeenCalled();
      expect(mockCallbacks.onInventoryError).toHaveBeenCalledWith(mockError);
    });
  });

  describe("submitAdministration", () => {
    it("should orchestrate complete submission workflow", async () => {
      const mockAdminMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockInventoryMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockCallbacks: MutationCallbacks = {
        onAdminError: jest.fn(),
        onAdminSuccess: jest.fn().mockResolvedValue(undefined),
        onInventoryError: jest.fn(),
        onInventorySuccess: jest.fn().mockResolvedValue(undefined),
      };

      await AdminRecordDataService.submitAdministration(
        mockWorkflowState,
        "household-1",
        "UTC",
        {
          createAdminMutation: mockAdminMutation,
          updateInventoryMutation: mockInventoryMutation,
        },
        mockCallbacks,
      );

      expect(mockAdminMutation.mutateAsync).toHaveBeenCalled();
      expect(mockInventoryMutation.mutateAsync).toHaveBeenCalled();
      expect(mockCallbacks.onAdminSuccess).toHaveBeenCalled();
      expect(mockCallbacks.onInventorySuccess).toHaveBeenCalled();
    });

    it("should skip inventory update when no source is selected", async () => {
      const stateWithoutInventory = {
        ...mockWorkflowState,
        inventorySourceId: null,
      };

      const mockAdminMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockInventoryMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
      };
      const mockCallbacks: MutationCallbacks = {
        onAdminError: jest.fn(),
        onAdminSuccess: jest.fn().mockResolvedValue(undefined),
        onInventoryError: jest.fn(),
        onInventorySuccess: jest.fn().mockResolvedValue(undefined),
      };

      await AdminRecordDataService.submitAdministration(
        stateWithoutInventory,
        "household-1",
        "UTC",
        {
          createAdminMutation: mockAdminMutation,
          updateInventoryMutation: mockInventoryMutation,
        },
        mockCallbacks,
      );

      expect(mockAdminMutation.mutateAsync).toHaveBeenCalled();
      expect(mockInventoryMutation.mutateAsync).not.toHaveBeenCalled();
      expect(mockCallbacks.onAdminSuccess).toHaveBeenCalled();
      expect(mockCallbacks.onInventorySuccess).not.toHaveBeenCalled();
    });
  });

  describe("transformRegimenForDisplay", () => {
    it("should transform regimen with time formatting", () => {
      const regimenWithTime = {
        ...mockRegimen,
        targetTime: "2024-01-01T10:30:00Z",
      };

      const result = AdminRecordDataService.transformRegimenForDisplay(
        regimenWithTime,
        "America/New_York",
      );

      expect(result.timeDisplay).toBeDefined();
      expect(result.complianceDisplay).toBe("85% compliance");
      expect(result.isUrgent).toBe(false);
    });

    it("should handle regimen without target time", () => {
      const result = AdminRecordDataService.transformRegimenForDisplay(
        mockRegimen,
        "UTC",
      );

      expect(result.timeDisplay).toBe("As needed");
    });

    it("should identify urgent regimens", () => {
      const urgentRegimen = {
        ...mockRegimen,
        isOverdue: true,
        minutesUntilDue: -300, // 5 hours overdue
      };

      const result = AdminRecordDataService.transformRegimenForDisplay(
        urgentRegimen,
        "UTC",
      );

      expect(result.isUrgent).toBe(true);
    });
  });

  describe("filterInventorySources", () => {
    const sources: InventorySource[] = [
      { ...mockInventorySource, name: "Amoxicillin 250mg" },
      { ...mockInventorySource, id: "inv-2", name: "Metacam 5mg" },
      { ...mockInventorySource, id: "inv-3", name: "Amoxicillin 500mg" },
    ];

    it("should filter sources by medication name", () => {
      const result = AdminRecordDataService.filterInventorySources(
        sources,
        "Amoxicillin",
      );

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.name.includes("Amoxicillin"))).toBe(true);
    });

    it("should be case insensitive", () => {
      const result = AdminRecordDataService.filterInventorySources(
        sources,
        "amoxicillin",
      );

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no matches", () => {
      const result = AdminRecordDataService.filterInventorySources(
        sources,
        "Nonexistent",
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("validateInventorySelection", () => {
    const sources: InventorySource[] = [mockInventorySource];

    it("should validate valid inventory selection", () => {
      const result = AdminRecordDataService.validateInventorySelection(
        "inv-1",
        sources,
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(true);
    });

    it("should handle no inventory selection", () => {
      const result = AdminRecordDataService.validateInventorySelection(
        null,
        sources,
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.warnings).toContain(
        "No inventory source selected - administration will not track inventory",
      );
    });

    it("should handle expired medication without override", () => {
      const expiredSource = { ...mockInventorySource, isExpired: true };
      const result = AdminRecordDataService.validateInventorySelection(
        "inv-1",
        [expiredSource],
        false,
      );

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(false);
      expect(result.warnings).toContain(
        "Cannot use expired medication without override approval",
      );
    });

    it("should handle expired medication with override", () => {
      const expiredSource = { ...mockInventorySource, isExpired: true };
      const result = AdminRecordDataService.validateInventorySelection(
        "inv-1",
        [expiredSource],
        true,
      );

      expect(result.isValid).toBe(true);
      expect(result.canSubmit).toBe(true);
      expect(result.warnings).toContain(
        "Using expired medication with override approval",
      );
    });

    it("should warn about low inventory", () => {
      const lowQuantitySource = { ...mockInventorySource, quantity: 1 };
      const result = AdminRecordDataService.validateInventorySelection(
        "inv-1",
        [lowQuantitySource],
        false,
      );

      expect(result.warnings).toContain(
        "Low inventory - consider reordering this medication",
      );
    });
  });

  describe("createRegimenQueryOptions", () => {
    it("should create query options with default values", () => {
      const result = AdminRecordDataService.createRegimenQueryOptions();

      expect(result.includeUpcoming).toBe(true);
      expect(result.refetchInterval).toBe(60000);
    });

    it("should create query options with custom values", () => {
      const result = AdminRecordDataService.createRegimenQueryOptions(
        "household-1",
        "animal-1",
        false,
      );

      expect(result.householdId).toBe("household-1");
      expect(result.animalId).toBe("animal-1");
      expect(result.includeUpcoming).toBe(false);
    });
  });

  describe("createInventoryQueryOptions", () => {
    it("should create inventory query options", () => {
      const result = AdminRecordDataService.createInventoryQueryOptions(
        "household-1",
        "Amoxicillin",
        true,
      );

      expect(result.householdId).toBe("household-1");
      expect(result.medicationName).toBe("Amoxicillin");
      expect(result.includeExpired).toBe(true);
    });
  });

  describe("processUrlParams", () => {
    it("should parse URL search parameters", () => {
      const searchParams = new URLSearchParams(
        "animalId=animal-1&regimenId=regimen-1&from=home",
      );
      const result = AdminRecordDataService.processUrlParams(searchParams);

      expect(result.animalId).toBe("animal-1");
      expect(result.regimenId).toBe("regimen-1");
      expect(result.from).toBe("home");
    });

    it("should handle missing parameters", () => {
      const searchParams = new URLSearchParams("");
      const result = AdminRecordDataService.processUrlParams(searchParams);

      expect(result.animalId).toBeUndefined();
      expect(result.regimenId).toBeUndefined();
      expect(result.from).toBeUndefined();
    });
  });

  describe("categorizeError", () => {
    it("should categorize network errors", () => {
      const error = new Error("fetch failed");
      const result = AdminRecordDataService.categorizeError(error);

      expect(result.type).toBe("network");
      expect(result.userMessage).toContain("Network error");
    });

    it("should categorize validation errors", () => {
      const error = new Error("validation failed");
      const result = AdminRecordDataService.categorizeError(error);

      expect(result.type).toBe("validation");
      expect(result.userMessage).toContain("Invalid data");
    });

    it("should categorize server errors", () => {
      const error = new Error("server error 500");
      const result = AdminRecordDataService.categorizeError(error);

      expect(result.type).toBe("server");
      expect(result.userMessage).toContain("Server error");
    });

    it("should categorize unknown errors", () => {
      const error = new Error("unknown issue");
      const result = AdminRecordDataService.categorizeError(error);

      expect(result.type).toBe("unknown");
      expect(result.userMessage).toContain("unexpected error");
    });

    it("should handle non-Error objects", () => {
      const result = AdminRecordDataService.categorizeError("string error");

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("string error");
    });
  });
});
