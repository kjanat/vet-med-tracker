/**
 * @jest-environment jsdom
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as sinon from "sinon"; // Import sinon

// Use actual lucide-react exports to avoid interfering with other test modules

// Mock the auth provider
const mockLogin = mock(() => {});
const mockUseAuth = mock();
type AuthState = {
  login?: () => void;
  isLoading: boolean;
};
let authState: AuthState;

const actualAppProviderModule = await import(
  "@/components/providers/app-provider-consolidated"
);

const setAuthState = (state: AuthState) => {
  authState = state;
  mockUseAuth.mockImplementation(() => authState);
};

mock.module("@/components/providers/app-provider-consolidated", () => ({
  ...actualAppProviderModule,
  useAuth: mockUseAuth,
}));

// Use actual button/icon implementations to better match production behavior

let LoginButton: typeof import("@/components/auth/login-button").LoginButton;

beforeAll(async () => {
  ({ LoginButton } = await import("@/components/auth/login-button"));
});

let clock: sinon.SinonFakeTimers; // Declare clock here

describe("LoginButton", () => {
  beforeEach(() => {
    cleanup();
    clock = sinon.useFakeTimers(); // Use sinon fake timers
    mockLogin.mockClear();
    mockUseAuth.mockReset();
    setAuthState({
      login: mockLogin,
      isLoading: false,
    });
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
      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple clicks correctly", async () => {
      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockLogin).toHaveBeenCalledTimes(2);
    });
  });

  describe("Loading State", () => {
    it("should be disabled when loading", () => {
      setAuthState({
        login: mockLogin,
        isLoading: true,
      });

      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it("should not call login when disabled during loading", async () => {
      setAuthState({
        login: mockLogin,
        isLoading: true,
      });

      render(<LoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it("should be enabled when not loading", () => {
      setAuthState({
        login: mockLogin,
        isLoading: false,
      });

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
      setAuthState({
        login: mockLogin,
        isLoading: true,
      });

      render(<LoginButton />);

      const button = screen.getByRole("button") as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-disabled")).toBe(null); // Button handles this natively
    });
  });

  describe("Integration with Auth Hook", () => {
    it("should handle auth hook unavailability gracefully", () => {
      setAuthState({
        login: undefined,
        isLoading: false,
      });

      expect(() => render(<LoginButton />)).not.toThrow();
    });

    it("should handle auth hook loading state changes", () => {
      const { rerender } = render(<LoginButton />);

      // Initially not loading
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      );

      // Switch to loading
      setAuthState({
        login: mockLogin,
        isLoading: true,
      });

      rerender(<LoginButton />);
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });

  describe("Error Handling", () => {
    it("should call login function even when it throws errors", async () => {
      const errorLogin = mock().mockImplementation(() => {
        throw new Error("Login failed");
      });

      setAuthState({
        login: errorLogin,
        isLoading: false,
      });

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
    });
  });

  describe("Component Variants", () => {
    const variants = ["default", "outline", "ghost"] as const;
    const sizes = ["default", "sm", "lg", "icon"] as const;

    variants.forEach((variant) => {
      it(`should render correctly with ${variant} variant`, () => {
        render(<LoginButton variant={variant} />);

        const button = screen.getByRole("button");
        expect(button).toBeTruthy();
      });
    });

    sizes.forEach((size) => {
      it(`should render correctly with ${size} size`, () => {
        render(<LoginButton size={size} />);

        const button = screen.getByRole("button");
        expect(button).toBeTruthy();
      });
    });
  });
});
