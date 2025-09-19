/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render, screen, waitFor } from "@testing-library/react";
import { OnboardingChecker } from "@/components/auth/onboarding-checker";

// Mock dependencies
const mockUseUser = mock();
const mockUsePathname = mock();

mock.module("@stackframe/stack", () => ({
  useUser: mockUseUser,
}));

mock.module("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

mock.module("@/components/onboarding/welcome-flow", () => ({
  WelcomeFlow: () => <div data-testid="welcome-flow">Welcome Flow</div>,
}));

describe("OnboardingChecker", () => {
  const mockChildren = <div data-testid="app-content">App Content</div>;

  beforeEach(async () => {
    mockUseUser.mockClear();
    mockUsePathname.mockClear();
    mockUsePathname.mockReturnValue("/");
    let jestGlobal = globalThis.jest as
      | NonNullable<typeof globalThis.jest>
      | undefined;
    if (!jestGlobal) {
      jestGlobal = {} as NonNullable<typeof globalThis.jest>;
      globalThis.jest = jestGlobal;
    }
    if (typeof jestGlobal.advanceTimersByTime !== "function") {
      jestGlobal.advanceTimersByTime = () => {};
    }

    // Reset any leftover fake timer markers from other tests
    const timeoutAny = setTimeout as {
      clock?: unknown;
      _isMockFunction?: boolean;
    };
    if (typeof timeoutAny.clock !== "undefined") {
      delete timeoutAny.clock;
    }
    if (timeoutAny._isMockFunction) {
      timeoutAny._isMockFunction = false;
    }

    // Ensure clean DOM state
    document.body.innerHTML = "";

    // Wait for any pending React updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner when user is undefined", () => {
      mockUseUser.mockReturnValue(undefined);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      const loadingSpinner = document.querySelector(".animate-spin");
      expect(loadingSpinner).toBeTruthy();
      expect(loadingSpinner?.classList.contains("border-green-600")).toBe(true);
      expect(loadingSpinner?.classList.contains("border-b-2")).toBe(true);
    });

    it("should show loading background with proper styling", () => {
      mockUseUser.mockReturnValue(undefined);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      const loadingContainer = document.querySelector(".min-h-screen");
      expect(loadingContainer).toBeTruthy();
      expect(loadingContainer?.classList.contains("items-center")).toBe(true);
      expect(loadingContainer?.classList.contains("justify-center")).toBe(true);
      expect(loadingContainer?.classList.contains("bg-gray-50")).toBe(true);
    });

    it("should not show app content while loading", () => {
      mockUseUser.mockReturnValue(undefined);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      expect(screen.queryByTestId("app-content")).toBeFalsy();
      expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
    });
  });

  describe("Onboarding Flow Logic", () => {
    const createMockUser = (metadata = {}) => ({
      clientMetadata: metadata,
      email: "test@example.com",
      id: "user-123",
      name: "Test User",
    });

    it("should show onboarding for new user without preferences", async () => {
      const userWithoutPreferences = createMockUser();
      mockUseUser.mockReturnValue(userWithoutPreferences);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
        expect(screen.queryByTestId("app-content")).toBeFalsy();
      });
    });

    it("should skip onboarding for user with preferences", async () => {
      const userWithPreferences = createMockUser({
        vetMedPreferences: { timezone: "UTC" },
      });
      mockUseUser.mockReturnValue(userWithPreferences);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });

    it("should skip onboarding for user with household settings", async () => {
      const userWithSettings = createMockUser({
        householdSettings: { name: "My Household" },
      });
      mockUseUser.mockReturnValue(userWithSettings);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });

    it("should skip onboarding for user who completed it", async () => {
      const userWithCompletedOnboarding = createMockUser({
        onboardingComplete: true,
      });
      mockUseUser.mockReturnValue(userWithCompletedOnboarding);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });

    it("should skip onboarding on profile pages even for new users", async () => {
      const newUser = createMockUser();
      mockUseUser.mockReturnValue(newUser);
      mockUsePathname.mockReturnValue("/profile/settings");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });

    it("should skip onboarding on any profile subpage", async () => {
      const newUser = createMockUser();
      mockUseUser.mockReturnValue(newUser);
      mockUsePathname.mockReturnValue("/profile/edit");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle user with both preferences and completed onboarding", async () => {
      const userWithBoth = {
        clientMetadata: {
          onboardingComplete: true,
          vetMedPreferences: { timezone: "UTC" },
        },
        email: "test@example.com",
        id: "user-123",
        name: "Test User",
      };
      mockUseUser.mockReturnValue(userWithBoth);

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });

    it("should prioritize profile page check over onboarding needs", async () => {
      const newUserOnProfilePage = {
        clientMetadata: {}, // No preferences or completion
        email: "test@example.com",
        id: "user-123",
        name: "Test User",
      };
      mockUseUser.mockReturnValue(newUserOnProfilePage);
      mockUsePathname.mockReturnValue("/profile");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });
  });

  describe("User State Changes", () => {
    it("should react to user state changes", async () => {
      // Start with undefined user (loading)
      mockUseUser.mockReturnValue(undefined);
      const { rerender } = render(
        <OnboardingChecker>{mockChildren}</OnboardingChecker>,
      );

      expect(document.querySelector(".animate-spin")).toBeTruthy();

      // User loads and needs onboarding
      const newUser = {
        clientMetadata: {},
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(newUser);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      rerender(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
      });
    });

    it("should react to pathname changes", async () => {
      const newUser = {
        clientMetadata: {},
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(newUser);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      const { rerender } = render(
        <OnboardingChecker>{mockChildren}</OnboardingChecker>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
      });

      // Navigate to profile page
      mockUsePathname.mockReturnValue("/profile");
      rerender(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with null clientMetadata", async () => {
      const userWithNullMetadata = {
        clientMetadata: null,
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(userWithNullMetadata);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
      });
    });

    it("should handle user with empty clientMetadata", async () => {
      const userWithEmptyMetadata = {
        clientMetadata: {},
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(userWithEmptyMetadata);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
      });
    });

    it("should handle falsy preference values correctly", async () => {
      const userWithFalsyPrefs = {
        clientMetadata: {
          householdSettings: undefined,
          onboardingComplete: false,
          vetMedPreferences: null,
        },
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(userWithFalsyPrefs);
      mockUsePathname.mockReturnValue("/auth/dashboard");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("welcome-flow")).toBeTruthy();
      });
    });

    it("should handle root profile path correctly", async () => {
      const newUser = {
        clientMetadata: {},
        email: "test@example.com",
        id: "user-123",
      };
      mockUseUser.mockReturnValue(newUser);
      mockUsePathname.mockReturnValue("/profile");

      render(<OnboardingChecker>{mockChildren}</OnboardingChecker>);

      await waitFor(() => {
        expect(screen.getByTestId("app-content")).toBeTruthy();
        expect(screen.queryByTestId("welcome-flow")).toBeFalsy();
      });
    });
  });
});
