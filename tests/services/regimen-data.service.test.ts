// @ts-nocheck
import { describe, expect, test } from "bun:test";
import {
  RegimenDataService,
  type RegimenWithDetails,
} from "@/lib/services/regimen-data.service";

// Mock validation service
const mockValidationService = {
  validate: (_regimen: unknown) => ({ warnings: ["Test warning"] }),
};

// Test data
const mockRegimenData: RegimenWithDetails[] = [
  {
    animal: {
      allergies: ["Chicken"],
      breed: "Persian",
      clinicName: null,
      color: "White",
      conditions: ["Diabetes"],
      createdAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
      dob: "2020-01-01",
      householdId: "household-1",
      id: "animal-1",
      microchipId: null,
      name: "Fluffy",
      neutered: true,
      notes: null,
      photoUrl: null,
      sex: "F",
      species: "Cat",
      timezone: "UTC",
      updatedAt: "2024-01-01T00:00:00Z",
      vetEmail: null,
      vetName: "Dr. Smith",
      vetPhone: null,
      weightKg: "4.5",
    },
    medication: {
      brandName: "NovoLog",
      commonDosing: "Twice daily",
      controlledSubstance: false,
      createdAt: "2024-01-01T00:00:00Z",
      form: "INJECTION",
      genericName: "Insulin",
      id: "med-1",
      route: "SC",
      strength: "10mg/ml",
      updatedAt: "2024-01-01T00:00:00Z",
      warnings: "Monitor blood glucose",
    },
    regimen: {
      active: true,
      animalId: "animal-1",
      createdAt: "2024-01-01T00:00:00Z",
      cutoffMinutes: 240,
      deletedAt: null,
      dose: "10mg",
      endDate: "2024-01-31",
      highRisk: false,
      id: "reg-1",
      instructions: "Take with food",
      intervalHours: null,
      maxDailyDoses: null,
      medicationId: "med-1",
      name: "Test Medication",
      pausedAt: null,
      pauseReason: null,
      prnReason: null,
      requiresCoSign: false,
      route: "ORAL",
      scheduleType: "FIXED",
      startDate: "2024-01-01",
      timesLocal: ["09:00", "21:00"],
      updatedAt: "2024-01-01T00:00:00Z",
    },
  },
  {
    animal: {
      allergies: null,
      breed: "Labrador",
      clinicName: "Pet Care Clinic",
      color: "Golden",
      conditions: null,
      createdAt: "2024-01-01T00:00:00Z",
      deletedAt: null,
      dob: "2019-05-15",
      householdId: "household-1",
      id: "animal-2",
      microchipId: "123456789",
      name: "Rex",
      neutered: false,
      notes: "Very friendly dog",
      photoUrl: "https://example.com/rex.jpg",
      sex: "M",
      species: "Dog",
      timezone: "UTC",
      updatedAt: "2024-01-01T00:00:00Z",
      vetEmail: "dr.johnson@vet.com",
      vetName: "Dr. Johnson",
      vetPhone: "+1234567890",
      weightKg: "25.0",
    },
    medication: null,
    regimen: {
      active: false,
      animalId: "animal-2",
      createdAt: "2024-01-01T00:00:00Z",
      cutoffMinutes: 120,
      deletedAt: null,
      dose: "5mg",
      endDate: null,
      highRisk: true,
      id: "reg-2",
      instructions: "As needed",
      intervalHours: null,
      maxDailyDoses: 3,
      medicationId: null,
      name: "Custom Medicine",
      pausedAt: "2024-01-15T00:00:00Z",
      pauseReason: "Vet consultation needed",
      prnReason: "Pain relief",
      requiresCoSign: true,
      route: "ORAL",
      scheduleType: "PRN",
      startDate: "2024-01-01",
      timesLocal: null,
      updatedAt: "2024-01-15T00:00:00Z",
    },
  },
];

