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
import { UserMenuDesktop } from "@/components/auth/user-menu-desktop";
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

type DivMockProps = ComponentPropsWithoutRef<"div">;
type ButtonMockProps = ComponentPropsWithoutRef<"button"> & { size?: string };
type AnchorMockProps = ComponentPropsWithoutRef<"a">;
type AvatarImageProps = ComponentPropsWithoutRef<"img">;
type DropdownContentProps = DivMockProps & {
  side?: string;
  align?: string;
  sideOffset?: number;
};
type DropdownItemProps = DivMockProps & {
  asChild?: boolean;
  onClick?: () => void;
};
type DropdownTriggerProps = { children?: ReactNode; asChild?: boolean };

// Mock dependencies
const mockLogout = mock();
const mockUseSidebar = mock();

// Create a test auth context value that provides what the UserMenuDesktop needs
function createTestAppContextValue(
  overrides: TestAuthOverrides = {},
): AppContextType {
  const mockLogoutFn = overrides.logout || mockLogout;
  const user = overrides.user || null;
  const userProfile =
    overrides.userProfile || (user ? createTestUserProfile(user) : null);

  return {
    accessibility: {
      announcements: { assertive: "", polite: "" },
      fontSize: "medium" as const,
      highContrast: false,
      reducedMotion: false,
    },
    animals: [],
    announce: () => {},
    authStatus:
      overrides.authStatus || (user ? "authenticated" : "unauthenticated"),
    errors: {
      animals: null,
      households: null,
      pendingMeds: null,
      user: null,
    },
    formatTemperature: () => "",
    formatTime: () => "",
    formatWeight: () => "",
    getUserTimezone: () => "UTC",
    householdSettings: {
      defaultLocation: {
        address: "",
        city: "",
        state: "",
        timezone: "UTC",
        zipCode: "",
      },
      householdRoles: [],
      inventoryPreferences: {
        autoReorderEnabled: false,
        expirationWarningDays: 7,
        lowStockThreshold: 10,
      },
      preferredVeterinarian: {
        address: "",
        name: "",
        phone: "",
      },
      primaryHouseholdName: "",
    },
    households: [],
    isAuthenticated: Boolean(user),
    isFirstTimeUser: false,
    loading: {
      animals: false,
      households: false,
      pendingMeds: false,
      user: Boolean(overrides.loading?.user),
    },
    login: () => {},
    logout: mockLogoutFn,
    markOnboardingComplete: async () => {},
    pendingSyncCount: 0,
    preferences: {
      defaultTimezone: "UTC",
      displayPreferences: {
        temperatureUnit: "celsius" as const,
        use24HourTime: false,
        weightUnit: "kg" as const,
      },
      emergencyContactName: "",
      emergencyContactPhone: "",
      notificationPreferences: {
        emailReminders: true,
        pushNotifications: true,
        reminderLeadTime: 30,
        smsReminders: false,
      },
      preferredPhoneNumber: "",
    },
    refreshAuth: async () => {},
    refreshPendingMeds: () => {},
    selectedAnimal: null,
    selectedAnimalId: null,
    selectedHousehold: null,
    // Minimal AppState properties needed for auth
    selectedHouseholdId: null,
    setSelectedAnimal: () => {},
    // Action functions
    setSelectedHousehold: () => {},
    updateHouseholdSettings: async () => {},
    updateVetMedPreferences: async () => {},
    user: user,
    userProfile,
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

mock.module("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="sidebar-menu" {...rest}>
      {children}
    </div>
  ),
  SidebarMenuButton: ({
    children,
    onClick,
    disabled,
    size,
    className,
    ...props
  }: ButtonMockProps) => (
    <button
      className={className}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
  SidebarMenuItem: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="sidebar-menu-item" {...rest}>
      {children}
    </div>
  ),
  useSidebar: mockUseSidebar,
}));

// Use real LoginButton component - no mocking needed for integration testing

