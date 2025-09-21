/**
 * AdminRecordWorkflowService
 *
 * Manages step transitions, workflow state, and business logic for the
 * medication administration recording process.
 */

import type { DueRegimen } from "./admin-record-validation.service";

export type RecordStep = "select" | "confirm" | "success";

export interface WorkflowState {
  step: RecordStep;
  selectedRegimen: DueRegimen | null;
  selectedAnimalId: string | null;
  inventorySourceId: string | null;
  allowOverride: boolean;
  requiresCoSign: boolean;
  notes: string;
  site: string;
  conditionTags: string[];
  photoUrls: string[];
  isSubmitting: boolean;
}

export interface WorkflowTransition {
  canTransition: boolean;
  reason?: string;
  requiredActions?: string[];
}

export class AdminRecordWorkflowService {
  /**
   * Initializes a new workflow state
   */
  static createInitialState(): WorkflowState {
    return {
      allowOverride: false,
      conditionTags: [],
      inventorySourceId: null,
      isSubmitting: false,
      notes: "",
      photoUrls: [],
      requiresCoSign: false,
      selectedAnimalId: null,
      selectedRegimen: null,
      site: "",
      step: "select",
    };
  }

  /**
   * Handles regimen selection and auto-configures related settings
   */
  static selectRegimen(
    state: WorkflowState,
    regimen: DueRegimen,
  ): WorkflowState {
    return {
      ...state,
      conditionTags: [],
      // Clear previous form data when switching regimens
      inventorySourceId: null,
      notes: "",
      photoUrls: [],
      requiresCoSign: regimen.isHighRisk,
      selectedAnimalId: regimen.animalId,
      selectedRegimen: regimen,
      site: "",
    };
  }

  /**
   * Validates if transition to confirm step is allowed
   */
  static canTransitionToConfirm(state: WorkflowState): WorkflowTransition {
    if (!state.selectedRegimen) {
      return {
        canTransition: false,
        reason: "No medication regimen selected",
        requiredActions: ["Select a medication regimen"],
      };
    }

    return { canTransition: true };
  }

  /**
   * Validates if submission is allowed
   */
  static canSubmit(state: WorkflowState): WorkflowTransition {
    const requiredActions: string[] = [];

    if (!state.selectedRegimen) {
      requiredActions.push("Select a medication regimen");
    }

    if (state.isSubmitting) {
      return {
        canTransition: false,
        reason: "Submission already in progress",
      };
    }

    // Check for high-risk medication requirements
    if (state.selectedRegimen?.isHighRisk && !state.requiresCoSign) {
      requiredActions.push("Enable co-sign for high-risk medication");
    }

    // Check for PRN medication requirements
    if (state.selectedRegimen?.isPRN && !state.notes.trim()) {
      requiredActions.push("Provide reason for PRN medication administration");
    }

    return {
      canTransition: requiredActions.length === 0,
      reason:
        requiredActions.length > 0 ? "Missing required information" : undefined,
      requiredActions: requiredActions.length > 0 ? requiredActions : undefined,
    };
  }

  /**
   * Processes step transitions with validation
   */
  static transitionToStep(
    state: WorkflowState,
    targetStep: RecordStep,
  ): WorkflowState {
    switch (targetStep) {
      case "select":
        return { ...state, step: "select" };

      case "confirm": {
        const confirmTransition =
          AdminRecordWorkflowService.canTransitionToConfirm(state);
        if (!confirmTransition.canTransition) {
          console.warn(
            "Cannot transition to confirm:",
            confirmTransition.reason,
          );
          return state;
        }
        return { ...state, step: "confirm" };
      }

      case "success":
        return { ...state, step: "success" };

      default:
        console.warn("Unknown step:", targetStep);
        return state;
    }
  }

  /**
   * Resets workflow to initial state
   */
  static resetWorkflow(preserveAnimalSelection = false): WorkflowState {
    const initialState = AdminRecordWorkflowService.createInitialState();

    // Optionally preserve animal selection for quick re-recording
    if (preserveAnimalSelection) {
      return {
        ...initialState,
        // selectedAnimalId preserved if available
      };
    }

    return initialState;
  }

  /**
   * Groups regimens by section for display
   */
  static groupRegimens(
    regimens: DueRegimen[],
    selectedAnimalId: string | null,
  ): { due: DueRegimen[]; later: DueRegimen[]; prn: DueRegimen[] } {
    const filteredRegimens = selectedAnimalId
      ? regimens.filter((r) => r.animalId === selectedAnimalId)
      : regimens;

    return {
      due: filteredRegimens.filter((r) => r.section === "due"),
      later: filteredRegimens.filter((r) => r.section === "later"),
      prn: filteredRegimens.filter((r) => r.section === "prn"),
    };
  }

  /**
   * Determines urgency level for regimen display
   */
  static getRegimenUrgency(
    regimen: DueRegimen,
  ): "critical" | "high" | "medium" | "low" {
    if (
      regimen.isOverdue &&
      regimen.minutesUntilDue &&
      Math.abs(regimen.minutesUntilDue) > 240
    ) {
      return "critical"; // Over 4 hours overdue
    }

    if (regimen.isOverdue) {
      return "high"; // Overdue but less than 4 hours
    }

    if (regimen.section === "due") {
      return "medium"; // Due now
    }

    return "low"; // Later or PRN
  }

  /**
   * Calculates workflow progress percentage
   */
  static getWorkflowProgress(state: WorkflowState): number {
    switch (state.step) {
      case "select":
        return state.selectedRegimen ? 33 : 0;
      case "confirm":
        return 66;
      case "success":
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Gets recommended next action for current workflow state
   */
  static getRecommendedAction(state: WorkflowState): string {
    switch (state.step) {
      case "select":
        if (!state.selectedRegimen) {
          return "Select a medication to record";
        }
        return "Proceed to confirmation";

      case "confirm": {
        const submitValidation = AdminRecordWorkflowService.canSubmit(state);
        if (
          !submitValidation.canTransition &&
          submitValidation.requiredActions
        ) {
          return (
            submitValidation.requiredActions[0] || "Complete required actions"
          );
        }
        return "Review details and confirm administration";
      }

      case "success":
        return "Record another medication or return home";

      default:
        return "Continue with the workflow";
    }
  }

  /**
   * Handles URL parameter integration for direct navigation
   */
  static applyUrlParams(
    state: WorkflowState,
    params: { animalId?: string; regimenId?: string },
    availableRegimens: DueRegimen[],
  ): WorkflowState {
    let newState = { ...state };

    if (params.animalId) {
      newState.selectedAnimalId = params.animalId;
    }

    if (params.regimenId) {
      const regimen = availableRegimens.find((r) => r.id === params.regimenId);
      if (regimen) {
        newState = AdminRecordWorkflowService.selectRegimen(newState, regimen);
        newState = AdminRecordWorkflowService.transitionToStep(
          newState,
          "confirm",
        );
      }
    }

    return newState;
  }

  /**
   * Validates workflow state consistency
   */
  static validateWorkflowState(state: WorkflowState): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for inconsistent state
    if (state.step === "confirm" && !state.selectedRegimen) {
      issues.push("Confirm step requires selected regimen");
    }

    if (
      state.selectedRegimen &&
      state.selectedAnimalId !== state.selectedRegimen.animalId
    ) {
      issues.push("Selected animal ID doesn't match regimen animal");
    }

    if (state.step === "success" && !state.selectedRegimen) {
      issues.push("Success step requires completed regimen");
    }

    return {
      issues,
      isValid: issues.length === 0,
    };
  }
}
