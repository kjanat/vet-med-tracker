/**
 * Regimen Workflow Service
 *
 * Handles business logic operations, state management, and workflow coordination
 * for regimen management. Provides orchestration between validation, scheduling,
 * and data services.
 */

import type { Regimen } from "./regimen-data.service";

export interface RegimenValidationService {
  validateRegimen: (
    regimen: Partial<Regimen>,
    context?: unknown,
  ) => { warnings: string[]; errors?: string[] };
}

export interface RegimenSchedulingService {
  checkScheduleConflicts: (
    newSchedule: { times: string[]; medicationName: string },
    existingSchedules: {
      times: string[];
      medicationName: string;
      highRisk: boolean;
    }[],
  ) => ScheduleConflict[];
  generateDoseSchedule: (
    frequency: number,
    scheduleType: string,
    startTime?: string,
    constraints?: Record<string, unknown>,
  ) => {
    optimizedTimes?: { time: string }[];
    warnings: string[];
    suggestions?: string[];
  };
}

export interface RegimenDataService {
  buildCreateData: (regimen: Partial<Regimen>, householdId: string) => unknown;
  buildUpdateData: (
    regimen: Partial<Regimen>,
    existingRegimen: Regimen,
    householdId: string,
  ) => unknown;
}

export interface MutationHandler<Input = unknown> {
  mutateAsync: (input: Input) => Promise<unknown>;
}

export interface InstrumentationEvent {
  animalId?: string;
  medicationName?: string;
  regimenId?: string;
  scheduleType?: string;
}

export interface ScheduleConflict {
  severity: "WARNING" | "ERROR";
  message: string;
  conflictingTime: string;
  medicationName: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface ScheduleOptimization {
  suggestions: string[];
  warnings: string[];
  optimizedTimes?: string[];
}

export class RegimenWorkflowService {
  /**
   * Validate schedule conflicts when creating/updating regimens
   */
  static validateScheduleConflicts(
    newSchedule: string[],
    medicationName: string,
    existingRegimens: Regimen[],
    editingRegimenId?: string,
    schedulingService?: RegimenSchedulingService,
  ): ScheduleConflict[] {
    if (!schedulingService) {
      return [];
    }

    const existingSchedules = existingRegimens
      .filter((r) => r.id !== editingRegimenId && r.status === "active")
      .map((r) => ({
        highRisk: r.highRisk,
        medicationName: r.medicationName,
        times: r.timesLocal || [],
      }));

    return schedulingService.checkScheduleConflicts(
      { medicationName, times: newSchedule },
      existingSchedules,
    );
  }

  /**
   * Generate optimized schedule for new regimens
   */
  static generateOptimizedSchedule(
    dosesPerDay: number,
    scheduleType: string,
    preferredStartTime: string,
    options: {
      withFood?: boolean;
      avoidSleep?: boolean;
    } = {},
    schedulingService?: RegimenSchedulingService,
  ): ScheduleOptimization {
    if (!schedulingService) {
      return {
        suggestions: [],
        warnings: [],
      };
    }

    const result = schedulingService.generateDoseSchedule(
      dosesPerDay,
      scheduleType,
      preferredStartTime,
      {
        avoidSleep: options.avoidSleep || true,
        withFood: options.withFood || true,
      },
    );

    return {
      optimizedTimes: result.optimizedTimes?.map((entry) => entry.time),
      suggestions: result.suggestions || [],
      warnings: result.warnings || [],
    };
  }

  /**
   * Comprehensive validation for regimen save operation
   */
  static async validateRegimenSave(
    data: Partial<Regimen>,
    existingRegimens: Regimen[],
    editingRegimenId?: string,
    services?: {
      validation?: RegimenValidationService;
      scheduling?: RegimenSchedulingService;
    },
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!data.medicationName?.trim()) {
      errors.push("Medication name is required");
    }

    if (!data.animalId) {
      errors.push("Animal selection is required");
    }

    if (!data.scheduleType) {
      errors.push("Schedule type is required");
    }

    // Schedule conflict validation
    if (data.timesLocal && data.medicationName && services?.scheduling) {
      const conflicts = RegimenWorkflowService.validateScheduleConflicts(
        data.timesLocal,
        data.medicationName,
        existingRegimens,
        editingRegimenId,
        services.scheduling,
      );

      const criticalConflicts = conflicts.filter((c) => c.severity === "ERROR");
      const warningConflicts = conflicts.filter(
        (c) => c.severity === "WARNING",
      );

      if (criticalConflicts.length > 0) {
        errors.push(...criticalConflicts.map((c) => c.message));
      }

      if (warningConflicts.length > 0) {
        warnings.push(...warningConflicts.map((c) => c.message));
      }
    }

