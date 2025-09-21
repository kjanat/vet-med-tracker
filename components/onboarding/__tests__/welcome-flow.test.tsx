/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeFlow } from "../welcome-flow";

// Mock the providers and dependencies
const mockUseApp = {
  markOnboardingComplete: mock(() => Promise.resolve()),
  setSelectedHousehold: mock(() => {}),
  updateHouseholdSettings: mock(() => Promise.resolve()),
  updateVetMedPreferences: mock(() => Promise.resolve()),
};

const mockUtils = {
  household: {
    getAnimals: { invalidate: mock(() => Promise.resolve()) },
    getPendingMeds: { invalidate: mock(() => Promise.resolve()) },
    list: { invalidate: mock(() => Promise.resolve()) },
  },
};

const mockCreateHouseholdMutation = {
  error: null,
  isLoading: false,
  mutateAsync: mock(() =>
    Promise.resolve({
      id: "household-123",
      name: "Test Household",
      timezone: "America/New_York",
    }),
  ),
};

const mockTrpc = {
  household: {
    create: {
      useMutation: () => mockCreateHouseholdMutation,
    },
  },
  useUtils: () => mockUtils,
};

// Mock the toast function
const mockToast = {
  error: mock(() => {}),
  success: mock(() => {}),
};

// Mock modules
mock.module("@/components/providers/app-provider-consolidated", () => ({
  useApp: () => mockUseApp,
}));

mock.module("@/server/trpc/client", () => ({
  trpc: mockTrpc,
}));

mock.module("sonner", () => ({
  toast: mockToast,
}));

mock.module("@/utils/timezone-helpers", () => ({
  BROWSER_ZONE: "America/New_York",
}));

