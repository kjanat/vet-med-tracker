/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as sinon from "sinon";

// Mock the auth provider
const mockLogin = mock(() => {});
const mockUseAuth = mock();

// Set up module mock first - create a completely isolated mock
mock.module("@/components/providers/app-provider-consolidated", () => ({
  useAuth: mockUseAuth,
  // Mock any other exports that might be needed
  useApp: mock(() => ({})),
  default: {},
}));

// Import the component after mocking
const { LoginButton } = await import("@/components/auth/login-button");

let clock: sinon.SinonFakeTimers; // Declare clock here

describe("LoginButton", () => {
  beforeEach(() => {
    cleanup();
    clock = sinon.useFakeTimers(); // Use sinon fake timers
    mockLogin.mockClear();
    mockUseAuth.mockClear();

    // Set default auth state
    mockUseAuth.mockImplementation(() => ({
      login: mockLogin,
      isLoading: false,
    }));
  });

  afterEach(() => {
    clock.restore(); // Restore sinon clock
  });

  describe("Component Rendering", () => {
    it("should render login button with correct text", () => {
      render(<LoginButton />);

      const button = screen.getByRole("button", { name: /sign in/i });
      expect(button).toBeTruthy();
      expect(button.textContent).toContain("Sign In");
    });

    it("should render with default props when none provided", () => {
      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(false);
    });

    it("should apply custom variant and size props", () => {
      render(<LoginButton variant="outline" size="sm" />);

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });

    it("should apply custom className", () => {
      const customClass = "custom-login-button";
      render(<LoginButton className={customClass} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain(customClass);
    });

    it("should render LogIn icon with correct styling", () => {
      render(<LoginButton />);

      const button = screen.getByRole("button");
      const icon = button.querySelector("svg");
      expect(icon).toBeTruthy();
    });
  });

  describe("User Interaction", () => {
    it("should call login function when button is clicked", async () => {
      expect.assertions(1);

      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    }, 1000);

    it("should handle multiple clicks correctly", async () => {
      expect.assertions(1);

      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(2);
    }, 1000);
  });

  describe("Loading State", () => {
    it("should be disabled when loading", () => {
      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: true,
      }));

      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should not call login when disabled during loading", async () => {
      expect.assertions(1);

      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: true,
      }));

      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockLogin).not.toHaveBeenCalled();
    }, 1000);

    it("should be enabled when not loading", () => {
      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: false,
      }));

      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe("Accessibility", () => {
    it("should be properly accessible as a button", () => {
      render(<LoginButton />);

      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should maintain accessibility when disabled", () => {
      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: true,
      }));

      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-disabled")).toBe(null); // Button handles this natively
    });
  });

  describe("Integration with Auth Hook", () => {
    it("should handle auth hook unavailability gracefully", () => {
      mockUseAuth.mockImplementation(() => ({
        login: undefined,
        isLoading: false,
      }));

      expect(() => render(<LoginButton />)).not.toThrow();
    });

    it("should handle auth hook loading state changes", () => {
      const { rerender } = render(<LoginButton />);

      // Initially not loading
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      );

      // Switch to loading
      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: true,
      }));

      rerender(<LoginButton />);
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });

  describe("Error Handling", () => {
    it("should call login function even when it throws errors", async () => {
      expect.assertions(5);

      const errorLogin = mock().mockImplementation(() => {
        throw new Error("Login failed");
      });

      mockUseAuth.mockImplementation(() => ({
        login: errorLogin,
        isLoading: false,
      }));

      render(<LoginButton />);

      const button = screen.getByRole("button");
      expect(() => fireEvent.click(button)).toThrow("Login failed");

      const result = errorLogin.mock.results[0];
      expect(result).toBeDefined();
      expect(result?.type).toBe("throw");
      const thrownFromMock = result?.value as Error | undefined;
      expect(thrownFromMock?.message).toBe("Login failed");

      // Verify the login function was called
      expect(errorLogin).toHaveBeenCalledTimes(1);
    }, 2000);
  });

  describe("Component Variants", () => {
    const variants = ["default", "outline", "ghost"] as const;
    const sizes = ["default", "sm", "lg", "icon"] as const;

    test.each(variants)("renders with '%s' variant", (variant) => {
      render(<LoginButton variant={variant} />);

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });

    test.each(sizes)("renders with '%s' size", (size) => {
      render(<LoginButton size={size} />);

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });
  });
});
