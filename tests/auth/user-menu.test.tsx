/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type {
  ComponentPropsWithoutRef,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { UserMenu } from "@/components/auth/user-menu";

type AnchorMockProps = ComponentPropsWithoutRef<"a">;
type ButtonMockProps = ComponentPropsWithoutRef<"button"> & {
  variant?: string;
  size?: string;
};
type DivMockProps = ComponentPropsWithoutRef<"div">;
type AvatarImageProps = ComponentPropsWithoutRef<"img">;
type DropdownContentProps = DivMockProps & { align?: string };
type DropdownTriggerProps = { children?: ReactNode; asChild?: boolean };
type DropdownItemProps = DivMockProps & { asChild?: boolean };

// Mock dependencies
const mockLogout = mock();
const mockUseAuth = mock();
const mockUseIsMobile = mock();

mock.module("@/components/providers/app-provider-consolidated", () => ({
  useAuth: mockUseAuth,
}));

mock.module("@/hooks/shared/useResponsive", () => ({
  useIsMobile: mockUseIsMobile,
}));

// Mock UserMenuDesktop component
mock.module("@/components/auth/user-menu-desktop", () => ({
  UserMenuDesktop: () => (
    <div data-testid="desktop-user-menu">Desktop User Menu</div>
  ),
}));

// Mock Next.js Link
mock.module("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: AnchorMockProps) => (
    <a href={href?.toString()} {...props}>
      {children}
    </a>
  ),
}));

// Mock Lucide React icons
mock.module("lucide-react", () => ({
  LogIn: ({ className }: { className: string }) => (
    <div data-testid="login-icon" className={className} />
  ),
  LogOut: ({ className }: { className: string }) => (
    <div data-testid="logout-icon" className={className} />
  ),
  Settings: ({ className }: { className: string }) => (
    <div data-testid="settings-icon" className={className} />
  ),
  User: ({ className }: { className: string }) => (
    <div data-testid="user-icon" className={className} />
  ),
}));

// Mock UI components
mock.module("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: DivMockProps) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children }: DivMockProps) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
  AvatarImage: ({ src, alt }: AvatarImageProps) => (
    <span data-testid="avatar-image" data-src={src} data-alt={alt} role="img" />
  ),
}));

mock.module("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    ...props
  }: ButtonMockProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: DivMockProps) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    className,
    align,
    ...rest
  }: DropdownContentProps) => (
    <div
      data-testid="dropdown-content"
      className={className}
      data-align={align}
      {...rest}
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
    className,
    ...rest
  }: DropdownItemProps) =>
    asChild ? (
      children
    ) : (
      <div
        data-testid="dropdown-item"
        onClick={onClick}
        className={className}
        role="menuitem"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.(event as unknown as ReactMouseEvent<HTMLDivElement>);
          }
        }}
        {...rest}
      >
        {children}
      </div>
    ),
  DropdownMenuLabel: ({ children, className }: DivMockProps) => (
    <div data-testid="dropdown-label" className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: DropdownTriggerProps) =>
    asChild ? (
      (children ?? null)
    ) : (
      <div data-testid="dropdown-trigger">{children}</div>
    ),
}));

