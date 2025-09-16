/**
 * @jest-environment jsdom
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
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

const actualLoginButtonModulePromise = import("@/components/auth/login-button");

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
const mockUseAuth = mock();
const mockUseSidebar = mock();

mock.module("@/components/providers/app-provider-consolidated", () => ({
  useAuth: mockUseAuth,
}));

mock.module("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="sidebar-menu" {...rest}>
      {children}
    </div>
  ),
  SidebarMenuItem: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="sidebar-menu-item" {...rest}>
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
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-size={size}
      type="button"
      {...props}
    >
      {children}
    </button>
  ),
  useSidebar: mockUseSidebar,
}));

// Mock LoginButton component
mock.module("@/components/auth/login-button", () => ({
  LoginButton: ({ variant, size }: { variant: string; size: string }) => (
    <button
      data-testid="login-button"
      data-variant={variant}
      data-size={size}
      type="button"
    >
      Sign In
    </button>
  ),
}));

// Mock Next.js Link
mock.module("next/link", () => ({
  __esModule: true,
  default: ({ href, children, className, ...props }: AnchorMockProps) => (
    <a href={href?.toString()} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock Lucide React icons
mock.module("lucide-react", () => ({
  LogIn: ({ className }: { className: string }) => (
    <div data-testid="login-icon" className={className} />
  ),
  ChevronsUpDown: ({ className }: { className: string }) => (
    <div data-testid="chevrons-up-down-icon" className={className} />
  ),
  LogOut: () => <div data-testid="logout-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

// Mock UI components
mock.module("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: DivMockProps) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children, className }: DivMockProps) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: AvatarImageProps) => (
    <span data-testid="avatar-image" data-src={src} data-alt={alt} role="img" />
  ),
}));

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="dropdown-menu" {...rest}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({
    children,
    className,
    side,
    align,
    sideOffset,
    ...rest
  }: DropdownContentProps) => (
    <div
      data-testid="dropdown-content"
      className={className}
      data-side={side}
      data-align={align}
      data-side-offset={sideOffset}
      {...rest}
    >
      {children}
    </div>
  ),
  DropdownMenuGroup: ({ children, ...rest }: DivMockProps) => (
    <div data-testid="dropdown-group" {...rest}>
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
  DropdownMenuLabel: ({ children, className, ...rest }: DivMockProps) => (
    <div data-testid="dropdown-label" className={className} {...rest}>
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
  afterEach(() => {
    cleanup();
  });

  afterAll(async () => {
    const actualLoginButtonModule = await actualLoginButtonModulePromise;
    mock.module(
      "@/components/auth/login-button",
      () => actualLoginButtonModule,
    );
  });

  beforeEach(() => {
    mockLogout.mockClear();
    mockUseAuth.mockClear();
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

  describe("Unauthenticated State", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
      });
    });

    it("should render login button when user is not authenticated", () => {
      render(<UserMenuDesktop />);

      expect(screen.getByTestId("sidebar-menu")).toBeTruthy();
      expect(screen.getByTestId("sidebar-menu-item")).toBeTruthy();

      const loginButton = screen.getByTestId("login-button");
      expect(loginButton).toBeTruthy();
      expect(loginButton.getAttribute("data-variant")).toBe("outline");
      expect(loginButton.getAttribute("data-size")).toBe("sm");
    });

    it("should not show dropdown menu when not authenticated", () => {
      render(<UserMenuDesktop />);

      expect(screen.queryByTestId("dropdown-menu")).toBeFalsy();
    });

    it("should wrap login button in sidebar components", () => {
      render(<UserMenuDesktop />);

      const sidebarMenu = screen.getByTestId("sidebar-menu");
      const sidebarMenuItem = screen.getByTestId("sidebar-menu-item");
      const loginButton = screen.getByTestId("login-button");

      expect(sidebarMenu.contains(sidebarMenuItem)).toBe(true);
      expect(sidebarMenuItem.contains(loginButton)).toBe(true);
    });
  });

  describe("Authenticated State", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
    };

    beforeEach(() => {
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

    const renderMenu = (overrides?: UserOverrides) => {
      if (overrides) {
        mockUseAuth.mockReturnValue({
          user: { ...mockUser, ...overrides },
          logout: mockLogout,
          isLoading: false,
        });
      }

      render(<UserMenuDesktop />);
      const dropdown = screen.getByTestId("dropdown-menu");
      const trigger = within(dropdown).getByRole("button");
      return { dropdown, trigger };
    };

    it("should render user menu button when authenticated", () => {
      const { trigger } = renderMenu();

      expect(within(trigger).getByTestId("avatar")).toBeTruthy();
      expect(screen.queryByTestId("login-button")).toBeFalsy();
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

      expect(within(trigger).getByTestId("chevrons-up-down-icon")).toBeTruthy();
    });

    it("should handle user without name", () => {
      const noNameUser = { ...mockUser, name: null };
      mockUseAuth.mockReturnValue({
        user: noNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      expect(within(trigger).getByText("User")).toBeTruthy(); // Fallback name
      expect(within(trigger).getByText("john@example.com")).toBeTruthy();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("J"); // Email initial
    });

    it("should generate proper initials from full name", () => {
      const longNameUser = { ...mockUser, name: "John Michael Doe Smith" };
      mockUseAuth.mockReturnValue({
        user: longNameUser,
        logout: mockLogout,
        isLoading: false,
      });

      const { trigger } = renderMenu();

      const avatarFallback = within(trigger).getByTestId("avatar-fallback");
      expect(avatarFallback.textContent).toBe("JM"); // First two initials
    });
  });

  describe("Dropdown Menu Content", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    it("should render user information in dropdown header", () => {
      render(<UserMenuDesktop />);

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
      render(<UserMenuDesktop />);

      const settingsLink = screen.getByText("Settings").closest("a");
      expect(settingsLink?.getAttribute("href")).toBe("/auth/settings");
      expect(screen.getByTestId("settings-icon")).toBeTruthy();
    });

    it("should render profile link with correct href", () => {
      render(<UserMenuDesktop />);

      const profileLink = screen.getByText("Profile").closest("a");
      expect(profileLink?.getAttribute("href")).toBe("/auth/profile");
      expect(screen.getByTestId("user-icon")).toBeTruthy();
    });

    it("should render logout option", () => {
      render(<UserMenuDesktop />);

      const logoutItem = screen
        .getByText("Log out")
        .closest("[data-testid='dropdown-item']");
      expect(logoutItem).toBeTruthy();
      expect(logoutItem?.className).toContain("text-red-600");
      expect(screen.getByTestId("logout-icon")).toBeTruthy();
    });

    it("should render dropdown separators", () => {
      render(<UserMenuDesktop />);

      const separators = screen.getAllByTestId("dropdown-separator");
      expect(separators.length).toBe(2); // One after header, one before logout
    });

    it("should render dropdown group for menu items", () => {
      render(<UserMenuDesktop />);

      expect(screen.getByTestId("dropdown-group")).toBeTruthy();
    });
  });

  describe("Sidebar Integration", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    it("should position dropdown on right when not mobile sidebar", () => {
      mockUseSidebar.mockReturnValue({ isMobile: false });

      render(<UserMenuDesktop />);

      const dropdownContent = screen.getByTestId("dropdown-content");
      expect(dropdownContent.getAttribute("data-side")).toBe("right");
    });

    it("should position dropdown on bottom when mobile sidebar", () => {
      mockUseSidebar.mockReturnValue({ isMobile: true });

      render(<UserMenuDesktop />);

      const dropdownContent = screen.getByTestId("dropdown-content");
      expect(dropdownContent.getAttribute("data-side")).toBe("bottom");
    });

    it("should apply proper sidebar menu button styling", () => {
      render(<UserMenuDesktop />);

      const menuButton = screen.getByRole("button");
      expect(menuButton.getAttribute("data-size")).toBe("lg");
      expect(menuButton.className).toContain("cursor-pointer");
      expect(menuButton.className).toContain(
        "data-[state=open]:bg-sidebar-accent",
      );
    });
  });

  describe("User Interactions", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    const renderInteractiveMenu = (overrides?: Partial<typeof mockUser>) => {
      if (overrides) {
        mockUseAuth.mockReturnValue({
          user: { ...mockUser, ...overrides },
          logout: mockLogout,
          isLoading: false,
        });
      }

      render(<UserMenuDesktop />);
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

      // No need for waitFor if mockLogout is synchronous
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("should disable menu button when loading", () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: true,
      });

      render(<UserMenuDesktop />);

      const dropdown = screen.getByTestId("dropdown-menu");
      const menuButton = within(dropdown).getByRole(
        "button",
      ) as HTMLButtonElement;
      expect(menuButton.disabled).toBe(true);
    });
  });

  describe("Avatar Styling", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isLoading: false,
      });
    });

    it("should apply rounded styling to avatars", () => {
      render(<UserMenuDesktop />);

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
      render(<UserMenuDesktop />);

      const avatars = screen.getAllByTestId("avatar");
      expect(avatars.length).toBeGreaterThanOrEqual(2);

      const buttonAvatar = avatars[0];
      expect(buttonAvatar?.className).toContain("h-8 w-8");

      const dropdownAvatar = avatars[1];
      expect(dropdownAvatar?.className).toContain("h-8 w-8");
    });
  });

  describe("Error Handling", () => {
    const mockUser = {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
    };

    it("should handle logout function throwing errors", async () => {
      const errorLogout = mock(() => {
        throw new Error("Logout failed");
      });

      const minimalUser = { ...mockUser };
      mockUseAuth.mockReturnValue({
        user: minimalUser,
        logout: errorLogout,
        isLoading: false,
      });

      render(<UserMenuDesktop />);

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
      const minimalUser = { id: "user-123" };
      mockUseAuth.mockReturnValue({
        user: minimalUser,
        logout: mockLogout,
        isLoading: false,
      });

      render(<UserMenuDesktop />);

      const dropdown = screen.getByTestId("dropdown-menu");
      const userLabels = within(dropdown).getAllByText(/User/);
      expect(userLabels.length).toBeGreaterThan(0);

      const fallbacks = within(dropdown).getAllByTestId("avatar-fallback");
      expect(fallbacks.some((node) => node.textContent === "U")).toBe(true);
    });
  });
});
