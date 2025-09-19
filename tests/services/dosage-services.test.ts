import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { DosageResult } from "@/lib/schemas/dosage";
import * as DosageFormatService from "@/lib/services/dosage-format.service";
import {
  addCalculation,
  type CalculationHistoryItem,
  createHistoryItem,
  getHistoryStats,
  loadHistory,
  removeCalculation,
  saveHistory,
} from "@/lib/services/dosage-history.service";
import {
  generatePdfContent,
  generatePrintContent,
  type PrintData,
} from "@/lib/services/dosage-print.service";
import {
  canCalculate,
  getDefaultValues,
  validateForm,
  validateSpeciesCompatibility,
  validateWeight,
} from "@/lib/services/dosage-validation.service";

// Mock localStorage for testing
const localStorageMock = {
  clear: function () {
    this.store.clear();
  },
  getItem: function (key: string) {
    return this.store.get(key) || null;
  },
  removeItem: function (key: string) {
    this.store.delete(key);
  },
  setItem: function (key: string, value: string) {
    this.store.set(key, value);
  },
  store: new Map<string, string>(),
};

// Mock global localStorage
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("DosageValidationService", () => {
  test("validates correct form data", () => {
    const validData = {
      animalId: "animal-1",
      customAdjustment: "test note",
      medicationId: "med-1",
      targetUnit: "mg",
      weight: 10.5,
      weightUnit: "kg",
    };

    const result = validateForm(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.animalId).toBe("animal-1");
      expect(result.data.weight).toBe(10.5);
    }
  });

  test("rejects invalid form data", () => {
    const invalidData = {
      animalId: "", // empty string should fail
      medicationId: "med-1",
      targetUnit: "mg",
      weight: -5, // negative weight should fail
      weightUnit: "invalid", // invalid unit should fail
    };

    const result = validateForm(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  test("checks if calculation can be performed", () => {
    const animals = [
      { id: "animal-1", species: "dog" },
      { id: "animal-2", species: "cat" },
    ];

    expect(canCalculate("animal-1", "med-1", 10, animals)).toBe(true);
    expect(canCalculate("", "med-1", 10, animals)).toBe(false);
    expect(canCalculate("animal-1", "", 10, animals)).toBe(false);
    expect(canCalculate("animal-1", "med-1", 0, animals)).toBe(false);
    expect(canCalculate("nonexistent", "med-1", 10, animals)).toBe(false);
  });

  test("validates weight input", () => {
    expect(validateWeight(10, "kg")).toEqual([]);
    expect(validateWeight(0.5, "kg")).toEqual([
      "Very small animal - consider dose reduction",
    ]);
    expect(validateWeight(60, "kg")).toEqual([
      "Large animal - verify dose scaling appropriateness",
    ]);
    expect(validateWeight(-5, "kg")).toEqual(["Weight must be positive"]);
  });

  test("validates species compatibility", () => {
    expect(validateSpeciesCompatibility("dog", ["dog", "cat"])).toEqual([]);
    expect(validateSpeciesCompatibility("bird", ["dog", "cat"])).toEqual([
      "Not approved for bird - use with veterinary guidance",
    ]);
    expect(validateSpeciesCompatibility("dog", [])).toEqual([]);
  });

  test("provides default form values", () => {
    const defaults = getDefaultValues();
    expect(defaults.animalId).toBe("");
    expect(defaults.weight).toBe(0);
    expect(defaults.weightUnit).toBe("kg");
    expect(defaults.targetUnit).toBe("mg");

    const defaultsWithAnimal = getDefaultValues("animal-1");
    expect(defaultsWithAnimal.animalId).toBe("animal-1");
  });
});

describe("DosageHistoryService", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  test("loads empty history when none exists", () => {
    const history = loadHistory();
    expect(history).toEqual([]);
  });

  test("saves and loads history correctly", () => {
    const historyItems: CalculationHistoryItem[] = [
      {
        animalName: "Buddy",
        dose: 150,
        id: "1",
        medicationName: "Amoxicillin",
        safetyLevel: "safe",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        unit: "mg",
        weight: 10,
        weightUnit: "kg",
      },
    ];

    saveHistory(historyItems);
    const loaded = loadHistory();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.animalName).toBe("Buddy");
    expect(loaded[0]?.timestamp).toBeInstanceOf(Date);
  });

  test("adds new calculation to history", () => {
    const existingHistory: CalculationHistoryItem[] = [];

    const newItem = createHistoryItem(
      "Max",
      "Carprofen",
      100,
      "mg",
      "safe",
      20,
      "kg",
      "oral",
    );

    const updatedHistory = addCalculation(existingHistory, newItem);

    expect(updatedHistory).toHaveLength(1);
    expect(updatedHistory[0]?.animalName).toBe("Max");
    expect(updatedHistory[0]?.id).toBeDefined();
    expect(updatedHistory[0]?.timestamp).toBeInstanceOf(Date);
  });

  test("limits history to maximum items", () => {
    const history: CalculationHistoryItem[] = [];

    // Add 25 items (more than the 20 limit)
    for (let i = 0; i < 25; i++) {
      const newItem = createHistoryItem(
        `Animal${i}`,
        "Medication",
        100,
        "mg",
        "safe",
        10,
        "kg",
      );
      history.push(...addCalculation(history, newItem));
    }

    const finalHistory = loadHistory();
    expect(finalHistory.length).toBeLessThanOrEqual(20);
  });

  test("removes calculation from history", () => {
    const history: CalculationHistoryItem[] = [
      {
        animalName: "Buddy",
        dose: 150,
        id: "1",
        medicationName: "Amoxicillin",
        safetyLevel: "safe",
        timestamp: new Date(),
        unit: "mg",
        weight: 10,
        weightUnit: "kg",
      },
      {
        animalName: "Max",
        dose: 200,
        id: "2",
        medicationName: "Carprofen",
        safetyLevel: "caution",
        timestamp: new Date(),
        unit: "mg",
        weight: 20,
        weightUnit: "kg",
      },
    ];

    const updatedHistory = removeCalculation(history, "1");
    expect(updatedHistory).toHaveLength(1);
    expect(updatedHistory[0]?.id).toBe("2");
  });

  test("generates history statistics", () => {
    const history: CalculationHistoryItem[] = [
      {
        animalName: "Buddy",
        dose: 150,
        id: "1",
        medicationName: "Amoxicillin",
        safetyLevel: "safe",
        timestamp: new Date(),
        unit: "mg",
        weight: 10,
        weightUnit: "kg",
      },
      {
        animalName: "Buddy",
        dose: 200,
        id: "2",
        medicationName: "Carprofen",
        safetyLevel: "caution",
        timestamp: new Date(),
        unit: "mg",
        weight: 10,
        weightUnit: "kg",
      },
      {
        animalName: "Max",
        dose: 300,
        id: "3",
        medicationName: "Amoxicillin",
        safetyLevel: "safe",
        timestamp: new Date(),
        unit: "mg",
        weight: 20,
        weightUnit: "kg",
      },
    ];

    const stats = getHistoryStats(history);

    expect(stats.totalCalculations).toBe(3);
    expect(stats.safetyLevels.safe).toBe(2);
    expect(stats.safetyLevels.caution).toBe(1);
    expect(stats.safetyLevels.danger).toBe(0);
    expect(stats.mostUsedAnimals).toHaveLength(2);
    expect(stats.mostUsedAnimals[0]?.name).toBe("Buddy");
    expect(stats.mostUsedAnimals[0]?.count).toBe(2);
    expect(stats.mostUsedMedications).toHaveLength(2);
    expect(stats.mostUsedMedications[0]?.name).toBe("Amoxicillin");
    expect(stats.mostUsedMedications[0]?.count).toBe(2);
  });
});