// Mock Next.js Link
mock.module("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className, ...props }: AnchorMockProps) => (
    <a className={className} href={href?.toString()} {...props}>
      {children}
    </a>
  ),
}));

// Use real Lucide React icons - no mocking needed for integration testing

// Mock UI components
mock.module("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: DivMockProps) => (
    <div className={className} data-testid="avatar">
      {children}
    </div>
  ),
  AvatarFallback: ({ children, className }: DivMockProps) => (
    <div className={className} data-testid="avatar-fallback">
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: AvatarImageProps) => (
    <span data-alt={alt} data-src={src} data-testid="avatar-image" role="img" />
  ),
}));

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: DivMockProps & { forceMount?: boolean }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    className,
    side,
    align,
    sideOffset,
  }: DropdownContentProps) => (
    <div
      className={className}
      data-align={align}
      data-side={side}
      data-side-offset={sideOffset}
      data-testid="dropdown-content"
    >
      {children}
    </div>
  ),
  DropdownMenuGroup: ({ children, className }: DivMockProps) => (
    <div className={className} data-testid="dropdown-group">
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
        className={className}
        data-testid="dropdown-item"
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.(event as unknown as ReactMouseEvent<HTMLDivElement>);
          }
        }}
        role="menuitem"
        tabIndex={0}
      >
        {children}
      </div>
    ),
  DropdownMenuLabel: ({ children, className, ...rest }: DivMockProps) => (
    <div className={className} data-testid="dropdown-label" {...rest}>
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

describe("UserMenuDesktop", () => {
  beforeEach(() => {
    cleanup();
    mockLogout.mockClear();
    mockUseSidebar.mockClear();
    mockUseSidebar.mockReturnValue({
      isMobile: false,
    });
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
          <UserMenuDesktop />
        </TestAuthProvider>,
      ),
      contextValue,
      mockLogout: contextValue.logout,
    };
  }

  describe("Unauthenticated State", () => {
    it("should render login button when user is not authenticated", () => {
      renderWithAuth({ user: null });

      expect(screen.getByTestId("sidebar-menu")).toBeTruthy();
      expect(screen.getByTestId("sidebar-menu-item")).toBeTruthy();

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

    it("should wrap login button in sidebar components", () => {
      renderWithAuth({ user: null });

      const sidebarMenu = screen.getByTestId("sidebar-menu");
      const sidebarMenuItem = screen.getByTestId("sidebar-menu-item");
      const loginButton = screen.getByRole("button", { name: /sign in/i });

      expect(sidebarMenu.contains(sidebarMenuItem)).toBe(true);
      expect(sidebarMenuItem.contains(loginButton)).toBe(true);
    });
  });

  describe("Authenticated State", () => {
    const mockUser = createTestUser();

    type UserOverrides = Partial<{
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }>;

    const renderMenu = (overrides?: UserOverrides) => {
      const userOverrides = overrides
        ? { ...mockUser, ...overrides }
        : mockUser;
      renderWithAuth({ user: userOverrides });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");
      return { dropdown, trigger };
    };

    it("should render user menu button when authenticated", () => {
      const { trigger } = renderMenu();

      expect(within(trigger).getByTestId("avatar")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /sign in/i })).toBeFalsy();
    });

    it("should display user avatar image in button", () => {
      const { trigger } = renderMenu();

      const avatarImage = within(trigger).getByTestId("avatar-image");
      expect(avatarImage.getAttribute("data-src")).toBe(mockUser.image);
      expect(avatarImage.getAttribute("data-alt")).toBe(mockUser.name);
    });

    it("should display user initials as fallback in button", () => {
      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JD");
    });

    it("should display user name and email in button", () => {
      const { trigger } = renderMenu();

      expect(within(trigger).getByText("John Doe")).toBeTruthy();
      expect(within(trigger).getByText("john@example.com")).toBeTruthy();
    });

    it("should display chevron icon", () => {
      const { trigger } = renderMenu();

      // Look for the real SVG icon in the dropdown menu trigger
      expect(trigger.querySelector("svg.lucide-chevrons-up-down")).toBeTruthy();
    });

    it("should handle user without name", () => {
      const { trigger } = renderMenu({ name: null });

      expect(within(trigger).getByText("User")).toBeTruthy(); // Fallback name
      expect(within(trigger).getByText("john@example.com")).toBeTruthy();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("J"); // Email initial
    });

    it("should generate proper initials from full name", () => {
      const { trigger } = renderMenu({ name: "John Michael Doe Smith" });

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JM"); // First two initials
    });
  });

  describe("Dropdown Menu Content", () => {
    const mockUser = createTestUser();

    it("should render user information in dropdown header", () => {
      renderWithAuth({ user: mockUser });

      const dropdownLabel = screen.getByTestId("dropdown-label");
      expect(dropdownLabel).toBeTruthy();

      // Should contain avatar and user info
      const avatarImages = screen.getAllByTestId("avatar-image");
      expect(avatarImages.length).toBe(2); // One in button, one in dropdown

      const userNames = screen.getAllByText("John Doe");
      expect(userNames.length).toBe(2); // One in button, one in dropdown

      const userEmails = screen.getAllByText("john@example.com");
      expect(userEmails.length).toBe(2); // One in button, one in dropdown
    });

    it("should render settings link with correct href", () => {
      renderWithAuth({ user: mockUser });

      const settingsLink = screen
        .getByText("Settings")
        .closest("a") as HTMLElement;
      expect(settingsLink?.getAttribute("href")).toBe("/auth/settings");
      // Look for the real SVG icon in the settings link
      expect(settingsLink.querySelector("svg.lucide-settings")).toBeTruthy();
    });

    it("should render profile link with correct href", () => {
      renderWithAuth({ user: mockUser });

      const profileLink = screen
        .getByText("Profile")
        .closest("a") as HTMLElement;
      expect(profileLink?.getAttribute("href")).toBe("/auth/profile");
      // Look for the real SVG icon in the profile link
      expect(profileLink.querySelector("svg.lucide-user")).toBeTruthy();
    });

    it("should render logout option", () => {
      renderWithAuth({ user: mockUser });

      const logoutItem = screen
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem).toBeTruthy();
      expect(logoutItem?.className).toContain("text-red-600");
      // Look for the real SVG icon in the logout item
      const logoutDiv = screen
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']") as HTMLElement;
      expect(logoutDiv.querySelector("svg.lucide-log-out")).toBeTruthy();
    });

    it("should render dropdown separators", () => {
      renderWithAuth({ user: mockUser });

      const separators = screen.getAllByTestId("dropdown-separator");
      expect(separators.length).toBe(2); // One after header, one before logout
    });

    it("should render dropdown group for menu items", () => {
      renderWithAuth({ user: mockUser });

      expect(screen.getByTestId("dropdown-group")).toBeTruthy();
    });
  });

  describe("Sidebar Integration", () => {
    const mockUser = createTestUser({ image: null });

    it("should position dropdown on right when not mobile sidebar", () => {
      mockUseSidebar.mockReturnValue({ isMobile: false });

      renderWithAuth({ user: mockUser });

      const dropdownContent = screen.getByTestId("dropdown-content");
      expect(dropdownContent.getAttribute("data-side")).toBe("right");
    });

    it("should position dropdown on bottom when mobile sidebar", () => {
      mockUseSidebar.mockReturnValue({ isMobile: true });

      renderWithAuth({ user: mockUser });

      const dropdownContent = screen.getByTestId("dropdown-content");
      expect(dropdownContent.getAttribute("data-side")).toBe("bottom");
    });

    it("should apply proper sidebar menu button styling", () => {
      renderWithAuth({ user: mockUser });

      const menuButton = screen.getByRole("button");
      expect(menuButton.getAttribute("data-size")).toBe("lg");
      expect(menuButton.className).toContain("cursor-pointer");
      expect(menuButton.className).toContain(
        "data-[state=open]:bg-sidebar-accent",
      );
    });
  });

  describe("User Interactions", () => {
    const mockUser = createTestUser({ image: null });

    const renderInteractiveMenu = (overrides?: Partial<typeof mockUser>) => {
      const userOverrides = overrides
        ? { ...mockUser, ...overrides }
        : mockUser;
      const { mockLogout: testMockLogout } = renderWithAuth({
        logout: mockLogout,
        user: userOverrides,
      });
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button") as HTMLButtonElement;
      const content = within(dropdown).getByTestId("dropdown-content");
      return { content, dropdown, mockLogout: testMockLogout, trigger };
    };

    it("should call logout when logout option is clicked", async () => {
      const { content, mockLogout: testMockLogout } = renderInteractiveMenu();

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem).not.toBeNull();
      if (!logoutItem) {
        throw new Error("Expected logout menu item to be available");
      }
      fireEvent.click(logoutItem);

      // No need for waitFor if mockLogout is synchronous
      expect(testMockLogout).toHaveBeenCalledTimes(1);
    });

    it("should disable menu button when loading", () => {
      renderWithAuth({
        loading: {
          animals: false,
          households: false,
          pendingMeds: false,
          user: true,
        },
        user: mockUser,
      });

      const dropdown = screen.getByTestId("dropdown-menu");
      const menuButton = within(dropdown).getByRole(
        "button",
      ) as HTMLButtonElement;
      expect(menuButton.disabled).toBe(true);
    });
  });

  describe("Avatar Styling", () => {
    const mockUser = createTestUser({ image: null });

    it("should apply rounded styling to avatars", () => {
      renderWithAuth({ user: mockUser });

      const avatars = screen.getAllByTestId("avatar");
      avatars.forEach((avatar) => {
        expect(avatar.className).toContain("rounded-lg");
      });

      const avatarFallbacks = screen.getAllByTestId("avatar-fallback");
      avatarFallbacks.forEach((fallback) => {
        expect(fallback.className).toContain("rounded-lg");
      });
    });

    it("should apply proper sizing to avatars", () => {
      renderWithAuth({ user: mockUser });

      const avatars = screen.getAllByTestId("avatar");
      expect(avatars.length).toBeGreaterThanOrEqual(2);

      const buttonAvatar = avatars[0];
      expect(buttonAvatar?.className).toContain("h-8 w-8");

      const dropdownAvatar = avatars[1];
      expect(dropdownAvatar?.className).toContain("h-8 w-8");
    });
  });

  describe("Error Handling", () => {
    const mockUser = createTestUser({ image: null });

    it("should handle logout function throwing errors", async () => {
      const errorLogout = mock(() => {
        throw new Error("Logout failed");
      });

      renderWithAuth({
        logout: errorLogout,
        user: mockUser,
      });

      const dropdown = screen.getByTestId("dropdown-menu");
      const content = within(dropdown).getByTestId("dropdown-content");

      const logoutItem = within(content)
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");

      expect(logoutItem).not.toBeNull();
      if (!logoutItem) {
        throw new Error("Expected logout menu item to be available");
      }

      expect(() => fireEvent.click(logoutItem)).toThrow("Logout failed");

      // No need for waitFor if errorLogout is synchronous
      expect(errorLogout).toHaveBeenCalledTimes(1);
    });

    it("should handle missing user properties gracefully", () => {
      const minimalUser = createTestUser({ id: "user-123", name: null });
      renderWithAuth({ user: minimalUser });

      const dropdown = screen.getByTestId("dropdown-menu");
      const userLabels = within(dropdown).getAllByText(/User/);
      expect(userLabels.length).toBeGreaterThan(0);

      const fallbacks = within(dropdown).getAllByTestId("avatar-fallback");
      expect(fallbacks.some((node) => node.textContent === "J")).toBe(true);
    });
  });
});
