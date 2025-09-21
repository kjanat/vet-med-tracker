// @ts-nocheck
import { describe, expect, test } from "bun:test";
import type { Regimen } from "@/lib/services/regimen-data.service";
import {
  type InstrumentationEvent,
  type RegimenSchedulingService,
  type RegimenValidationService,
  RegimenWorkflowService,
} from "@/lib/services/regimen-workflow.service";

// Mock services
const mockSchedulingService = {
  checkScheduleConflicts: (_newSchedule, _existingSchedules) => [
    {
      conflictingTime: "09:00",
      medicationName: "Test Medicine",
      message: "Potential timing conflict",
      severity: "WARNING" as const,
    },
  ],
  generateDoseSchedule: (
    _frequency,
    _scheduleType,
    _startTime,
    _constraints,
  ) => ({
    optimizedTimes: [{ time: "08:00" }, { time: "20:00" }],
    suggestions: ["Consider spacing doses evenly"],
    warnings: ["Morning doses preferred"],
  }),
} satisfies RegimenSchedulingService;

const mockValidationService: RegimenValidationService = {
  validateRegimen: () => ({ warnings: [] }),
};

const mockDataService = {
  buildCreateData: () => ({ animalId: "test", householdId: "test" }),
  buildUpdateData: () => ({ householdId: "test", id: "test" }),
};

const mockMutations = {
  create: { mutateAsync: async () => {} },
  update: { mutateAsync: async () => {} },
};

// Test regimens
const testRegimens: Regimen[] = [
  {
    animalId: "animal-1",
    animalName: "Fluffy",
    createdAt: new Date("2024-01-01"),
    cutoffMins: 240,
    endDate: new Date("2024-12-31"),
    form: "INJECTION",
    highRisk: false,
    id: "reg-1",
    isActive: true,
    medicationId: "med-1",
    medicationName: "Insulin",
    route: "SC",
    scheduleType: "FIXED",
    startDate: new Date("2024-01-01"),
    status: "active",
    strength: "10mg/ml",
    timesLocal: ["09:00", "21:00"],
  },
  {
    animalId: "animal-2",
    animalName: "Rex",
    createdAt: new Date("2024-01-01"),
    cutoffMins: 120,
    form: "TABLET",
    highRisk: true,
    id: "reg-2",
    isActive: false,
    medicationId: null,
    medicationName: "Pain Relief",
    route: "ORAL",
    scheduleType: "PRN",
    startDate: new Date("2024-01-01"),
    status: "paused",
    strength: "5mg",
    timesLocal: undefined,
  },
];