describe("RegimenDataService", () => {
  describe("transformRegimenData", () => {
    test("should transform regimen data correctly", () => {
      const result = RegimenDataService.transformRegimenData(
        mockRegimenData,
        mockValidationService,
      );

      expect(result).toHaveLength(2);

      // Test first regimen (active with medication)
      const firstRegimen = result[0];
      expect(firstRegimen?.id).toBe("reg-1");
      expect(firstRegimen?.animalName).toBe("Fluffy");
      expect(firstRegimen?.medicationName).toBe("Insulin");
      expect(firstRegimen?.status).toBe("ended"); // End date in past
      expect(firstRegimen?.highRisk).toBe(false);
      expect(firstRegimen?.validationWarnings).toEqual([]); // No validation service provided

      // Test second regimen (paused without medication)
      const secondRegimen = result[1];
      expect(secondRegimen?.id).toBe("reg-2");
      expect(secondRegimen?.animalName).toBe("Rex");
      expect(secondRegimen?.medicationName).toBe("Custom Medicine");
      expect(secondRegimen?.status).toBe("paused");
      expect(secondRegimen?.highRisk).toBe(true);
      expect(secondRegimen?.validationWarnings).toEqual([]);
    });

    test("should handle regimen without validation service", () => {
      const result = RegimenDataService.transformRegimenData(mockRegimenData);

      expect(result).toHaveLength(2);
      expect(result[0]?.validationWarnings).toEqual([]);
      expect(result[1]?.validationWarnings).toEqual([]);
    });

    test("should determine status correctly", () => {
      const activeRegimen = JSON.parse(JSON.stringify(mockRegimenData[0]));
      activeRegimen.regimen.endDate = "2025-12-31"; // Future date
      activeRegimen.regimen.active = true;
      activeRegimen.regimen.pausedAt = null;
      activeRegimen.regimen.id = "reg-active";

      const pausedRegimen = JSON.parse(JSON.stringify(mockRegimenData[0]));
      pausedRegimen.regimen.pausedAt = "2024-01-15T00:00:00Z";
      pausedRegimen.regimen.active = true; // Can be active but paused
      pausedRegimen.regimen.id = "reg-paused";

      const inactiveRegimen = JSON.parse(JSON.stringify(mockRegimenData[0]));
      inactiveRegimen.regimen.active = false;
      inactiveRegimen.regimen.pausedAt = null;
      inactiveRegimen.regimen.id = "reg-inactive";

      const result = RegimenDataService.transformRegimenData([
        activeRegimen,
        pausedRegimen,
        inactiveRegimen,
      ]);

      expect(result[0]?.status).toBe("active");
      expect(result[1]?.status).toBe("paused");
      expect(result[2]?.status).toBe("paused"); // inactive = paused in our logic
    });
  });

  describe("filterRegimens", () => {
    const testRegimens =
      RegimenDataService.transformRegimenData(mockRegimenData);

    test("should filter by animal ID", () => {
      const result = RegimenDataService.filterRegimens(testRegimens, {
        animalId: "animal-1",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.animalId).toBe("animal-1");
    });

    test("should filter active only", () => {
      const result = RegimenDataService.filterRegimens(testRegimens, {
        activeOnly: true,
      });

      expect(result).toHaveLength(0);
    });

    test("should exclude ended regimens", () => {
      const result = RegimenDataService.filterRegimens(testRegimens, {
        excludeEnded: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).not.toBe("ended");
    });

    test("should handle 'all' animal filter", () => {
      const result = RegimenDataService.filterRegimens(testRegimens, {
        animalId: "all",
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("groupRegimensByAnimal", () => {
    test("should group regimens by animal ID", () => {
      const testRegimens =
        RegimenDataService.transformRegimenData(mockRegimenData);
      const result = RegimenDataService.groupRegimensByAnimal(testRegimens);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["animal-1"]).toHaveLength(1);
      expect(result["animal-2"]).toHaveLength(1);
      expect(result["animal-1"]?.[0]?.animalName).toBe("Fluffy");
      expect(result["animal-2"]?.[0]?.animalName).toBe("Rex");
    });

    test("should handle empty regimens", () => {
      const result = RegimenDataService.groupRegimensByAnimal([]);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("buildUpdateData", () => {
    const mockEditingRegimen =
      RegimenDataService.transformRegimenData(mockRegimenData)[0]!;

    test("should build update data correctly", () => {
      const partialData = {
        cutoffMins: 180,
        form: "TABLET",
        highRisk: true,
        medicationName: "Updated Medicine",
        route: "ORAL",
        strength: "20mg",
      };

      const result = RegimenDataService.buildUpdateData(
        partialData,
        mockEditingRegimen,
        "household-1",
      );

      expect(result.id).toBe("reg-1");
      expect(result.householdId).toBe("household-1");
      expect(result.name).toBe("Updated Medicine");
      expect(result.cutoffMinutes).toBe(180);
      expect(result.highRisk).toBe(true);
      expect(result.requiresCoSign).toBe(true);
      expect(result.instructions).toBe("20mg TABLET - ORAL");
    });

    test("should handle optional dates", () => {
      const partialData = {
        endDate: new Date("2024-02-28"),
        startDate: new Date("2024-02-01"),
      };

      const result = RegimenDataService.buildUpdateData(
        partialData,
        mockEditingRegimen,
        "household-1",
      );

      expect(result.startDate).toBe("2024-02-01");
      expect(result.endDate).toBe("2024-02-28");
    });
  });

  describe("buildCreateData", () => {
    test("should build create data correctly", () => {
      const partialData = {
        animalId: "animal-1",
        cutoffMins: 240,
        form: "CAPSULE",
        highRisk: false,
        medicationName: "New Medicine",
        route: "ORAL",
        scheduleType: "FIXED" as const,
        startDate: new Date("2024-03-01"),
        strength: "15mg",
      };

      const result = RegimenDataService.buildCreateData(
        partialData,
        "household-1",
      );

      expect(result.animalId).toBe("animal-1");
      expect(result.householdId).toBe("household-1");
      expect(result.name).toBe("New Medicine");
      expect(result.cutoffMinutes).toBe(240);
      expect(result.highRisk).toBe(false);
      expect(result.requiresCoSign).toBe(false);
      expect(result.instructions).toBe("15mg CAPSULE - ORAL");
      expect(result.scheduleType).toBe("FIXED");
      expect(result.startDate).toBe("2024-03-01");
    });

    test("should use defaults for missing values", () => {
      const partialData = {};

      const result = RegimenDataService.buildCreateData(
        partialData,
        "household-1",
      );

      expect(result.animalId).toBe("");
      expect(result.cutoffMinutes).toBe(240);
      expect(result.highRisk).toBe(false);
      expect(result.requiresCoSign).toBe(false);
      expect(result.dose).toBe("");
    });

    test("should handle optional end date", () => {
      const partialData = {
        endDate: new Date("2024-03-31"),
      };

      const result = RegimenDataService.buildCreateData(
        partialData,
        "household-1",
      );

      expect(result.endDate).toBe("2024-03-31");
    });
  });
});