// Mock localStorage
const mockLocalStorage = {
  clear: mock(() => {}),
  getItem: mock((key: string) => null),
  removeItem: mock((key: string) => {}),
  setItem: mock((key: string, value: string) => {}),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("WelcomeFlow", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mock.clearAllMocks();
    mockCreateHouseholdMutation.mutateAsync.mockReturnValue(
      Promise.resolve({
        id: "household-123",
        name: "Test Household",
        timezone: "America/New_York",
      }),
    );
  });

  afterEach(() => {
    mock.clearAllMocks();
  });

  describe("Initial Render and Navigation", () => {
    test("should render welcome flow on step 1", () => {
      render(<WelcomeFlow />);

      expect(
        screen.getByText("Welcome to VetMed Tracker!"),
      ).toBeInTheDocument();
      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
      expect(
        screen.getByLabelText("What should we call your household?"),
      ).toBeInTheDocument();
      expect(screen.getByText("Previous")).toBeDisabled();
      expect(screen.getByText("Next")).toBeDisabled(); // Disabled until household name is entered
    });

    test("should show correct progress indicator", () => {
      render(<WelcomeFlow />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "25"); // 1/4 * 100 = 25%
    });

    test("should enable Next button when household name is entered", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      const nextButton = screen.getByText("Next");

      expect(nextButton).toBeDisabled();

      await user.type(householdInput, "The Smith Family");

      expect(nextButton).toBeEnabled();
    });

    test("should navigate to step 2 when Next is clicked", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "The Smith Family");

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      expect(screen.getByText("Time & Location")).toBeInTheDocument();
      expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    });

    test("should navigate back to step 1 when Previous is clicked", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 2
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "The Smith Family");
      await user.click(screen.getByText("Next"));

      // Navigate back to step 1
      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeEnabled();
      await user.click(prevButton);

      expect(
        screen.getByText("Welcome to VetMed Tracker!"),
      ).toBeInTheDocument();
      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    });
  });

  describe("Step 1 - Household Setup", () => {
    test("should update household name when input changes", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "My Family");

      expect(householdInput).toHaveValue("My Family");
    });

    test("should disable Next button with empty household name", () => {
      render(<WelcomeFlow />);

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    test("should disable Next button with only whitespace in household name", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "   ");

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    test("should show placeholder text in household input", () => {
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      expect(householdInput).toHaveAttribute("placeholder", "The Smith Family");
    });
  });

  describe("Step 2 - Time & Location", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 2
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));
    });

    test("should render timezone and phone fields", () => {
      expect(screen.getByText("Time & Location")).toBeInTheDocument();
      expect(screen.getByLabelText("Your Timezone")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Phone Number (Optional)"),
      ).toBeInTheDocument();
    });

    test("should have default timezone value", () => {
      const timezoneCombobox = screen.getByRole("combobox");
      expect(timezoneCombobox).toBeInTheDocument();
    });

    test("should update phone number when input changes", async () => {
      const user = userEvent.setup();

      const phoneInput = screen.getByLabelText("Phone Number (Optional)");
      await user.type(phoneInput, "+1 (555) 123-4567");

      expect(phoneInput).toHaveValue("+1 (555) 123-4567");
    });

    test("should allow navigation to step 3 without phone number", async () => {
      const user = userEvent.setup();

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      expect(screen.getByText("Veterinary Information")).toBeInTheDocument();
      expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    });
  });

  describe("Step 3 - Veterinary Information", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 3
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
    });

    test("should render veterinary information fields", () => {
      expect(screen.getByText("Veterinary Information")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Veterinarian/Clinic Name (Optional)"),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Veterinarian Phone (Optional)"),
      ).toBeInTheDocument();
    });

    test("should update veterinarian name when input changes", async () => {
      const user = userEvent.setup();

      const vetNameInput = screen.getByLabelText(
        "Veterinarian/Clinic Name (Optional)",
      );
      await user.type(vetNameInput, "Dr. Johnson's Animal Hospital");

      expect(vetNameInput).toHaveValue("Dr. Johnson's Animal Hospital");
    });

    test("should update veterinarian phone when input changes", async () => {
      const user = userEvent.setup();

      const vetPhoneInput = screen.getByLabelText(
        "Veterinarian Phone (Optional)",
      );
      await user.type(vetPhoneInput, "+1 (555) 987-6543");

      expect(vetPhoneInput).toHaveValue("+1 (555) 987-6543");
    });

    test("should allow navigation to step 4 without veterinary info", async () => {
      const user = userEvent.setup();

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
      expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    });
  });

  describe("Step 4 - Summary and Completion", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 4 with sample data
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));

      const phoneInput = screen.getByLabelText("Phone Number (Optional)");
      await user.type(phoneInput, "+1 (555) 123-4567");
      await user.click(screen.getByText("Next"));

      const vetNameInput = screen.getByLabelText(
        "Veterinarian/Clinic Name (Optional)",
      );
      await user.type(vetNameInput, "Dr. Johnson");
      await user.click(screen.getByText("Next"));
    });

    test("should display summary of entered information", () => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
      expect(screen.getByText("Test Family")).toBeInTheDocument();
      expect(screen.getByText("+1 (555) 123-4567")).toBeInTheDocument();
      expect(screen.getByText("Dr. Johnson")).toBeInTheDocument();
      expect(screen.getByText("America/New_York")).toBeInTheDocument();
    });

    test("should show 'Not specified' for empty fields", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 4 with minimal data
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));

      expect(screen.getByText("Not provided")).toBeInTheDocument();
      expect(screen.getByText("Not specified")).toBeInTheDocument();
    });

    test("should show Complete Setup button", () => {
      expect(screen.getByText("Complete Setup")).toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });
  });

  describe("Onboarding Completion", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to completion step
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
    });

    test("should complete onboarding successfully", async () => {
      const user = userEvent.setup();

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockCreateHouseholdMutation.mutateAsync).toHaveBeenCalledWith({
          name: "Test Family",
          timezone: "America/New_York",
        });
      });

      expect(mockUseApp.updateVetMedPreferences).toHaveBeenCalled();
      expect(mockUseApp.updateHouseholdSettings).toHaveBeenCalled();
      expect(mockUseApp.markOnboardingComplete).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "Welcome to VetMed Tracker! Your profile has been set up.",
      );
    });

    test("should set selected household and localStorage", async () => {
      const user = userEvent.setup();

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockUseApp.setSelectedHousehold).toHaveBeenCalledWith({
          id: "household-123",
          name: "Test Household",
          timezone: "America/New_York",
        });
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "selectedHouseholdId",
        "household-123",
      );
    });

    test("should invalidate TRPC queries after household creation", async () => {
      const user = userEvent.setup();

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockUtils.household.getAnimals.invalidate).toHaveBeenCalledWith({
          householdId: "household-123",
        });
        expect(
          mockUtils.household.getPendingMeds.invalidate,
        ).toHaveBeenCalledWith({
          householdId: "household-123",
        });
        expect(mockUtils.household.list.invalidate).toHaveBeenCalled();
      });
    });

    test("should show loading state during completion", async () => {
      const user = userEvent.setup();

      // Make the mutation take longer to resolve
      mockCreateHouseholdMutation.mutateAsync.mockReturnValue(
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: "household-123",
                name: "Test Family",
                timezone: "America/New_York",
              }),
            100,
          ),
        ),
      );

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      expect(screen.getByText("Setting up...")).toBeInTheDocument();
      expect(completeButton).toBeDisabled();
    });

    test("should handle household creation failure", async () => {
      const user = userEvent.setup();

      mockCreateHouseholdMutation.mutateAsync.mockReturnValue(
        Promise.resolve(null),
      );

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "There was an error setting up your profile. Please try again.",
        );
      });
    });

    test("should handle API errors during completion", async () => {
      const user = userEvent.setup();

      mockCreateHouseholdMutation.mutateAsync.mockRejectedValue(
        new Error("API Error"),
      );

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "There was an error setting up your profile. Please try again.",
        );
      });
    });

    test("should reset loading state after error", async () => {
      const user = userEvent.setup();

      mockCreateHouseholdMutation.mutateAsync.mockRejectedValue(
        new Error("API Error"),
      );

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText("Complete Setup")).toBeInTheDocument();
        expect(completeButton).toBeEnabled();
      });
    });
  });

  describe("Form Data Persistence", () => {
    test("should maintain form data when navigating between steps", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Enter data in step 1
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "My Family");
      await user.click(screen.getByText("Next"));

      // Enter data in step 2
      const phoneInput = screen.getByLabelText("Phone Number (Optional)");
      await user.type(phoneInput, "+1 (555) 123-4567");
      await user.click(screen.getByText("Next"));

      // Go back to step 2
      await user.click(screen.getByText("Previous"));
      expect(screen.getByDisplayValue("+1 (555) 123-4567")).toBeInTheDocument();

      // Go back to step 1
      await user.click(screen.getByText("Previous"));
      expect(screen.getByDisplayValue("My Family")).toBeInTheDocument();
    });

    test("should pass all form data to completion function", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Fill out all steps
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Complete Family");
      await user.click(screen.getByText("Next"));

      const phoneInput = screen.getByLabelText("Phone Number (Optional)");
      await user.type(phoneInput, "+1 (555) 999-8888");
      await user.click(screen.getByText("Next"));

      const vetNameInput = screen.getByLabelText(
        "Veterinarian/Clinic Name (Optional)",
      );
      const vetPhoneInput = screen.getByLabelText(
        "Veterinarian Phone (Optional)",
      );
      await user.type(vetNameInput, "Complete Vet Clinic");
      await user.type(vetPhoneInput, "+1 (555) 777-6666");
      await user.click(screen.getByText("Next"));

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        // Check household creation call
        expect(mockCreateHouseholdMutation.mutateAsync).toHaveBeenCalledWith({
          name: "Complete Family",
          timezone: "America/New_York",
        });

        // Check VetMed preferences call
        expect(mockUseApp.updateVetMedPreferences).toHaveBeenCalledWith(
          expect.objectContaining({
            preferredPhoneNumber: "+1 (555) 999-8888",
          }),
        );

        // Check household settings call
        expect(mockUseApp.updateHouseholdSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            preferredVeterinarian: {
              address: "",
              name: "Complete Vet Clinic",
              phone: "+1 (555) 777-6666",
            },
            primaryHouseholdName: "Complete Family",
          }),
        );
      });
    });
  });

  describe("Accessibility", () => {
    test("should have proper form labels", () => {
      render(<WelcomeFlow />);

      expect(
        screen.getByLabelText("What should we call your household?"),
      ).toBeInTheDocument();
    });

    test("should have proper button states", () => {
      render(<WelcomeFlow />);

      const prevButton = screen.getByText("Previous");
      const nextButton = screen.getByText("Next");

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    test("should have accessible progress indicator", () => {
      render(<WelcomeFlow />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "25");
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid button clicks", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");

      const nextButton = screen.getByText("Next");

      // Rapidly click next button multiple times
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Should only advance one step
      expect(screen.getByText("Time & Location")).toBeInTheDocument();
      expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    });

    test("should handle empty form submission", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to final step with minimal data
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Min Family");
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));

      const completeButton = screen.getByText("Complete Setup");
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockCreateHouseholdMutation.mutateAsync).toHaveBeenCalledWith({
          name: "Min Family",
          timezone: "America/New_York",
        });
      });
    });

    test("should not navigate beyond total steps", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      // Navigate to step 4
      const householdInput = screen.getByLabelText(
        "What should we call your household?",
      );
      await user.type(householdInput, "Test Family");
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));

      expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });

    test("should not navigate below step 1", async () => {
      const user = userEvent.setup();
      render(<WelcomeFlow />);

      const prevButton = screen.getByText("Previous");
      expect(prevButton).toBeDisabled();

      // Try to click disabled button
      await user.click(prevButton);

      expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    });
  });
});