    // Medical validation
    if (data.strength && data.animalId && services?.validation) {
      // This would require animal data for proper validation
      // For now, just add placeholder logic
      if (data.highRisk && !data.strength?.includes("mg")) {
        warnings.push("High-risk medication should specify dosage in mg");
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Process regimen save with full workflow
   */
  static async processRegimenSave(
    data: Partial<Regimen>,
    existingRegimens: Regimen[],
    editingRegimen: Regimen | null,
    householdId: string,
    services: {
      data?: RegimenDataService;
      validation?: RegimenValidationService;
      scheduling?: RegimenSchedulingService;
      mutations?: {
        create?: MutationHandler;
        update?: MutationHandler;
      };
    },
  ): Promise<{
    success: boolean;
    error?: string;
    warnings?: string[];
    optimizations?: ScheduleOptimization;
  }> {
    try {
      // Validate the regimen
      const validation = await RegimenWorkflowService.validateRegimenSave(
        data,
        existingRegimens,
        editingRegimen?.id,
        services,
      );

      if (!validation.isValid) {
        return {
          error: validation.errors.join(", "),
          success: false,
          warnings: validation.warnings,
        };
      }

      // Generate schedule optimization for new regimens
      let optimizations: ScheduleOptimization | undefined;
      if (
        !editingRegimen &&
        data.scheduleType === "FIXED" &&
        data.timesLocal &&
        services.scheduling
      ) {
        optimizations = RegimenWorkflowService.generateOptimizedSchedule(
          data.timesLocal.length,
          data.scheduleType,
          data.timesLocal[0] || "09:00",
          {
            avoidSleep: true,
            withFood: true,
          },
          services.scheduling,
        );
      }

      // Save the regimen
      if (editingRegimen && services.data && services.mutations?.update) {
        const updateData = services.data.buildUpdateData(
          data,
          editingRegimen,
          householdId,
        );
        await services.mutations.update.mutateAsync(updateData);
      } else if (
        !editingRegimen &&
        services.data &&
        services.mutations?.create
      ) {
        const createData = services.data.buildCreateData(data, householdId);
        await services.mutations.create.mutateAsync(createData);
      } else {
        throw new Error("Missing required services for regimen save");
      }

      return {
        optimizations,
        success: true,
        warnings: validation.warnings,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Fire instrumentation events for tracking
   */
  static fireInstrumentationEvent(
    eventType: "create" | "update" | "archive" | "pause" | "resume",
    data: InstrumentationEvent,
  ): void {
    const eventName = `settings_regimens_${eventType}`;

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: data,
      }),
    );
  }

  /**
   * Process regimen archive operation
   */
  static async processRegimenArchive(
    regimenId: string,
    householdId: string,
    deleteMutation?: MutationHandler<{ id: string; householdId: string }>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!deleteMutation) {
        throw new Error("Delete mutation not provided");
      }

      await deleteMutation.mutateAsync({
        householdId,
        id: regimenId,
      });

      RegimenWorkflowService.fireInstrumentationEvent("archive", { regimenId });

      return { success: true };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to archive regimen",
        success: false,
      };
    }
  }

  /**
   * Process regimen pause/resume operation
   */
  static async processRegimenTogglePause(
    regimenId: string,
    currentlyActive: boolean,
    householdId: string,
    mutations: {
      pause?: MutationHandler<{
        id: string;
        householdId: string;
        reason: string;
      }>;
      resume?: MutationHandler<{ id: string; householdId: string }>;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentlyActive) {
        if (!mutations.pause) {
          throw new Error("Pause mutation not provided");
        }

        await mutations.pause.mutateAsync({
          householdId,
          id: regimenId,
          reason: "Paused by user",
        });

        RegimenWorkflowService.fireInstrumentationEvent("pause", { regimenId });
      } else {
        if (!mutations.resume) {
          throw new Error("Resume mutation not provided");
        }

        await mutations.resume.mutateAsync({
          householdId,
          id: regimenId,
        });

        RegimenWorkflowService.fireInstrumentationEvent("resume", {
          regimenId,
        });
      }

      return { success: true };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : `Failed to ${currentlyActive ? "pause" : "resume"} regimen`,
        success: false,
      };
    }
  }

  /**
   * Get regimen statistics for display
   */
  static getRegimenStatistics(regimens: Regimen[]): {
    total: number;
    active: number;
    paused: number;
    ended: number;
    highRisk: number;
  } {
    return {
      active: regimens.filter((r) => r.status === "active").length,
      ended: regimens.filter((r) => r.status === "ended").length,
      highRisk: regimens.filter((r) => r.highRisk).length,
      paused: regimens.filter((r) => r.status === "paused").length,
      total: regimens.length,
    };
  }

  /**
   * Sort regimens for optimal display
   */
  static sortRegimens(
    regimens: Regimen[],
    sortBy: "name" | "status" | "startDate" | "priority" = "priority",
  ): Regimen[] {
    return [...regimens].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.medicationName.localeCompare(b.medicationName);

        case "status": {
          const statusOrder = { active: 0, ended: 2, paused: 1 };
          return statusOrder[a.status] - statusOrder[b.status];
        }

        case "startDate":
          return (b.startDate?.getTime() || 0) - (a.startDate?.getTime() || 0);
        default: {
          // Priority: high-risk active > active > paused > ended
          const getPriority = (r: Regimen) => {
            if (r.status === "active" && r.highRisk) return 0;
            if (r.status === "active") return 1;
            if (r.status === "paused") return 2;
            return 3;
          };
          return getPriority(a) - getPriority(b);
        }
      }
    });
  }
}
