/**
 * AdminRecordDataService
 *
 * Handles API integration, data transformation, and mutation management
 * for medication administration records.
 */

import type { InventorySource } from "@/types/inventory";
import { adminKey } from "@/utils/idempotency";
import { localDayISO } from "@/utils/tz";
import type { DueRegimen } from "./admin-record-validation.service";
import type { WorkflowState } from "./admin-record-workflow.service";
import type { RouterLike } from "./navigation.service";

export interface AdminPayload {
  idempotencyKey: string;
  householdId: string;
  animalId: string;
  regimenId: string;
  administeredAt: string;
  inventorySourceId?: string;
  notes?: string;
  site?: string;
  conditionTags?: string[];
  mediaUrls?: string[];
  requiresCoSign: boolean;
  allowOverride: boolean;
  dose?: string;
  status?: "PRN";
}

export interface MutationCallbacks {
  onAdminSuccess: () => Promise<void>;
  onAdminError: (error: unknown) => void;
  onInventorySuccess: () => Promise<void>;
  onInventoryError: (error: unknown) => void;
}

export interface DataQueryOptions {
  householdId?: string;
  animalId?: string;
  includeUpcoming?: boolean;
  includeExpired?: boolean;
  medicationName?: string;
  refetchInterval?: number;
}

type AdminTRPCUtils = {
  regimen: {
    listDue: {
      invalidate: () => Promise<void>;
    };
  };
  inventory: {
    getSources: {
      invalidate: () => Promise<void>;
    };
    getHouseholdInventory: {
      invalidate: () => Promise<void>;
    };
  };
};

type InventorySourceWithQuantity = InventorySource & { quantity?: number };

function getUnitsRemaining(source: InventorySourceWithQuantity): number {
  const quantity = source.quantity;
  if (typeof quantity === "number") {
    return quantity;
  }

  return typeof source.unitsRemaining === "number" ? source.unitsRemaining : 0;
}

export class AdminRecordDataService {
  /**
   * Creates administration payload from workflow state
   */
  static createAdminPayload(
    state: WorkflowState,
    householdId: string,
    timezone: string,
  ): AdminPayload {
    if (!state.selectedRegimen) {
      throw new Error("No regimen selected for administration");
    }

    const now = new Date();
    const localDay = localDayISO(now, timezone);
    const idempotencyKey = adminKey(
      state.selectedRegimen.animalId,
      state.selectedRegimen.id,
      localDay,
      state.selectedRegimen.isPRN ? undefined : 0,
    );

    return {
      administeredAt: now.toISOString(),
      allowOverride: state.allowOverride,
      animalId: state.selectedRegimen.animalId,
      conditionTags:
        state.conditionTags.length > 0 ? state.conditionTags : undefined,
      dose: state.selectedRegimen.dose,
      householdId,
      idempotencyKey,
      inventorySourceId: state.inventorySourceId || undefined,
      mediaUrls: state.photoUrls.length > 0 ? state.photoUrls : undefined,
      notes: state.notes || undefined,
      regimenId: state.selectedRegimen.id,
      requiresCoSign: state.requiresCoSign,
      site: state.site || undefined,
      status: state.selectedRegimen.isPRN ? ("PRN" as const) : undefined,
    };
  }

  /**
   * Creates inventory update payload
   */
  static createInventoryPayload(
    inventorySourceId: string,
    householdId: string,
    animalName: string,
  ) {
    return {
      householdId,
      id: inventorySourceId,
      quantityChange: -1,
      reason: `Administration for ${animalName}`,
    };
  }

  /**
   * Handles administration record creation with error handling
   */
  static async processAdministration(
    payload: AdminPayload,
    createAdminMutation: {
      mutateAsync: (payload: AdminPayload) => Promise<unknown>;
    },
    callbacks: Pick<MutationCallbacks, "onAdminSuccess" | "onAdminError">,
  ): Promise<void> {
    try {
      await createAdminMutation.mutateAsync(payload);
      await callbacks.onAdminSuccess();
    } catch (error) {
      console.error("Failed to record administration:", error);
      callbacks.onAdminError(error);
    }
  }

  /**
   * Handles inventory quantity update with error handling
   */
  static async processInventoryUpdate(
    payload: ReturnType<typeof AdminRecordDataService.createInventoryPayload>,
    updateInventoryMutation: {
      mutateAsync: (
        payload: ReturnType<
          typeof AdminRecordDataService.createInventoryPayload
        >,
      ) => Promise<unknown>;
    },
    callbacks: Pick<
      MutationCallbacks,
      "onInventorySuccess" | "onInventoryError"
    >,
  ): Promise<void> {
    try {
      await updateInventoryMutation.mutateAsync(payload);
      await callbacks.onInventorySuccess();
    } catch (error) {
      console.error("Failed to update inventory:", error);
      callbacks.onInventoryError(error);
    }
  }

  /**
   * Orchestrates complete administration workflow
   */
  static async submitAdministration(
    state: WorkflowState,
    householdId: string,
    timezone: string,
    mutations: {
      createAdminMutation: {
        mutateAsync: (payload: AdminPayload) => Promise<unknown>;
      };
      updateInventoryMutation: {
        mutateAsync: (
          payload: ReturnType<
            typeof AdminRecordDataService.createInventoryPayload
          >,
        ) => Promise<unknown>;
      };
    },
    callbacks: MutationCallbacks,
  ): Promise<void> {
    if (!state.selectedRegimen) {
      throw new Error("No regimen selected");
    }

    // Create and submit administration record
    const adminPayload = AdminRecordDataService.createAdminPayload(
      state,
      householdId,
      timezone,
    );
    await AdminRecordDataService.processAdministration(
      adminPayload,
      mutations.createAdminMutation,
      callbacks,
    );

    // Update inventory if source is selected
    if (state.inventorySourceId) {
      const inventoryPayload = AdminRecordDataService.createInventoryPayload(
        state.inventorySourceId,
        householdId,
        state.selectedRegimen.animalName,
      );
      await AdminRecordDataService.processInventoryUpdate(
        inventoryPayload,
        mutations.updateInventoryMutation,
        callbacks,
      );
    }
  }