describe("DosagePrintService", () => {
  const mockCalculationResult: DosageResult = {
    appliedAdjustments: ["species adjustment"],
    baseDoseMgKg: 15,
    calculationMethod: "basic_weight",
    dose: 150,
    finalDoseMgKg: 15,
    frequency: "twice daily",
    maxDose: 200,
    minDose: 100,
    safetyLevel: "safe",
    unit: "mg",
    warnings: ["Test warning"],
    weightInKg: 10,
  };

  const mockPrintData: PrintData = {
    animalName: "Buddy",
    animalSpecies: "dog",
    brandName: "Brand Name",
    calculationResult: mockCalculationResult,
    medicationName: "Amoxicillin",
    weight: 10,
    weightUnit: "kg",
  };

  test("generates print content HTML", () => {
    const html = generatePrintContent(mockPrintData);

    expect(html).toContain("Buddy");
    expect(html).toContain("Amoxicillin (Brand Name)");
    expect(html).toContain("150 mg");
    expect(html).toContain("Safe Dose");
    expect(html).toContain("Test warning");
    expect(html).toContain("species adjustment");
  });

  test("handles missing brand name", () => {
    const dataWithoutBrand = { ...mockPrintData, brandName: null };
    const html = generatePrintContent(dataWithoutBrand);

    expect(html).toContain("Amoxicillin");
    expect(html).not.toContain("Brand Name");
  });

  test("handles missing route", () => {
    const dataWithoutRoute = { ...mockPrintData, route: undefined };
    const html = generatePrintContent(dataWithoutRoute);

    expect(html).toContain("Not specified");
  });

  test("generates PDF content structure", () => {
    const pdfContent = generatePdfContent(mockPrintData);

    expect(pdfContent.title).toBe("Dosage Calculation - Buddy");
    expect(pdfContent.sections).toHaveLength(4);
    expect(pdfContent.warnings).toEqual(["Test warning"]);
    expect(pdfContent.safetyLevel.level).toBe("safe");
    expect(pdfContent.safetyLevel.label).toBe("Safe Dose");
  });
});

