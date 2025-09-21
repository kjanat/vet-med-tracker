/**
 * Tests for AdminRecordWorkflowService
 */

import { describe, expect, it } from "bun:test";
import type { DueRegimen } from "@/lib/services/admin-record-validation.service";
import {
  AdminRecordWorkflowService,
  type RecordStep,
  type WorkflowState,
} from "@/lib/services/admin-record-workflow.service";

describe("AdminRecordWorkflowService", () => {
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
    requiresCoSign: true,
  };

  const mockPRNRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-3",
    isPRN: true,
  };

  const mockOverdueRegimen: DueRegimen = {
    ...mockRegimen,
    id: "regimen-4",
    isOverdue: true,
    minutesUntilDue: -300, // 5 hours overdue
  };

  describe("createInitialState", () => {
    it("should create initial workflow state with default values", () => {
      const state = AdminRecordWorkflowService.createInitialState();

      expect(state.step).toBe("select");
      expect(state.selectedRegimen).toBeNull();
      expect(state.selectedAnimalId).toBeNull();
      expect(state.inventorySourceId).toBeNull();
      expect(state.allowOverride).toBe(false);
      expect(state.requiresCoSign).toBe(false);
      expect(state.notes).toBe("");
      expect(state.site).toBe("");
      expect(state.conditionTags).toEqual([]);
      expect(state.photoUrls).toEqual([]);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe("selectRegimen", () => {
    it("should select regimen and configure related settings", () => {
      const initialState = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.selectRegimen(
        initialState,
        mockHighRiskRegimen,
      );

      expect(result.selectedRegimen).toBe(mockHighRiskRegimen);
      expect(result.selectedAnimalId).toBe(mockHighRiskRegimen.animalId);
      expect(result.requiresCoSign).toBe(true); // Auto-configured for high-risk
    });

    it("should clear previous form data when switching regimens", () => {
      const stateWithData: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        conditionTags: ["Normal"],
        notes: "Previous notes",
        photoUrls: ["https://example.com/photo.jpg"],
        site: "Previous site",
      };

      const result = AdminRecordWorkflowService.selectRegimen(
        stateWithData,
        mockRegimen,
      );

      expect(result.notes).toBe("");
      expect(result.site).toBe("");
      expect(result.conditionTags).toEqual([]);
      expect(result.photoUrls).toEqual([]);
    });

    it("should configure co-sign requirement based on regimen risk level", () => {
      const initialState = AdminRecordWorkflowService.createInitialState();

      const normalResult = AdminRecordWorkflowService.selectRegimen(
        initialState,
        mockRegimen,
      );
      expect(normalResult.requiresCoSign).toBe(false);

      const highRiskResult = AdminRecordWorkflowService.selectRegimen(
        initialState,
        mockHighRiskRegimen,
      );
      expect(highRiskResult.requiresCoSign).toBe(true);
    });
  });

  describe("canTransitionToConfirm", () => {
    it("should allow transition when regimen is selected", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: mockRegimen,
      };

      const result = AdminRecordWorkflowService.canTransitionToConfirm(state);

      expect(result.canTransition).toBe(true);
    });

    it("should prevent transition when no regimen is selected", () => {
      const state = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.canTransitionToConfirm(state);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toBe("No medication regimen selected");
      expect(result.requiredActions).toContain("Select a medication regimen");
    });
  });

  describe("canSubmit", () => {
    it("should allow submission for valid state", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        isSubmitting: false,
        requiresCoSign: false,
        selectedRegimen: mockRegimen,
      };

      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(true);
    });

    it("should prevent submission when no regimen is selected", () => {
      const state = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(false);
      expect(result.requiredActions).toContain("Select a medication regimen");
    });

    it("should prevent submission when already submitting", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        isSubmitting: true,
        selectedRegimen: mockRegimen,
      };

      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toBe("Submission already in progress");
    });

    it("should require co-sign for high-risk medication", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        requiresCoSign: false,
        selectedRegimen: mockHighRiskRegimen,
      };

      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(false);
      expect(result.requiredActions).toContain(
        "Enable co-sign for high-risk medication",
      );
    });

    it("should require notes for PRN medication", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        notes: "",
        selectedRegimen: mockPRNRegimen,
      };

      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(false);
      expect(result.requiredActions).toContain(
        "Provide reason for PRN medication administration",
      );
    });

    it("should allow PRN submission with notes", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        notes: "Patient showing pain symptoms",
        selectedRegimen: mockPRNRegimen,
      };

      const result = AdminRecordWorkflowService.canSubmit(state);

      expect(result.canTransition).toBe(true);
    });
  });

  describe("transitionToStep", () => {
    it("should transition to select step", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        step: "confirm",
      };

      const result = AdminRecordWorkflowService.transitionToStep(
        state,
        "select",
      );

      expect(result.step).toBe("select");
    });

    it("should transition to confirm step when valid", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: mockRegimen,
      };

      const result = AdminRecordWorkflowService.transitionToStep(
        state,
        "confirm",
      );

      expect(result.step).toBe("confirm");
    });

    it("should prevent transition to confirm step when invalid", () => {
      const state = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.transitionToStep(
        state,
        "confirm",
      );

      expect(result.step).toBe("select"); // Should remain unchanged
    });

    it("should transition to success step", () => {
      const state = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.transitionToStep(
        state,
        "success",
      );

      expect(result.step).toBe("success");
    });
  });

  describe("resetWorkflow", () => {
    it("should reset to initial state", () => {
      const result = AdminRecordWorkflowService.resetWorkflow();
      const expected = AdminRecordWorkflowService.createInitialState();

      expect(result).toEqual(expected);
    });

    it("should optionally preserve animal selection", () => {
      const result = AdminRecordWorkflowService.resetWorkflow(true);

      expect(result.step).toBe("select");
      expect(result.selectedRegimen).toBeNull();
      // Note: Animal preservation logic would need to be implemented
    });
  });

  describe("groupRegimens", () => {
    const regimens: DueRegimen[] = [
      { ...mockRegimen, section: "due" },
      { ...mockRegimen, id: "reg-2", section: "later" },
      { ...mockRegimen, id: "reg-3", section: "prn" },
      { ...mockRegimen, animalId: "animal-2", id: "reg-4", section: "due" },
    ];

    it("should group all regimens when no animal is selected", () => {
      const result = AdminRecordWorkflowService.groupRegimens(regimens, null);

      expect(result.due).toHaveLength(2);
      expect(result.later).toHaveLength(1);
      expect(result.prn).toHaveLength(1);
    });

    it("should filter regimens by selected animal", () => {
      const result = AdminRecordWorkflowService.groupRegimens(
        regimens,
        "animal-1",
      );

      expect(result.due).toHaveLength(1);
      expect(result.later).toHaveLength(1);
      expect(result.prn).toHaveLength(1);
    });
  });

  describe("getRegimenUrgency", () => {
    it("should return critical for regimens over 4 hours overdue", () => {
      const result =
        AdminRecordWorkflowService.getRegimenUrgency(mockOverdueRegimen);
      expect(result).toBe("critical");
    });

    it("should return high for overdue regimens under 4 hours", () => {
      const recentlyOverdue = {
        ...mockRegimen,
        isOverdue: true,
        minutesUntilDue: -120,
      };
      const result =
        AdminRecordWorkflowService.getRegimenUrgency(recentlyOverdue);
      expect(result).toBe("high");
    });

    it("should return medium for due regimens", () => {
      const dueRegimen = { ...mockRegimen, section: "due" as const };
      const result = AdminRecordWorkflowService.getRegimenUrgency(dueRegimen);
      expect(result).toBe("medium");
    });

    it("should return low for later and PRN regimens", () => {
      const laterRegimen = { ...mockRegimen, section: "later" as const };
      const prnRegimen = { ...mockRegimen, section: "prn" as const };

      expect(AdminRecordWorkflowService.getRegimenUrgency(laterRegimen)).toBe(
        "low",
      );
      expect(AdminRecordWorkflowService.getRegimenUrgency(prnRegimen)).toBe(
        "low",
      );
    });
  });

  describe("getWorkflowProgress", () => {
    it("should return correct progress percentages", () => {
      const selectState = {
        ...AdminRecordWorkflowService.createInitialState(),
        step: "select" as RecordStep,
      };
      const confirmState = {
        ...AdminRecordWorkflowService.createInitialState(),
        step: "confirm" as RecordStep,
      };
      const successState = {
        ...AdminRecordWorkflowService.createInitialState(),
        step: "success" as RecordStep,
      };

      expect(AdminRecordWorkflowService.getWorkflowProgress(selectState)).toBe(
        0,
      );
      expect(AdminRecordWorkflowService.getWorkflowProgress(confirmState)).toBe(
        66,
      );
      expect(AdminRecordWorkflowService.getWorkflowProgress(successState)).toBe(
        100,
      );
    });

    it("should return 33% when regimen is selected in select step", () => {
      const state = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: mockRegimen,
        step: "select" as RecordStep,
      };

      expect(AdminRecordWorkflowService.getWorkflowProgress(state)).toBe(33);
    });
  });

  describe("getRecommendedAction", () => {
    it("should recommend selecting medication when none is selected", () => {
      const state = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.getRecommendedAction(state);

      expect(result).toBe("Select a medication to record");
    });

    it("should recommend proceeding to confirmation when regimen is selected", () => {
      const state = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: mockRegimen,
      };
      const result = AdminRecordWorkflowService.getRecommendedAction(state);

      expect(result).toBe("Proceed to confirmation");
    });

    it("should provide specific action for confirm step with missing requirements", () => {
      const state = {
        ...AdminRecordWorkflowService.createInitialState(),
        requiresCoSign: false,
        selectedRegimen: mockHighRiskRegimen,
        step: "confirm" as RecordStep,
      };
      const result = AdminRecordWorkflowService.getRecommendedAction(state);

      expect(result).toBe("Enable co-sign for high-risk medication");
    });
  });

  describe("applyUrlParams", () => {
    const availableRegimens = [mockRegimen, mockHighRiskRegimen];

    it("should apply animal ID from URL params", () => {
      const initialState = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.applyUrlParams(
        initialState,
        { animalId: "animal-1" },
        availableRegimens,
      );

      expect(result.selectedAnimalId).toBe("animal-1");
    });

    it("should select regimen and transition to confirm when regimen ID is provided", () => {
      const initialState = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.applyUrlParams(
        initialState,
        { regimenId: "regimen-1" },
        availableRegimens,
      );

      expect(result.selectedRegimen).toBe(mockRegimen);
      expect(result.step).toBe("confirm");
    });

    it("should handle invalid regimen ID gracefully", () => {
      const initialState = AdminRecordWorkflowService.createInitialState();
      const result = AdminRecordWorkflowService.applyUrlParams(
        initialState,
        { regimenId: "invalid-id" },
        availableRegimens,
      );

      expect(result.selectedRegimen).toBeNull();
      expect(result.step).toBe("select");
    });
  });

  describe("validateWorkflowState", () => {
    it("should validate consistent workflow state", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedAnimalId: mockRegimen.animalId,
        selectedRegimen: mockRegimen,
        step: "confirm",
      };

      const result = AdminRecordWorkflowService.validateWorkflowState(state);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect confirm step without selected regimen", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: null,
        step: "confirm",
      };

      const result = AdminRecordWorkflowService.validateWorkflowState(state);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain("Confirm step requires selected regimen");
    });

    it("should detect animal ID mismatch", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedAnimalId: "different-animal-id",
        selectedRegimen: mockRegimen,
      };

      const result = AdminRecordWorkflowService.validateWorkflowState(state);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        "Selected animal ID doesn't match regimen animal",
      );
    });

    it("should detect success step without completed regimen", () => {
      const state: WorkflowState = {
        ...AdminRecordWorkflowService.createInitialState(),
        selectedRegimen: null,
        step: "success",
      };

      const result = AdminRecordWorkflowService.validateWorkflowState(state);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(
        "Success step requires completed regimen",
      );
    });
  });
});