describe("RegimenWorkflowService", () => {
  describe("validateScheduleConflicts", () => {
    test("should validate schedule conflicts correctly", () => {
      const newSchedule = ["09:00", "21:00"];
      const medicationName = "Test Medicine";

      const result = RegimenWorkflowService.validateScheduleConflicts(
        newSchedule,
        medicationName,
        testRegimens,
        undefined,
        mockSchedulingService,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("WARNING");
      expect(result[0]?.message).toBe("Potential timing conflict");
    });

    test("should exclude editing regimen from conflicts", () => {
      const newSchedule = ["09:00", "21:00"];
      const medicationName = "Test Medicine";

      const result = RegimenWorkflowService.validateScheduleConflicts(
        newSchedule,
        medicationName,
        testRegimens,
        "reg-1", // Exclude this regimen
        mockSchedulingService,
      );

      expect(result).toHaveLength(1);
    });

    test("should return empty array without scheduling service", () => {
      const result = RegimenWorkflowService.validateScheduleConflicts(
        ["09:00"],
        "Test",
        testRegimens,
      );

      expect(result).toEqual([]);
    });
  });

  describe("generateOptimizedSchedule", () => {
    test("should generate optimized schedule", () => {
      const result = RegimenWorkflowService.generateOptimizedSchedule(
        2,
        "FIXED",
        "09:00",
        { avoidSleep: true, withFood: true },
        mockSchedulingService,
      );

      expect(result.suggestions).toEqual(["Consider spacing doses evenly"]);
      expect(result.warnings).toEqual(["Morning doses preferred"]);
      expect(result.optimizedTimes).toEqual(["08:00", "20:00"]);
    });

    test("should return empty result without scheduling service", () => {
      const result = RegimenWorkflowService.generateOptimizedSchedule(
        2,
        "FIXED",
        "09:00",
      );

      expect(result.suggestions).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("validateRegimenSave", () => {
    test("should validate regimen data", async () => {
      const regimenData = {
        animalId: "animal-1",
        medicationName: "Test Medicine",
        scheduleType: "FIXED" as const,
        timesLocal: ["09:00", "21:00"],
      };

      const result = await RegimenWorkflowService.validateRegimenSave(
        regimenData,
        testRegimens,
        undefined,
        {
          scheduling: mockSchedulingService,
          validation: mockValidationService,
        },
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Potential timing conflict");
    });

    test("should fail validation for missing required fields", async () => {
      const regimenData = {}; // Missing required fields

      const result = await RegimenWorkflowService.validateRegimenSave(
        regimenData,
        testRegimens,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Medication name is required");
      expect(result.errors).toContain("Animal selection is required");
      expect(result.errors).toContain("Schedule type is required");
    });

    test("should detect high-risk medication warnings", async () => {
      const regimenData = {
        animalId: "animal-1",
        highRisk: true,
        medicationName: "Test Medicine",
        scheduleType: "FIXED" as const,
        strength: "10ml", // No 'mg' for high-risk
      };

      const result = await RegimenWorkflowService.validateRegimenSave(
        regimenData,
        testRegimens,
        undefined,
        { validation: mockValidationService },
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "High-risk medication should specify dosage in mg",
      );
    });
  });

  describe("processRegimenSave", () => {
    test("should process regimen creation successfully", async () => {
      const regimenData = {
        animalId: "animal-1",
        medicationName: "Test Medicine",
        scheduleType: "FIXED" as const,
        timesLocal: ["09:00", "21:00"],
      };

      const result = await RegimenWorkflowService.processRegimenSave(
        regimenData,
        testRegimens,
        null, // Creating new regimen
        "household-1",
        {
          data: mockDataService,
          mutations: mockMutations,
          scheduling: mockSchedulingService,
          validation: mockValidationService,
        },
      );

      expect(result.success).toBe(true);
      expect(result.optimizations?.suggestions).toEqual([
        "Consider spacing doses evenly",
      ]);
    });

    test("should process regimen update successfully", async () => {
      const regimenData = {
        animalId: "animal-1", // Required field
        medicationName: "Updated Medicine",
        scheduleType: "FIXED" as const, // Required field
      };

      const result = await RegimenWorkflowService.processRegimenSave(
        regimenData,
        testRegimens,
        testRegimens[0] ?? null, // Editing existing regimen
        "household-1",
        {
          data: mockDataService,
          mutations: mockMutations,
          validation: mockValidationService,
        },
      );

      expect(result.success).toBe(true);
      expect(result.optimizations).toBeUndefined(); // No optimization for updates
    });

    test("should handle validation errors", async () => {
      const regimenData = {}; // Invalid data

      const result = await RegimenWorkflowService.processRegimenSave(
        regimenData,
        testRegimens,
        null,
        "household-1",
        {
          data: mockDataService,
          mutations: mockMutations,
          validation: mockValidationService,
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("should handle missing services", async () => {
      const regimenData = {
        animalId: "animal-1",
        medicationName: "Test Medicine",
        scheduleType: "FIXED" as const,
      };

      const result = await RegimenWorkflowService.processRegimenSave(
        regimenData,
        testRegimens,
        null,
        "household-1",
        {}, // Missing services
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Missing required services for regimen save");
    });
  });

  describe("fireInstrumentationEvent", () => {
    test("should fire instrumentation events", () => {
      let eventFired = false;
      let eventData: InstrumentationEvent | null = null;

      // Mock window.dispatchEvent
      const originalDispatchEvent = window.dispatchEvent;
      window.dispatchEvent = (event: Event) => {
        eventFired = true;
        if (event instanceof CustomEvent) {
          eventData = event.detail;
        }
        return true;
      };

      RegimenWorkflowService.fireInstrumentationEvent("create", {
        animalId: "animal-1",
        medicationName: "Test Medicine",
        scheduleType: "FIXED",
      });

      expect(eventFired).toBe(true);
      expect(eventData).not.toBeNull();
      expect(eventData?.animalId).toBe("animal-1");
      expect(eventData?.medicationName).toBe("Test Medicine");

      // Restore original function
      window.dispatchEvent = originalDispatchEvent;
    });
  });

  describe("processRegimenArchive", () => {
    test("should archive regimen successfully", async () => {
      const mockDeleteMutation = {
        mutateAsync: async () => {},
      };

      const result = await RegimenWorkflowService.processRegimenArchive(
        "reg-1",
        "household-1",
        mockDeleteMutation,
      );

      expect(result.success).toBe(true);
    });

    test("should handle missing delete mutation", async () => {
      const result = await RegimenWorkflowService.processRegimenArchive(
        "reg-1",
        "household-1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete mutation not provided");
    });
  });

  describe("processRegimenTogglePause", () => {
    test("should pause regimen successfully", async () => {
      const mockPauseMutation = {
        mutateAsync: async () => {},
      };

      const result = await RegimenWorkflowService.processRegimenTogglePause(
        "reg-1",
        true, // Currently active
        "household-1",
        { pause: mockPauseMutation },
      );

      expect(result.success).toBe(true);
    });

    test("should resume regimen successfully", async () => {
      const mockResumeMutation = {
        mutateAsync: async () => {},
      };

      const result = await RegimenWorkflowService.processRegimenTogglePause(
        "reg-1",
        false, // Currently paused
        "household-1",
        { resume: mockResumeMutation },
      );

      expect(result.success).toBe(true);
    });

    test("should handle missing mutations", async () => {
      const result = await RegimenWorkflowService.processRegimenTogglePause(
        "reg-1",
        true,
        "household-1",
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Pause mutation not provided");
    });
  });

  describe("getRegimenStatistics", () => {
    test("should calculate statistics correctly", () => {
      const stats = RegimenWorkflowService.getRegimenStatistics(testRegimens);

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.paused).toBe(1);
      expect(stats.ended).toBe(0);
      expect(stats.highRisk).toBe(1);
    });

    test("should handle empty regimens", () => {
      const stats = RegimenWorkflowService.getRegimenStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.paused).toBe(0);
      expect(stats.ended).toBe(0);
      expect(stats.highRisk).toBe(0);
    });
  });

  describe("sortRegimens", () => {
    test("should sort by name", () => {
      const sorted = RegimenWorkflowService.sortRegimens(testRegimens, "name");

      expect(sorted[0]?.medicationName).toBe("Insulin");
      expect(sorted[1]?.medicationName).toBe("Pain Relief");
    });

    test("should sort by status", () => {
      const sorted = RegimenWorkflowService.sortRegimens(
        testRegimens,
        "status",
      );

      expect(sorted[0]?.status).toBe("active");
      expect(sorted[1]?.status).toBe("paused");
    });

    test("should sort by priority (default)", () => {
      const sorted = RegimenWorkflowService.sortRegimens(testRegimens);

      // Active regimens come first, then paused
      expect(sorted[0]?.status).toBe("active");
      expect(sorted[1]?.status).toBe("paused");
    });

    test("should sort by start date", () => {
      const regimenWithDifferentDates = [
        { ...testRegimens[0]!, startDate: new Date("2024-02-01") },
        { ...testRegimens[1]!, startDate: new Date("2024-01-01") },
      ];

      const sorted = RegimenWorkflowService.sortRegimens(
        regimenWithDifferentDates,
        "startDate",
      );

      // Should be sorted by most recent first
      expect(sorted[0]?.startDate?.getTime()).toBeGreaterThan(
        sorted[1]?.startDate?.getTime() || 0,
      );
    });
  });
});