describe("DosageFormatService", () => {
  const mockCalculationResult: DosageResult = {
    alternativeFormats: [
      { description: "Liquid volume", dose: 1.5, unit: "mL" },
    ],
    appliedAdjustments: ["species adjustment"],
    baseDoseMgKg: 15,
    calculationMethod: "basic_weight",
    dose: 150,
    finalDoseMgKg: 15,
    frequency: "twice daily",
    maxDose: 200,
    minDose: 100,
    safetyLevel: "safe",
    unit: "mg",
    warnings: [],
    weightInKg: 10,
  };

  test("gets safety configuration", () => {
    const config = DosageFormatService.getSafetyConfig("safe");
    expect(config.label).toBe("Safe Dose");
    expect(config.icon).toBe("✓");
    expect(config.color).toBeDefined();
  });

  test("calculates dose percentage", () => {
    expect(DosageFormatService.calculateDosePercentage(150, 100, 200)).toBe(50);
    expect(DosageFormatService.calculateDosePercentage(100, 100, 200)).toBe(0);
    expect(DosageFormatService.calculateDosePercentage(200, 100, 200)).toBe(
      100,
    );
    expect(DosageFormatService.calculateDosePercentage(75, 100, 200)).toBe(0); // clamped to 0
  });

  test("prepares safety indicator data", () => {
    const data = DosageFormatService.prepareSafetyIndicatorData(
      mockCalculationResult,
    );

    expect(data.config.label).toBe("Safe Dose");
    expect(data.percentage).toBe(50);
    expect(data.dose).toBe("150");
    expect(data.unit).toBe("mg");
    expect(data.alternativeFormats).toHaveLength(1);
  });

  test("formats calculation method", () => {
    expect(DosageFormatService.formatCalculationMethod("basic_weight")).toBe(
      "Basic Weight",
    );
    expect(
      DosageFormatService.formatCalculationMethod("species_adjusted"),
    ).toBe("Species Adjusted");
  });

  test("formats various display values", () => {
    expect(DosageFormatService.formatWeight(10.5, "kg")).toBe("10.5 kg");
    expect(DosageFormatService.formatDose(150, "mg")).toBe("150 mg");
    expect(DosageFormatService.formatDoseRange(100, 200, "mg")).toBe(
      "100 - 200 mg",
    );
    expect(
      DosageFormatService.formatMedicationName("Amoxicillin", "Brand"),
    ).toBe("Amoxicillin (Brand)");
    expect(DosageFormatService.formatMedicationName("Amoxicillin")).toBe(
      "Amoxicillin",
    );
    expect(DosageFormatService.formatRoute("oral")).toBe("oral");
    expect(DosageFormatService.formatRoute()).toBe("Not specified");
    expect(DosageFormatService.formatAdjustments(["adj1", "adj2"])).toBe(
      "adj1, adj2",
    );
    expect(DosageFormatService.formatAdjustments([])).toBe("None");
  });

  test("gets CSS classes for safety levels", () => {
    const safeClasses = DosageFormatService.getSafetyClasses("safe");
    expect(safeClasses.border).toContain("green");
    expect(safeClasses.background).toContain("green");
    expect(safeClasses.text).toContain("green");

    const cautionClasses = DosageFormatService.getSafetyClasses("caution");
    expect(cautionClasses.border).toContain("yellow");

    const dangerClasses = DosageFormatService.getSafetyClasses("danger");
    expect(dangerClasses.border).toContain("red");
  });

  test("validates calculation results", () => {
    expect(
      DosageFormatService.isValidCalculationResult(mockCalculationResult),
    ).toBe(true);
    expect(DosageFormatService.isValidCalculationResult(null)).toBe(false);
    expect(
      DosageFormatService.isValidCalculationResult({} as DosageResult),
    ).toBe(false);
  });

  test("gets warning urgency", () => {
    expect(DosageFormatService.getWarningUrgency("safe")).toBe("low");
    expect(DosageFormatService.getWarningUrgency("caution")).toBe("medium");
    expect(DosageFormatService.getWarningUrgency("danger")).toBe("high");
  });

  test("formats daily dosing info", () => {
    const dailyInfo = {
      dosesPerDay: 2,
      timeBetweenDoses: "12 hours",
      totalDailyDose: 300,
    };

    const formatted = DosageFormatService.formatDailyInfo(dailyInfo);
    expect(formatted).toBe("2 doses per day (12 hours apart), total: 300");
    expect(DosageFormatService.formatDailyInfo(undefined)).toBe(null);
  });

  test("determines if dose is safe", () => {
    expect(DosageFormatService.isDoseSafe(150, 100, 200)).toBe(true);
    expect(DosageFormatService.isDoseSafe(50, 100, 200)).toBe(false);
    expect(DosageFormatService.isDoseSafe(250, 100, 200)).toBe(false);
  });

  test("gets recommended actions", () => {
    expect(DosageFormatService.getRecommendedAction("safe")).toContain(
      "safe for administration",
    );
    expect(DosageFormatService.getRecommendedAction("caution")).toContain(
      "veterinary consultation",
    );
    expect(DosageFormatService.getRecommendedAction("danger")).toContain(
      "Do not administer",
    );
  });
});