  /**
   * Transforms regimen data for display
   */
  static transformRegimenForDisplay(regimen: DueRegimen, timezone: string) {
    const isUrgent = Boolean(
      regimen.isOverdue &&
        regimen.minutesUntilDue &&
        Math.abs(regimen.minutesUntilDue) > 240,
    );

    return {
      ...regimen,
      complianceDisplay: `${regimen.compliance}% compliance`,
      isUrgent,
      timeDisplay: regimen.targetTime
        ? AdminRecordDataService.formatTimeLocal(
            new Date(regimen.targetTime),
            timezone,
          )
        : "As needed",
    };
  }

  /**
   * Formats time for local display
   */
  private static formatTimeLocal(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  }

  /**
   * Filters inventory sources for medication
   */
  static filterInventorySources(
    sources: InventorySource[],
    medicationName: string,
  ): InventorySource[] {
    return sources.filter((source) =>
      source.name.toLowerCase().includes(medicationName.toLowerCase()),
    );
  }

  /**
   * Validates inventory source selection
   */
  static validateInventorySelection(
    sourceId: string | null,
    sources: InventorySource[],
    allowOverride: boolean,
  ): { isValid: boolean; canSubmit: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!sourceId) {
      warnings.push(
        "No inventory source selected - administration will not track inventory",
      );
      return { canSubmit: true, isValid: true, warnings };
    }

    const selectedSource = sources.find((s) => s.id === sourceId);
    if (!selectedSource) {
      return {
        canSubmit: false,
        isValid: false,
        warnings: ["Selected inventory source not found"],
      };
    }

    const hasIssues = selectedSource.isExpired || selectedSource.isWrongMed;
    const canSubmit = !hasIssues || allowOverride;

    if (selectedSource.isExpired) {
      warnings.push(
        allowOverride
          ? "Using expired medication with override approval"
          : "Cannot use expired medication without override approval",
      );
    }

    if (selectedSource.isWrongMed) {
      warnings.push(
        allowOverride
          ? "Using medication with mismatch - override approved"
          : "Medication mismatch detected - requires override approval",
      );
    }

    const remainingUnits = getUnitsRemaining(
      selectedSource as InventorySourceWithQuantity,
    );

    if (remainingUnits <= 1) {
      warnings.push("Low inventory - consider reordering this medication");
    }

    return {
      canSubmit,
      isValid: true,
      warnings,
    };
  }

  /**
   * Generates query options for due regimens
   */
  static createRegimenQueryOptions(
    householdId?: string,
    animalId?: string,
    includeUpcoming = true,
  ): DataQueryOptions {
    return {
      animalId,
      householdId,
      includeUpcoming,
      refetchInterval: 60000, // Refresh every minute
    };
  }

  /**
   * Generates query options for inventory sources
   */
  static createInventoryQueryOptions(
    householdId?: string,
    medicationName?: string,
    allowOverride = false,
  ): DataQueryOptions {
    return {
      householdId,
      includeExpired: allowOverride,
      medicationName,
    };
  }

  /**
   * Handles data invalidation after successful submission
   */
  static async invalidateRelatedData(
    utils: AdminTRPCUtils,
    refreshCallbacks?: {
      refreshPendingMeds?: () => void;
    },
  ): Promise<void> {
    // Invalidate relevant tRPC queries
    await Promise.all([
      utils.regimen.listDue.invalidate(),
      utils.inventory.getSources.invalidate(),
      utils.inventory.getHouseholdInventory.invalidate(),
    ]);

    // Refresh application state
    refreshCallbacks?.refreshPendingMeds?.();
  }

  /**
   * Handles URL parameter processing for direct navigation
   */
  static processUrlParams(searchParams: URLSearchParams): {
    animalId?: string;
    regimenId?: string;
    from?: string;
  } {
    return {
      animalId: searchParams.get("animalId") || undefined,
      from: searchParams.get("from") || undefined,
      regimenId: searchParams.get("regimenId") || undefined,
    };
  }

  /**
   * Creates navigation context for workflow transitions
   */
  static createNavigationContext(
    _router: RouterLike,
    searchParams: URLSearchParams,
  ) {
    const params = AdminRecordDataService.processUrlParams(searchParams);

    return {
      backUrl: "/auth/dashboard",
      canGoBack: params.from === "home",
      homeUrl: "/auth/dashboard",
      reminderSettingsUrl: "/auth/settings/reminders",
    };
  }

  /**
   * Handles error categorization and user-friendly messages
   */
  static categorizeError(error: unknown): {
    type: "network" | "validation" | "server" | "unknown";
    message: string;
    userMessage: string;
  } {
    if (error instanceof Error) {
      // Network errors
      if (
        error.message.includes("fetch") ||
        error.message.includes("network")
      ) {
        return {
          message: error.message,
          type: "network",
          userMessage:
            "Network error - please check your connection and try again",
        };
      }

      // Validation errors
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        return {
          message: error.message,
          type: "validation",
          userMessage: "Invalid data - please check your inputs and try again",
        };
      }

      // Server errors
      if (error.message.includes("server") || error.message.includes("500")) {
        return {
          message: error.message,
          type: "server",
          userMessage: "Server error - please try again later",
        };
      }
    }

    return {
      message: String(error),
      type: "unknown",
      userMessage: "An unexpected error occurred - please try again",
    };
  }
}
