/**
 * Tests for AdminRecordUIService
 */

import { describe, expect, it } from "bun:test";
import {
  AdminRecordUIService,
  type LayoutProps,
} from "@/lib/services/admin-record-ui.service";
import type { DueRegimen } from "@/lib/services/admin-record-validation.service";
import type { WorkflowState } from "@/lib/services/admin-record-workflow.service";
import type { InventorySource } from "@/types/inventory";

describe("AdminRecordUIService", () => {
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
    targetTime: "2024-01-01T10:30:00Z",
  };

  const mockOverdueRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-2",
    isOverdue: true,
    minutesUntilDue: -300, // 5 hours overdue
  };

  const mockHighRiskRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-3",
    isHighRisk: true,
    isPRN: true,
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

  describe("createInitialUIState", () => {
    it("should create initial UI state with default values", () => {
      const state = AdminRecordUIService.createInitialUIState();

      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.showValidation).toBe(false);
      expect(state.expandedSections).toEqual(["due"]);
      expect(state.selectedTabIndex).toBe(0);
    });
  });

  describe("formatRegimenForDisplay", () => {
    it("should format regimen with all display properties", () => {
      const result = AdminRecordUIService.formatRegimenForDisplay(
        mockRegimen,
        "America/New_York",
      );

      expect(result.timeDisplay).toBeDefined();
      expect(result.complianceDisplay).toBe("85% compliance");
      expect(result.urgencyLevel).toBeDefined();
      expect(result.statusBadges).toBeDefined();
      expect(Array.isArray(result.statusBadges)).toBe(true);
    });

    it("should handle regimen without target time", () => {
      const regimenWithoutTime = { ...mockRegimen, targetTime: undefined };
      const result = AdminRecordUIService.formatRegimenForDisplay(
        regimenWithoutTime,
        "UTC",
      );

      expect(result.timeDisplay).toBe("As needed");
    });

    it("should determine correct urgency levels", () => {
      // Critical urgency (over 4 hours overdue)
      const criticalRegimen = {
        ...mockRegimen,
        isOverdue: true,
        minutesUntilDue: -300, // 5 hours overdue
      };
      const criticalResult = AdminRecordUIService.formatRegimenForDisplay(
        criticalRegimen,
        "UTC",
      );
      expect(criticalResult.urgencyLevel).toBe("critical");

      // High urgency (overdue but under 4 hours)
      const highRegimen = {
        ...mockRegimen,
        isOverdue: true,
        minutesUntilDue: -120, // 2 hours overdue
      };
      const highResult = AdminRecordUIService.formatRegimenForDisplay(
        highRegimen,
        "UTC",
      );
      expect(highResult.urgencyLevel).toBe("high");

      // Medium urgency (due now)
      const mediumRegimen = { ...mockRegimen, section: "due" as const };
      const mediumResult = AdminRecordUIService.formatRegimenForDisplay(
        mediumRegimen,
        "UTC",
      );
      expect(mediumResult.urgencyLevel).toBe("medium");

      // Low urgency (later or PRN)
      const lowRegimen = { ...mockRegimen, section: "later" as const };
      const lowResult = AdminRecordUIService.formatRegimenForDisplay(
        lowRegimen,
        "UTC",
      );
      expect(lowResult.urgencyLevel).toBe("low");
    });

    it("should generate appropriate status badges", () => {
      const result = AdminRecordUIService.formatRegimenForDisplay(
        mockHighRiskRegimen,
        "UTC",
      );

      expect(result.statusBadges).toContainEqual({
        text: "PRN",
        variant: "outline",
      });
      expect(result.statusBadges).toContainEqual({
        text: "High-risk",
        variant: "secondary",
      });
    });

    it("should show overdue badge for overdue regimens", () => {
      const result = AdminRecordUIService.formatRegimenForDisplay(
        mockOverdueRegimen,
        "UTC",
      );

      expect(result.statusBadges).toContainEqual({
        text: "Overdue",
        variant: "destructive",
      });
    });
  });

  describe("formatInventorySourcesForDisplay", () => {
    it("should format inventory sources with display properties", () => {
      const sources = [mockInventorySource];
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        sources,
        "Amoxicillin",
        false,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.displayName).toContain("Amoxicillin 250mg");
      expect(result[0]!.displayName).toContain("Generic");
      expect(result[0]!.statusText).toBeDefined();
      expect(result[0]!.canUse).toBe(true);
      expect(result[0]!.requiresOverride).toBe(false);
    });

    it("should filter sources by medication name", () => {
      const sources = [
        mockInventorySource,
        { ...mockInventorySource, id: "inv-2", name: "Metacam 5mg" },
      ];
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        sources,
        "Amoxicillin",
        false,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toContain("Amoxicillin");
    });

    it("should handle expired inventory sources", () => {
      const expiredSource = { ...mockInventorySource, isExpired: true };
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        [expiredSource],
        "Amoxicillin",
        false,
      );

      expect(result[0]?.canUse).toBe(false);
      expect(result[0]?.requiresOverride).toBe(true);
      expect(result[0]?.statusText).toContain("Expired");
    });

    it("should handle medication mismatch", () => {
      const wrongMedSource = { ...mockInventorySource, isWrongMed: true };
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        [wrongMedSource],
        "Amoxicillin",
        false,
      );

      expect(result[0]?.canUse).toBe(false);
      expect(result[0]?.requiresOverride).toBe(true);
      expect(result[0]?.statusText).toContain("Medication mismatch");
    });

    it("should show quantity for normal sources", () => {
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        [mockInventorySource],
        "Amoxicillin",
        false,
      );

      expect(result[0]?.statusText).toContain("10 available");
    });

    it("should warn about low stock", () => {
      const lowStockSource = { ...mockInventorySource, quantity: 1 };
      const result = AdminRecordUIService.formatInventorySourcesForDisplay(
        [lowStockSource],
        "Amoxicillin",
        false,
      );

      expect(result[0]?.statusText).toContain("Low stock");
    });
  });

  describe("groupRegimensWithCounts", () => {
    const regimens: DueRegimen[] = [
      { ...mockRegimen, section: "due" },
      { ...mockRegimen, id: "reg-2", section: "later" },
      { ...mockRegimen, id: "reg-3", section: "prn" },
      { ...mockRegimen, id: "reg-4", section: "due" },
      { ...mockRegimen, animalId: "animal-2", id: "reg-5", section: "due" },
    ];

    it("should group regimens with counts when no animal is selected", () => {
      const result = AdminRecordUIService.groupRegimensWithCounts(
        regimens,
        null,
      );

      expect(result.due.count).toBe(3);
      expect(result.later.count).toBe(1);
      expect(result.prn.count).toBe(1);
      expect(result.due.regimens).toHaveLength(3);
      expect(result.later.regimens).toHaveLength(1);
      expect(result.prn.regimens).toHaveLength(1);
    });

    it("should filter regimens by selected animal", () => {
      const result = AdminRecordUIService.groupRegimensWithCounts(
        regimens,
        "animal-1",
      );

      expect(result.due.count).toBe(2);
      expect(result.later.count).toBe(1);
      expect(result.prn.count).toBe(1);
    });
  });

  describe("getSectionBadgeVariant", () => {
    it("should return correct badge variants", () => {
      expect(AdminRecordUIService.getSectionBadgeVariant("due", 1)).toBe(
        "destructive",
      );
      expect(AdminRecordUIService.getSectionBadgeVariant("due", 0)).toBe(
        "outline",
      );
      expect(AdminRecordUIService.getSectionBadgeVariant("later", 1)).toBe(
        "secondary",
      );
      expect(AdminRecordUIService.getSectionBadgeVariant("later", 0)).toBe(
        "outline",
      );
      expect(AdminRecordUIService.getSectionBadgeVariant("prn", 1)).toBe(
        "outline",
      );
    });
  });

  describe("createLoadingDisplay", () => {
    it("should create loading skeleton items", () => {
      const result = AdminRecordUIService.createLoadingDisplay(2);

      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe("skeleton");
      expect(result[0]?.height).toBe("h-20");
      expect(result[1]?.id).toBe("skeleton-1");
    });

    it("should create default number of skeleton items", () => {
      const result = AdminRecordUIService.createLoadingDisplay();

      expect(result).toHaveLength(3);
    });
  });

  describe("getSubmitButtonText", () => {
    it("should return appropriate text for different states", () => {
      expect(AdminRecordUIService.getSubmitButtonText(true, false, false)).toBe(
        "Recording...",
      );
      expect(AdminRecordUIService.getSubmitButtonText(false, false, true)).toBe(
        "Please resolve issues",
      );
      expect(AdminRecordUIService.getSubmitButtonText(false, true, false)).toBe(
        "Hold to Confirm (3s) - Co-sign Required",
      );
      expect(
        AdminRecordUIService.getSubmitButtonText(false, false, false),
      ).toBe("Hold to Confirm (3s)");
    });
  });

  describe("shouldDisableSubmit", () => {
    it("should disable submit for various error conditions", () => {
      expect(
        AdminRecordUIService.shouldDisableSubmit(true, false, false, false),
      ).toBe(true);
      expect(
        AdminRecordUIService.shouldDisableSubmit(false, true, false, false),
      ).toBe(true);
      expect(
        AdminRecordUIService.shouldDisableSubmit(false, false, true, false),
      ).toBe(true);
      expect(
        AdminRecordUIService.shouldDisableSubmit(false, false, true, true),
      ).toBe(false);
      expect(
        AdminRecordUIService.shouldDisableSubmit(false, false, false, false),
      ).toBe(false);
    });
  });

  describe("createSuccessMessage", () => {
    it("should create success message with animal and medication details", () => {
      const result = AdminRecordUIService.createSuccessMessage(
        "Fluffy",
        "Amoxicillin",
        "2024-01-01T10:30:00Z",
        "UTC",
      );

      expect(result.title).toBe("Recorded Successfully");
      expect(result.subtitle).toContain("Amoxicillin for Fluffy");
    });

    it("should create generic success message without details", () => {
      const result = AdminRecordUIService.createSuccessMessage();

      expect(result.title).toBe("Recorded Successfully");
      expect(result.subtitle).toContain("by You");
    });
  });

  describe("getUrgencyIcon", () => {
    it("should return appropriate icons for urgency levels", () => {
      expect(AdminRecordUIService.getUrgencyIcon("critical")).toBe("🚨");
      expect(AdminRecordUIService.getUrgencyIcon("high")).toBe("⚠️");
      expect(AdminRecordUIService.getUrgencyIcon("medium")).toBe("🔔");
      expect(AdminRecordUIService.getUrgencyIcon("low")).toBe("ℹ️");
    });
  });

  describe("formatErrorDisplay", () => {
    it("should format error for display", () => {
      const error = new Error("Test error message");
      const result = AdminRecordUIService.formatErrorDisplay(error);

      expect(result.show).toBe(true);
      expect(result.title).toBe("Error");
      expect(result.message).toBe("Test error message");
    });

    it("should handle null error", () => {
      const result = AdminRecordUIService.formatErrorDisplay(null);

      expect(result.show).toBe(false);
      expect(result.title).toBe("");
      expect(result.message).toBe("");
    });

    it("should handle error without message", () => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = "";
      const result =
        AdminRecordUIService.formatErrorDisplay(errorWithoutMessage);

      expect(result.show).toBe(true);
      expect(result.message).toBe("An unexpected error occurred");
    });
  });

  describe("getLayoutComponent", () => {
    it("should return correct layout component based on device", () => {
      const mobileLayout: LayoutProps = {
        isDesktop: false,
        isMobile: true,
        isTablet: false,
      };
      const tabletLayout: LayoutProps = {
        isDesktop: false,
        isMobile: false,
        isTablet: true,
      };
      const desktopLayout: LayoutProps = {
        isDesktop: true,
        isMobile: false,
        isTablet: false,
      };

      expect(AdminRecordUIService.getLayoutComponent(mobileLayout)).toBe(
        "mobile",
      );
      expect(AdminRecordUIService.getLayoutComponent(tabletLayout)).toBe(
        "tablet",
      );
      expect(AdminRecordUIService.getLayoutComponent(desktopLayout)).toBe(
        "desktop",
      );
    });
  });

  describe("createBreadcrumb", () => {
    it("should create breadcrumb for select step", () => {
      const result = AdminRecordUIService.createBreadcrumb("select");

      expect(result).toHaveLength(3);
      expect(result[0]?.text).toBe("Select Medication");
      expect(result[0]?.active).toBe(true);
      expect(result[1]?.active).toBe(false);
      expect(result[2]?.active).toBe(false);
    });

    it("should create breadcrumb for confirm step with details", () => {
      const result = AdminRecordUIService.createBreadcrumb(
        "confirm",
        "Fluffy",
        "Amoxicillin",
      );

      expect(result[1]?.text).toBe("Confirm Amoxicillin for Fluffy");
      expect(result[1]?.active).toBe(true);
    });

    it("should create breadcrumb for success step", () => {
      const result = AdminRecordUIService.createBreadcrumb("success");

      expect(result[2]?.text).toBe("Success");
      expect(result[2]?.active).toBe(true);
    });
  });

  describe("formatConditionTags", () => {
    it("should format condition tags with selection state", () => {
      const selectedTags = ["Normal", "Improved"];
      const result = AdminRecordUIService.formatConditionTags(selectedTags);

      expect(result).toHaveLength(5); // All available tags
      expect(result.find((t) => t.name === "Normal")?.selected).toBe(true);
      expect(result.find((t) => t.name === "Normal")?.variant).toBe("default");
      expect(result.find((t) => t.name === "Worse")?.selected).toBe(false);
      expect(result.find((t) => t.name === "Worse")?.variant).toBe("outline");
    });
  });

  describe("getPhotoUploadStatus", () => {
    it("should return status for no photos", () => {
      const result = AdminRecordUIService.getPhotoUploadStatus([]);

      expect(result.count).toBe(0);
      expect(result.canAddMore).toBe(true);
      expect(result.statusText).toBe("No photos added");
    });

    it("should return status for single photo", () => {
      const result = AdminRecordUIService.getPhotoUploadStatus(["photo1.jpg"]);

      expect(result.count).toBe(1);
      expect(result.canAddMore).toBe(true);
      expect(result.statusText).toBe("1 photo added");
    });

    it("should return status for multiple photos", () => {
      const result = AdminRecordUIService.getPhotoUploadStatus([
        "photo1.jpg",
        "photo2.jpg",
      ]);

      expect(result.count).toBe(2);
      expect(result.canAddMore).toBe(true);
      expect(result.statusText).toBe("2 photos added");
    });

    it("should return status for maximum photos", () => {
      const photos = ["photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg"];
      const result = AdminRecordUIService.getPhotoUploadStatus(photos);

      expect(result.count).toBe(4);
      expect(result.canAddMore).toBe(false);
      expect(result.statusText).toBe("4 photos added (maximum reached)");
    });
  });

  describe("getFormCompleteness", () => {
    it("should calculate form completeness for complete form", () => {
      const result =
        AdminRecordUIService.getFormCompleteness(mockWorkflowState);

      expect(result.percentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it("should identify missing required fields", () => {
      const incompleteState: WorkflowState = {
        ...mockWorkflowState,
        selectedRegimen: null,
      };

      const result = AdminRecordUIService.getFormCompleteness(incompleteState);

      expect(result.percentage).toBe(0);
      expect(result.missingFields).toContain("Medication");
      expect(result.isComplete).toBe(false);
    });

    it("should require notes for PRN medications", () => {
      const prnState: WorkflowState = {
        ...mockWorkflowState,
        notes: "",
        selectedRegimen: { ...mockRegimen, isPRN: true },
      };

      const result = AdminRecordUIService.getFormCompleteness(prnState);

      expect(result.missingFields).toContain("Notes");
      expect(result.isComplete).toBe(false);
    });

    it("should not require notes for non-PRN medications", () => {
      const nonPrnState: WorkflowState = {
        ...mockWorkflowState,
        notes: "",
      };

      const result = AdminRecordUIService.getFormCompleteness(nonPrnState);

      expect(result.missingFields).not.toContain("Notes");
      expect(result.isComplete).toBe(true);
    });
  });
});