describe("UserMenu", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockLogout.mockClear();
    mockUseAuth.mockClear();
    mockUseIsMobile.mockClear();
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
  });

  describe("Responsive Behavior", () => {
    it("should render desktop version when not mobile", () => {
      mockUseIsMobile.mockReturnValue(false);
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
      });

      render(<UserMenu />);

      expect(screen.getByTestId("desktop-user-menu")).toBeTruthy();
    });

    it("should render mobile version when mobile", () => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
      });

      render(<UserMenu />);

      expect(screen.getByTestId("login-button")).toBeTruthy();
      expect(screen.queryByTestId("desktop-user-menu")).toBeFalsy();
    });
  });

  describe("Mobile Version - Unauthenticated State", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
      });
    });

    it("should show login button when user is not authenticated", () => {
      render(<UserMenu />);

      const loginButton = screen.getByTestId("login-button");
      expect(loginButton).toBeTruthy();
      expect(loginButton.getAttribute("data-variant")).toBe("outline");
      expect(loginButton.getAttribute("data-size")).toBe("sm");
    });

    it("should not show dropdown menu when not authenticated", () => {
      render(<UserMenu />);

      expect(screen.queryByTestId("dropdown-menu")).toBeFalsy();
    });
  });

  describe("Mobile Version - Authenticated State", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
    };

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    const renderMenu = () => {
      render(<UserMenu />);
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");
      const content = within(dropdown).getByTestId("dropdown-content");
      return { dropdown, trigger, content };
    };

    it("should render user avatar button when authenticated", () => {
      const { trigger } = renderMenu();

      expect(within(trigger).getByTestId("avatar")).toBeTruthy();
      expect(screen.queryByTestId("login-button")).toBeFalsy();
    });

    it("should display user avatar image when available", () => {
      const { trigger } = renderMenu();

      const avatarImage = within(trigger).getByTestId("avatar-image");
      expect(avatarImage.getAttribute("data-src")).toBe(mockUser.image);
      expect(avatarImage.getAttribute("data-alt")).toBe(mockUser.name);
    });

    it("should display user initials as fallback", () => {
      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JD");
    });

    it("should handle single name correctly for initials", () => {
      const singleNameUser = { ...mockUser, name: "Madonna" };
      mockUseAuth.mockReturnValue({
        user: singleNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("M");
    });

    it("should use email initial when no name provided", () => {
      const noNameUser = { ...mockUser, name: null };
      mockUseAuth.mockReturnValue({
        user: noNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("J");
    });

    it("should use 'U' as ultimate fallback for initials", () => {
      const noInfoUser = { id: "user-123", name: null, email: null };
      mockUseAuth.mockReturnValue({
        user: noInfoUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("U");
    });

    it("should limit initials to 2 characters max", () => {
      const longNameUser = { ...mockUser, name: "John Michael Doe Smith" };
      mockUseAuth.mockReturnValue({
        user: longNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JM");
    });
  });

  describe("Mobile Version - Dropdown Menu Content", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
    };

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    type UserOverrides = Partial<{
      id: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
    }>;

    const renderMenuWithContent = (overrides?: UserOverrides) => {
      if (overrides) {
        mockUseAuth.mockReturnValue({
          user: { ...mockUser, ...overrides },
          logout: mockLogout,
          isLoading: false,
        });
      }

      render(<UserMenu />);
      const dropdown = screen.getByTestId("dropdown-menu");
      const content = within(dropdown).getByTestId("dropdown-content");
      return { dropdown, content };
    };

    it("should display user information in dropdown label", () => {
      const { content } = renderMenuWithContent();

      expect(within(content).getByText("John Doe")).toBeTruthy();
      expect(within(content).getByText("john@example.com")).toBeTruthy();
    });

    it("should display 'User' as fallback when no name", () => {
      const noNameUser = { ...mockUser, name: null };
      mockUseAuth.mockReturnValue({
        user: noNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { content } = renderMenuWithContent({ name: null });

      expect(within(content).getByText("User")).toBeTruthy();
      expect(within(content).getByText("john@example.com")).toBeTruthy();
    });

    it("should render settings link with correct href", () => {
      const { content } = renderMenuWithContent();

      const settingsLink = within(content).getByText("Settings").closest("a");
      expect(settingsLink?.getAttribute("href")).toBe("/auth/settings");
      expect(within(content).getByTestId("settings-icon")).toBeTruthy();
    });

    it("should render profile link with correct href", () => {
      const { content } = renderMenuWithContent();

      const profileLink = within(content).getByText("Profile").closest("a");
      expect(profileLink?.getAttribute("href")).toBe("/auth/settings#profile");
      expect(within(content).getByTestId("user-icon")).toBeTruthy();
    });

    it("should render logout option with proper styling", () => {
      const { content } = renderMenuWithContent();

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem?.className).toContain("text-red-600");
      expect(within(content).getByTestId("logout-icon")).toBeTruthy();
    });

    it("should render dropdown separators", () => {
      const { content } = renderMenuWithContent();

      const separators = within(content).getAllByTestId("dropdown-separator");
      expect(separators.length).toBe(2); // One after user info, one before logout
    });
  });

  describe("Mobile Version - User Interactions", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    };

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    type InteractiveOverrides = Partial<{
      id: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
    }>;

    const renderInteractiveMenu = (overrides?: InteractiveOverrides) => {
      if (overrides) {
        mockUseAuth.mockReturnValue({
          user: { ...mockUser, ...overrides },
          logout: mockLogout,
          isLoading: false,
        });
      }

      render(<UserMenu />);
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button") as HTMLButtonElement;
      const content = within(dropdown).getByTestId("dropdown-content");
      return { dropdown, trigger, content };
    };

    it("should call logout when logout option is clicked", async () => {
      const { content } = renderInteractiveMenu();

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem).not.toBeNull();
      if (!logoutItem) {
        throw new Error("Expected logout menu item to be available");
      }
      fireEvent.click(logoutItem);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("should disable avatar button when loading", () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: true,
      });

      const { trigger } = renderInteractiveMenu();
      const avatarButton = trigger;
      expect(avatarButton.disabled).toBe(true);
    });

    it("should have proper accessibility attributes", () => {
      const { trigger } = renderInteractiveMenu();
      const avatarButton = trigger;
      expect(avatarButton.getAttribute("aria-label")).toContain(
        "User menu for John Doe",
      );
    });

    it("should handle aria-label for user without name", () => {
      const { trigger } = renderInteractiveMenu({ name: null });
      const avatarButton = trigger;
      expect(avatarButton.getAttribute("aria-label")).toContain(
        "User menu for john@example.com",
      );
    });

    it("should handle aria-label for user without name or email", () => {
      const { trigger } = renderInteractiveMenu({ name: null, email: null });
      const avatarButton = trigger;
      expect(avatarButton.getAttribute("aria-label")).toContain(
        "User menu for User",
      );
    });
  });

  describe("Loading States", () => {
    it("should handle loading state in mobile mode", () => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: { id: "123", name: "Test", email: "test@example.com" },
        logout: mockLogout,
        isLoading: true,
      });

      render(<UserMenu />);

      const dropdown = screen.getByTestId("dropdown-menu");
      const avatarButton = within(dropdown).getByRole(
        "button",
      ) as HTMLButtonElement;
      expect(avatarButton.disabled).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle logout function throwing errors", async () => {
      const errorLogout = mock(() => {
        throw new Error("Logout failed");
      });

      mockUseIsMobile.mockReturnValue(true);
      mockUseAuth.mockReturnValue({
        user: { id: "123", name: "Test", email: "test@example.com" },
        logout: errorLogout,
        isLoading: false,
      });

      render(<UserMenu />);

      const content = within(screen.getByTestId("dropdown-menu")).getByTestId(
        "dropdown-content",
      );

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");

      expect(logoutItem).not.toBeNull();
      if (!logoutItem) {
        throw new Error("Expected logout menu item to be available");
      }

      expect(() => fireEvent.click(logoutItem)).toThrow("Logout failed");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errorLogout).toHaveBeenCalledTimes(1);
    });
  });
});
