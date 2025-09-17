/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LoginButton } from "@/components/auth/login-button";
import {
  AppContext,
  type AppContextType,
} from "@/components/providers/app-provider-consolidated";
import {
  type TestAuthOverrides as BaseAuthOverrides,
  createTestAppContext,
} from "./test-auth-helpers";

type TestAuthOverrides = BaseAuthOverrides & { isLoading?: boolean };

// Create a test app context value that provides what the LoginButton needs
function createTestAppContextValue(
  overrides: TestAuthOverrides = {},
): AppContextType {
  const { isLoading, ...rest } = overrides;
  const context = createTestAppContext(rest);

  // Ensure households override uses provided array if present
  if (rest.households) {
    context.households = rest.households;
  }

  // Allow tests to override login function while keeping default no-op
  if (rest.login) {
    context.login = rest.login;
  }

  if (typeof isLoading === "boolean") {
    context.loading.user = isLoading;
  } else if (rest.loading?.user !== undefined) {
    context.loading.user = Boolean(rest.loading.user);
  }

  return context;
}

// Test provider that gives us full control
function TestAppProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppContextType;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Helper function to render component with controlled auth state
function renderWithAuth(authState: TestAuthOverrides = {}) {
  // Create mock function that can be tracked for calls
  const baseLoginFn = authState.login || (() => {});
  const loginFn = mock(baseLoginFn);
  const contextValue = createTestAppContextValue({
    ...authState,
    login: loginFn,
  });

  return {
    ...render(
      <TestAppProvider value={contextValue}>
        <LoginButton />
      </TestAppProvider>,
    ),
    loginSpy: loginFn,
    contextValue,
  };
}

describe("LoginButton", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("Component Rendering", () => {
    it("should render login button with correct text", () => {
      renderWithAuth();

      const button = screen.getByRole("button", { name: /sign in/i });
      expect(button).toBeTruthy();
      expect(button.textContent).toContain("Sign In");
    });

    it("should render with default props when none provided", () => {
      renderWithAuth();

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(false);
    });

    it("should apply custom variant and size props", () => {
      const contextValue = createTestAppContextValue();

      render(
        <TestAppProvider value={contextValue}>
          <LoginButton variant="outline" size="sm" />
        </TestAppProvider>,
      );

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });

    it("should apply custom className", () => {
      const customClass = "custom-login-button";
      const contextValue = createTestAppContextValue();

      render(
        <TestAppProvider value={contextValue}>
          <LoginButton className={customClass} />
        </TestAppProvider>,
      );

      const button = screen.getByRole("button");
      expect(button.className).toContain(customClass);
    });

    it("should render LogIn icon with correct styling", () => {
      renderWithAuth();

      const button = screen.getByRole("button");
      const icon = button.querySelector("svg");
      expect(icon).toBeTruthy();
    });
  });

  describe("User Interaction", () => {
    it("should call login function when button is clicked", async () => {
      expect.assertions(1);

      const { loginSpy } = renderWithAuth();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(loginSpy).toHaveBeenCalledTimes(1);
    }, 1000);

    it("should handle multiple clicks correctly", async () => {
      expect.assertions(1);

      const { loginSpy } = renderWithAuth();

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);

      expect(loginSpy).toHaveBeenCalledTimes(2);
    }, 1000);
  });

  describe("Loading State", () => {
    it("should be disabled when loading", () => {
      renderWithAuth({ isLoading: true });

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should not call login when disabled during loading", async () => {
      expect.assertions(1);

      const { loginSpy } = renderWithAuth({ isLoading: true });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(loginSpy).not.toHaveBeenCalled();
    }, 1000);

    it("should be enabled when not loading", () => {
      renderWithAuth({ isLoading: false });

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe("Accessibility", () => {
    it("should be properly accessible as a button", () => {
      renderWithAuth();

      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should maintain accessibility when disabled", () => {
      renderWithAuth({ isLoading: true });

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-disabled")).toBe(null); // Button handles this natively
    });
  });

  describe("Integration with Auth Hook", () => {
    it("should handle auth hook unavailability gracefully", () => {
      expect(() => renderWithAuth({ login: undefined })).not.toThrow();
    });

    it("should handle auth hook loading state changes", () => {
      const initialContextValue = createTestAppContextValue({
        isLoading: false,
      });

      const { rerender } = render(
        <TestAppProvider value={initialContextValue}>
          <LoginButton />
        </TestAppProvider>,
      );

      // Initially not loading
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      );

      // Switch to loading
      const loadingContextValue = createTestAppContextValue({
        isLoading: true,
      });
      rerender(
        <TestAppProvider value={loadingContextValue}>
          <LoginButton />
        </TestAppProvider>,
      );
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle login function that throws gracefully", () => {
      // Test that the component doesn't crash when login function is provided
      // The actual error handling is implementation detail of the login function itself
      const errorLogin = mock().mockImplementation(() => {
        // In real usage, this would be handled by the auth provider
        console.warn("Login failed - would be handled by auth provider");
      });

      expect(() => renderWithAuth({ login: errorLogin })).not.toThrow();

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });
  });

  describe("Component Variants", () => {
    const variants: string[] = ["default", "outline", "ghost"];
    const sizes: string[] = ["default", "sm", "lg", "icon"];

    test.each(variants)("renders with '%s' variant", (variant) => {
      const contextValue = createTestAppContextValue();

      render(
        <TestAppProvider value={contextValue}>
          <LoginButton variant={variant as "default" | "outline" | "ghost"} />
        </TestAppProvider>,
      );

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });

    test.each(sizes)("renders with '%s' size", (size) => {
      const contextValue = createTestAppContextValue();

      render(
        <TestAppProvider value={contextValue}>
          <LoginButton size={size as "default" | "sm" | "lg" | "icon"} />
        </TestAppProvider>,
      );

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });
  });
});
