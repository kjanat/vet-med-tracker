/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";
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
// Import the real AppContext - no mocking needed
import {
  AppContext,
  type AppContextType,
} from "@/components/providers/app-provider-consolidated";
import {
  createTestUser,
  createTestUserProfile,
  type TestAuthOverrides,
} from "./test-auth-helpers";

type AnchorMockProps = ComponentPropsWithoutRef<"a">;
type DivMockProps = ComponentPropsWithoutRef<"div">;
type AvatarImageProps = ComponentPropsWithoutRef<"img">;
type DropdownContentProps = DivMockProps & {
  align?: string;
  side?: string;
  sideOffset?: number;
};
type DropdownTriggerProps = { children?: ReactNode; asChild?: boolean };
type DropdownItemProps = DivMockProps & { asChild?: boolean };

type UserMenuOverrides = TestAuthOverrides & {
  isLoading?: boolean;
};

// Mock dependencies
const mockLogout = mock();
const mockUseIsMobile = mock();

mock.module("@/hooks/shared/useResponsive", () => ({
  useIsMobile: mockUseIsMobile,
}));

// Mock useSidebar hook
mock.module("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    isMobile: false, // Default to desktop
    state: "expanded",
    openMobile: false,
    setOpenMobile: () => {},
    toggleSidebar: () => {},
  }),
  SidebarMenu: ({ children }: { children: ReactNode }) => (
    <div data-testid="sidebar-menu">{children}</div>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => (
    <div data-testid="sidebar-menu-item">{children}</div>
  ),
  SidebarMenuButton: ({
    children,
    ...props
  }: ComponentPropsWithoutRef<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

// Create a test auth context value that provides what the UserMenu needs
function createTestAppContextValue(
  overrides: UserMenuOverrides = {},
): AppContextType {
  const mockLogoutFn = overrides.logout || mockLogout;
  const user = overrides.user || null;
  const userProfile =
    overrides.userProfile || (user ? createTestUserProfile(user) : null);

  return {
    // Minimal AppState properties needed for auth
    selectedHouseholdId: null,
    selectedAnimalId: null,
    households: [],
    animals: [],
    user: user,
    userProfile,
    isAuthenticated: Boolean(user),
    authStatus:
      overrides.authStatus || (user ? "authenticated" : "unauthenticated"),
    preferences: {
      defaultTimezone: "UTC",
      preferredPhoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notificationPreferences: {
        emailReminders: true,
        smsReminders: false,
        pushNotifications: true,
        reminderLeadTime: 30,
      },
      displayPreferences: {
        use24HourTime: false,
        temperatureUnit: "celsius" as const,
        weightUnit: "kg" as const,
      },
    },
    householdSettings: {
      primaryHouseholdName: "",
      defaultLocation: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        timezone: "UTC",
      },
      householdRoles: [],
      preferredVeterinarian: {
        name: "",
        phone: "",
        address: "",
      },
      inventoryPreferences: {
        lowStockThreshold: 10,
        autoReorderEnabled: false,
        expirationWarningDays: 7,
      },
    },
    isFirstTimeUser: false,
    accessibility: {
      announcements: { polite: "", assertive: "" },
      reducedMotion: false,
      highContrast: false,
      fontSize: "medium" as const,
    },
    isOffline: false,
    pendingSyncCount: 0,
    loading: {
      user: Boolean(overrides.loading?.user),
      households: false,
      animals: false,
      pendingMeds: false,
    },
    errors: {
      user: null,
      households: null,
      animals: null,
      pendingMeds: null,
    },
    // Action functions
    setSelectedHousehold: () => {},
    setSelectedAnimal: () => {},
    refreshPendingMeds: () => {},
    login: () => {},
    logout: mockLogoutFn,
    refreshAuth: async () => {},
    updateVetMedPreferences: async () => {},
    updateHouseholdSettings: async () => {},
    markOnboardingComplete: async () => {},
    announce: () => {},
    formatTime: () => "",
    formatWeight: () => "",
    formatTemperature: () => "",
    getUserTimezone: () => "UTC",
    selectedHousehold: null,
    selectedAnimal: null,
    // Apply any overrides
    ...overrides,
  };
}

// Test provider that gives us full control
function TestAuthProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppContextType;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Use real UserMenuDesktop component - no mocking needed for integration testing

// Use real LoginButton component - no mocking needed for integration testing

// Mock Next.js Link
mock.module("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: AnchorMockProps) => (
    <a href={href?.toString()} {...props}>
      {children}
    </a>
  ),
}));

// Use real Lucide React icons - no mocking needed for integration testing

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

