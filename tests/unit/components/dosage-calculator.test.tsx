/**
 * Unit tests for DosageCalculator component
 */

import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DosageCalculator } from "@/components/dosage-calculator";
import {
  clickButton,
  fillFormField,
  renderWithProviders,
  selectOption,
} from "@/tests/helpers/rtl-utils";

// Mock the dosage calculator module
vi.mock("@/lib/calculators/dosage", () => ({
  DosageCalculator: {
    calculate: vi.fn(),
  },
}));

const mockCalculate = vi.mocked(
  (await import("@/lib/calculators/dosage")).DosageCalculator.calculate,
);

describe("DosageCalculator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock calculation result
    mockCalculate.mockReturnValue({
      dose: 450,
      unit: "mg",
      frequency: "Twice daily",
      minDose: 300,
      maxDose: 600,
      safetyLevel: "safe",
      calculationMethod: "standard",
      weightInKg: 30,
      baseDoseMgKg: 15,
      finalDoseMgKg: 15,
      appliedAdjustments: [],
      warnings: [],
      alternativeFormats: [
        { dose: 9, unit: "mL", description: "Liquid volume" },
        { dose: 1.8, unit: "tablets", description: "Number of tablets" },
      ],
      dailyInfo: {
        dosesPerDay: 2,
        totalDailyDose: 900,
        timeBetweenDoses: "12 hours",
      },
    });
  });

  it("renders calculator form correctly", () => {
    renderWithProviders(<DosageCalculator />);

    expect(screen.getByText("Dosage Calculator")).toBeInTheDocument();
    expect(screen.getByLabelText(/animal species/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medication/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /calculate/i }),
    ).toBeInTheDocument();
  });

  it("calculates dosage when form is submitted", async () => {
    renderWithProviders(<DosageCalculator />);

    // Fill in the form
    await fillFormField("Weight", "30");
    await selectOption("Weight Unit", "kg");
    await selectOption("Species", "Dog");
    await fillFormField("Breed", "Golden Retriever");

    // Mock medication selection
    const _medicationField = screen.getByLabelText(/medication/i);
    await fillFormField("Medication", "Amoxicillin");

    // Submit the form
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(mockCalculate).toHaveBeenCalledWith({
        animal: expect.objectContaining({
          species: "dog",
          weight: 30,
          weightUnit: "kg",
          breed: "Golden Retriever",
        }),
        medication: expect.any(Object),
      });
    });
  });

  it("displays calculation results", async () => {
    renderWithProviders(<DosageCalculator />);

    // Fill and submit form
    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Medication", "Amoxicillin");
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(screen.getByText("450 mg")).toBeInTheDocument();
      expect(screen.getByText("Twice daily")).toBeInTheDocument();
      expect(screen.getByText("Range: 300 - 600 mg")).toBeInTheDocument();
      expect(screen.getByText("9 mL")).toBeInTheDocument();
      expect(screen.getByText("1.8 tablets")).toBeInTheDocument();
    });
  });

  it("displays safety warnings when present", async () => {
    mockCalculate.mockReturnValue({
      dose: 225,
      unit: "mg",
      frequency: "Twice daily",
      minDose: 150,
      maxDose: 300,
      safetyLevel: "caution",
      calculationMethod: "breed_adjusted",
      weightInKg: 25,
      baseDoseMgKg: 15,
      finalDoseMgKg: 7.5,
      appliedAdjustments: ["Breed adjustment: 50%"],
      warnings: ["MDR1 gene sensitivity - use with extreme caution"],
      alternativeFormats: [],
      dailyInfo: {
        dosesPerDay: 2,
        totalDailyDose: 450,
        timeBetweenDoses: "12 hours",
      },
    });

    renderWithProviders(<DosageCalculator />);

    await fillFormField("Weight", "25");
    await selectOption("Species", "Dog");
    await fillFormField("Breed", "Border Collie");
    await fillFormField("Medication", "Ivermectin");
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(screen.getByText(/caution/i)).toBeInTheDocument();
      expect(
        screen.getByText("MDR1 gene sensitivity - use with extreme caution"),
      ).toBeInTheDocument();
      expect(screen.getByText("Breed adjustment: 50%")).toBeInTheDocument();
    });
  });

  it("handles calculation errors gracefully", async () => {
    mockCalculate.mockImplementation(() => {
      throw new Error("Invalid medication data");
    });

    renderWithProviders(<DosageCalculator />);

    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Medication", "Invalid");
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(screen.getByText(/error calculating dosage/i)).toBeInTheDocument();
      expect(screen.getByText("Invalid medication data")).toBeInTheDocument();
    });
  });

  it("validates required fields", async () => {
    renderWithProviders(<DosageCalculator />);

    // Try to submit without required fields
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(screen.getByText(/weight is required/i)).toBeInTheDocument();
      expect(screen.getByText(/species is required/i)).toBeInTheDocument();
      expect(screen.getByText(/medication is required/i)).toBeInTheDocument();
    });
  });

  it("resets form when reset button is clicked", async () => {
    renderWithProviders(<DosageCalculator />);

    // Fill in some data
    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Breed", "Golden Retriever");

    // Click reset
    const _resetButton = screen.getByRole("button", { name: /reset/i });
    await clickButton("Reset");

    // Check that fields are cleared
    expect(screen.getByDisplayValue("30")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toHaveValue("");
  });

  it("allows switching between target units", async () => {
    renderWithProviders(<DosageCalculator />);

    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Medication", "Amoxicillin");

    // Select mL as target unit
    await selectOption("Target Unit", "mL");
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(mockCalculate).toHaveBeenCalledWith({
        animal: expect.any(Object),
        medication: expect.any(Object),
        targetUnit: "ml",
      });
    });
  });

  it("updates calculation when inputs change", async () => {
    renderWithProviders(<DosageCalculator />);

    // Initial calculation
    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Medication", "Amoxicillin");
    await clickButton("Calculate Dosage");

    expect(mockCalculate).toHaveBeenCalledTimes(1);

    // Change weight and recalculate
    await fillFormField("Weight", "25");
    await clickButton("Calculate Dosage");

    expect(mockCalculate).toHaveBeenCalledTimes(2);
    expect(mockCalculate).toHaveBeenLastCalledWith({
      animal: expect.objectContaining({
        weight: 25,
      }),
      medication: expect.any(Object),
    });
  });

  it("handles breed-specific adjustments correctly", async () => {
    mockCalculate.mockReturnValue({
      dose: 225,
      unit: "mg",
      frequency: "Twice daily",
      minDose: 150,
      maxDose: 300,
      safetyLevel: "caution",
      calculationMethod: "breed_adjusted",
      weightInKg: 30,
      baseDoseMgKg: 15,
      finalDoseMgKg: 7.5,
      appliedAdjustments: ["Breed adjustment: 50%"],
      warnings: ["MDR1 gene sensitivity"],
      alternativeFormats: [],
      dailyInfo: {
        dosesPerDay: 2,
        totalDailyDose: 450,
        timeBetweenDoses: "12 hours",
      },
    });

    renderWithProviders(<DosageCalculator />);

    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Breed", "Collie");
    await fillFormField("Medication", "Ivermectin");
    await clickButton("Calculate Dosage");

    await waitFor(() => {
      expect(screen.getByText("225 mg")).toBeInTheDocument();
      expect(screen.getByText("Breed adjustment: 50%")).toBeInTheDocument();
      expect(screen.getByText(/caution/i)).toBeInTheDocument();
    });
  });

  it("provides helpful medication suggestions", async () => {
    renderWithProviders(<DosageCalculator />);

    const _medicationField = screen.getByLabelText(/medication/i);

    // Start typing to trigger suggestions
    await fillFormField("Medication", "Amox");

    await waitFor(() => {
      // Should show medication suggestions
      expect(screen.getByText("Amoxicillin")).toBeInTheDocument();
    });
  });

  it("displays loading state during calculation", async () => {
    // Mock a slow calculation
    mockCalculate.mockResolvedValue({
      dose: 450,
      unit: "mg",
      frequency: "Twice daily",
      minDose: 300,
      maxDose: 600,
      safetyLevel: "safe",
      calculationMethod: "standard",
      weightInKg: 30,
      baseDoseMgKg: 15,
      finalDoseMgKg: 15,
      appliedAdjustments: [],
      warnings: [],
      alternativeFormats: [],
      dailyInfo: {
        dosesPerDay: 2,
        totalDailyDose: 900,
        timeBetweenDoses: "12 hours",
      },
    });

    renderWithProviders(<DosageCalculator />);

    await fillFormField("Weight", "30");
    await selectOption("Species", "Dog");
    await fillFormField("Medication", "Amoxicillin");
    await clickButton("Calculate Dosage");

    // Should show loading state
    expect(screen.getByText(/calculating/i)).toBeInTheDocument();

    // Wait for calculation to complete
    await waitFor(() => {
      expect(screen.getByText("450 mg")).toBeInTheDocument();
    });
  });
});