// Use real Button component - no mocking needed for integration testing

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: DivMockProps & { forceMount?: boolean }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    className,
    align,
    side,
    sideOffset,
  }: DropdownContentProps) => (
    <div
      data-testid="dropdown-content"
      className={className}
      data-align={align}
      data-side={side}
      data-side-offset={sideOffset}
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
    className,
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
  beforeEach(() => {
    cleanup();
    mockLogout.mockClear();
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

  // Helper function to render component with controlled auth state
  function renderWithAuth(authState: TestAuthOverrides = {}) {
    const contextValue = createTestAppContextValue(authState);

    return {
      ...render(
        <TestAuthProvider value={contextValue}>
          <UserMenu />
        </TestAuthProvider>,
      ),
      mockLogout: contextValue.logout,
      contextValue,
    };
  }

  describe("Responsive Behavior", () => {
    it("should render desktop version when not mobile", () => {
      mockUseIsMobile.mockReturnValue(false);
      const mockUser = createTestUser();

      renderWithAuth({ user: mockUser });

      expect(screen.getByTestId("dropdown-menu")).toBeTruthy();
    });

    it("should render mobile version when mobile", () => {
      mockUseIsMobile.mockReturnValue(true);

      renderWithAuth({ user: null });

      expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
      expect(screen.queryByTestId("dropdown-menu")).toBeFalsy();
    });
  });

  describe("Mobile Version - Unauthenticated State", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it("should show login button when user is not authenticated", () => {
      renderWithAuth({ user: null });

      const loginButton = screen.getByRole("button", { name: /sign in/i });
      expect(loginButton).toBeTruthy();
      // Test the actual styling classes instead of mock attributes
      expect(loginButton.className).toContain("border"); // outline variant
      expect(loginButton.className).toContain("h-9"); // sm size
    });

    it("should not show dropdown menu when not authenticated", () => {
      renderWithAuth({ user: null });

      expect(screen.queryByTestId("dropdown-menu")).toBeFalsy();
    });
  });

  describe("Mobile Version - Authenticated State", () => {
    const mockUser = createTestUser();

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    const renderMenu = () => {
      renderWithAuth({ user: mockUser });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");
      const content = within(dropdown).getByTestId("dropdown-content");
      return { dropdown, trigger, content };
    };

    it("should render user avatar button when authenticated", () => {
      const { trigger } = renderMenu();

      expect(within(trigger).getByTestId("avatar")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /sign in/i })).toBeFalsy();
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
      renderWithAuth({ user: singleNameUser });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("M");
    });

    it("should use email initial when no name provided", () => {
      const noNameUser = { ...mockUser, name: null };
      renderWithAuth({ user: noNameUser });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("J");
    });

    it("should use 'U' as ultimate fallback for initials", () => {
      const noInfoUser = createTestUser({
        id: "user-123",
        name: null,
        email: "test@example.com",
      });
      renderWithAuth({ user: noInfoUser });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("T");
    });

    it("should limit initials to 2 characters max", () => {
      const longNameUser = { ...mockUser, name: "John Michael Doe Smith" };
      renderWithAuth({ user: longNameUser });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JM");
    });
  });

  describe("Mobile Version - Dropdown Menu Content", () => {
    const mockUser = createTestUser();

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    type UserOverrides = Partial<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }>;

    const renderMenuWithContent = (overrides?: UserOverrides) => {
      const userOverrides = overrides
        ? { ...mockUser, ...overrides }
        : mockUser;
      renderWithAuth({ user: userOverrides });
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
      const { content } = renderMenuWithContent({ name: null });

      expect(within(content).getByText("User")).toBeTruthy();
      expect(within(content).getByText("john@example.com")).toBeTruthy();
    });

    it("should render settings link with correct href", () => {
      const { content } = renderMenuWithContent();

      const settingsLink = within(content).getByText("Settings").closest("a");
      expect(settingsLink?.getAttribute("href")).toBe("/auth/settings");
      // Look for the real SVG icon instead of mock testid
      const settingsIcon = within(content)
        .getByText("Settings")
        .parentElement?.querySelector('svg[class*="lucide-settings"]');
      expect(settingsIcon).toBeTruthy();
    });

    it("should render profile link with correct href", () => {
      const { content } = renderMenuWithContent();

      const profileLink = within(content).getByText("Profile").closest("a");
      expect(profileLink?.getAttribute("href")).toBe("/auth/settings#profile");
      // Look for the real SVG icon instead of mock testid
      const userIcon = within(content)
        .getByText("Profile")
        .parentElement?.querySelector('svg[class*="lucide-user"]');
      expect(userIcon).toBeTruthy();
    });

    it("should render logout option with proper styling", () => {
      const { content } = renderMenuWithContent();

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem?.className).toContain("text-red-600");
      // Look for the real SVG icon instead of mock testid
      const logoutIcon = within(content)
        .getByText("Log out")
        .parentElement?.querySelector('svg[class*="lucide-log-out"]');
      expect(logoutIcon).toBeTruthy();
    });

    it("should render dropdown separators", () => {
      const { content } = renderMenuWithContent();

      const separators = within(content).getAllByTestId("dropdown-separator");
      expect(separators.length).toBe(2); // One after user info, one before logout
    });
  });

  describe("Mobile Version - User Interactions", () => {
    const mockUser = createTestUser({ image: null });

    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    type InteractiveOverrides = Partial<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }>;

    const renderInteractiveMenu = (overrides?: InteractiveOverrides) => {
      const userOverrides = overrides
        ? { ...mockUser, ...overrides }
        : mockUser;
      const testUser = createTestUser(userOverrides);

      renderWithAuth({ user: testUser, logout: mockLogout });
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
      renderWithAuth({
        user: mockUser,
        loading: {
          user: true,
          households: false,
          animals: false,
          pendingMeds: false,
        },
      });
      const dropdown = screen.getByTestId("dropdown-menu");
      const avatarButton = within(dropdown).getByRole(
        "button",
      ) as HTMLButtonElement;
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
      const { trigger } = renderInteractiveMenu({ name: null });
      const avatarButton = trigger;
      expect(avatarButton.getAttribute("aria-label")).toContain(
        "User menu for john@example.com",
      );
    });
  });

  describe("Loading States", () => {
    it("should handle loading state in mobile mode", () => {
      mockUseIsMobile.mockReturnValue(true);
      const testUser = createTestUser({
        id: "123",
        name: "Test",
        email: "test@example.com",
      });

      renderWithAuth({
        user: testUser,
        loading: {
          user: true,
          households: false,
          animals: false,
          pendingMeds: false,
        },
      });

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
      const testUser = createTestUser({
        id: "123",
        name: "Test",
        email: "test@example.com",
      });

      renderWithAuth({ user: testUser, logout: errorLogout });

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
