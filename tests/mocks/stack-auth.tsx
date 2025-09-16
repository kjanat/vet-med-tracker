/**
 * Stack Auth Mock System
 * Comprehensive mocking utilities for Stack Auth in tests
 */

import type { Page, Route } from "@playwright/test";
import Image from "next/image";
import type React from "react";
import { vi } from "vitest";

interface MockVetMedPreferences {
  defaultTimezone?: string;
  role?: string;
  [key: string]: unknown;
}

interface MockClientMetadata
  extends Record<string, unknown | MockVetMedPreferences> {
  onboardingComplete?: boolean;
  vetMedPreferences?: MockVetMedPreferences;
}

interface MockClientReadOnlyMetadata extends Record<string, unknown> {
  householdSettings?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Mock Types (matching Stack Auth's actual types)
// -----------------------------------------------------------------------------

export interface MockStackUser {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  profileImageUrl: string | null;
  signedUpAtMillis: number;
  signedUpAt: Date;
  hasPassword: boolean;
  oauthProviders: readonly { id: string }[];
  selectedTeamId: string | null;
  clientMetadata: MockClientMetadata;
  clientReadOnlyMetadata: MockClientReadOnlyMetadata;
  otpAuthEnabled: boolean;
  passkeyAuthEnabled: boolean;
  isMultiFactorRequired: boolean;
  isAnonymous: boolean;
  emailAuthEnabled: boolean;
  toClientJson: () => unknown;
  _internalSession: MockStackSession | null;
  currentSession: MockStackSession | null;
  getAuthHeaders: () => Promise<{ "x-stack-auth": string }>;
  getAuthJson: () => unknown;
  registerPasskey: () => Promise<void>;
  update: (data: Partial<MockStackUser>) => Promise<void>;
  signOut: () => Promise<void>;
  delete: () => Promise<void>;
  signedIn?: boolean;
}

export interface MockStackSession {
  user: MockStackUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refresh: () => Promise<MockStackSession>;
  revoke: () => Promise<void>;
}

export interface MockStackServerApp {
  getUser: (options?: {
    or?: "redirect" | "throw";
  }) => Promise<MockStackUser | null>;
  signInUrl: string;
  signUpUrl: string;
  signOutUrl: string;
  accountSettingsUrl: string;
}

// -----------------------------------------------------------------------------
// User Factory Functions
// -----------------------------------------------------------------------------

export const createMockUser = (
  overrides: Partial<MockStackUser> = {},
): MockStackUser => {
  const now = Date.now();
  const defaultUser: MockStackUser = {
    id: `user_${now}_${Math.random().toString(36).substring(2, 9)}`,
    displayName: "Test User",
    primaryEmail: "testuser@example.com",
    primaryEmailVerified: true,
    profileImageUrl: null,
    signedUpAtMillis: now,
    signedUpAt: new Date(now),
    hasPassword: true,
    oauthProviders: [],
    selectedTeamId: null,
    otpAuthEnabled: false,
    passkeyAuthEnabled: false,
    isMultiFactorRequired: false,
    isAnonymous: false,
    emailAuthEnabled: true,
    toClientJson: vi.fn().mockReturnValue({}),
    _internalSession: null,
    currentSession: null,
    getAuthHeaders: vi.fn().mockResolvedValue({ "x-stack-auth": "mock-token" }),
    getAuthJson: vi.fn().mockReturnValue({}),
    registerPasskey: vi.fn().mockResolvedValue(undefined),
    clientMetadata: {
      onboardingComplete: true,
      vetMedPreferences: {
        defaultTimezone: "America/New_York",
        preferredUnits: "metric",
        notifications: {
          email: true,
          push: false,
        },
      },
    },
    clientReadOnlyMetadata: {
      householdSettings: {
        primaryHouseholdName: "Test Household",
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    signedIn: true,
  };

  return {
    ...defaultUser,
    ...overrides,
    clientMetadata: {
      ...defaultUser.clientMetadata,
      ...overrides.clientMetadata,
    },
    clientReadOnlyMetadata: {
      ...defaultUser.clientReadOnlyMetadata,
      ...overrides.clientReadOnlyMetadata,
    },
  };
};

// Pre-defined test users matching the old Clerk patterns
export const TEST_USERS = {
  OWNER: createMockUser({
    id: "user_owner_test",
    displayName: "Test Owner",
    primaryEmail: "owner@vetmed.test",
    clientMetadata: {
      onboardingComplete: true,
      vetMedPreferences: {
        defaultTimezone: "America/New_York",
        role: "OWNER",
      },
    },
  }),
  CAREGIVER: createMockUser({
    id: "user_caregiver_test",
    displayName: "Test Caregiver",
    primaryEmail: "caregiver@vetmed.test",
    clientMetadata: {
      onboardingComplete: true,
      vetMedPreferences: {
        defaultTimezone: "America/New_York",
        role: "CAREGIVER",
      },
    },
  }),
  VET_READONLY: createMockUser({
    id: "user_vet_test",
    displayName: "Dr. Test Veterinarian",
    primaryEmail: "vet@vetmed.test",
    clientMetadata: {
      onboardingComplete: true,
      vetMedPreferences: {
        defaultTimezone: "America/New_York",
        role: "VETREADONLY",
      },
    },
  }),
} as const;

// -----------------------------------------------------------------------------
// Mock Session Factory
// -----------------------------------------------------------------------------

export const createMockSession = (user: MockStackUser): MockStackSession => {
  const refreshMock = vi.fn<() => Promise<MockStackSession>>();
  const session: MockStackSession = {
    user,
    accessToken: `mock_token_${user.id}`,
    refreshToken: `mock_refresh_${user.id}`,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    refresh: refreshMock,
    revoke: vi.fn().mockResolvedValue(undefined),
  };

  refreshMock.mockResolvedValue(session);
  return session;
};

// -----------------------------------------------------------------------------
// Mock Stack Server App
// -----------------------------------------------------------------------------

export const createMockStackServerApp = (
  defaultUser: MockStackUser | null = null,
): MockStackServerApp => ({
  getUser: vi.fn().mockImplementation(async (options = {}) => {
    if (defaultUser === null && options.or === "redirect") {
      // Simulate redirect behavior
      throw new Error("REDIRECT_TO_SIGNIN");
    }
    if (defaultUser === null && options.or === "throw") {
      throw new Error("UNAUTHORIZED");
    }
    return defaultUser;
  }),
  signInUrl: "/handler/sign-in",
  signUpUrl: "/handler/sign-up",
  signOutUrl: "/handler/sign-out",
  accountSettingsUrl: "/handler/account-settings",
});

// -----------------------------------------------------------------------------
// React Hook Mocks
// -----------------------------------------------------------------------------

export const createMockUseUser = (user: MockStackUser | null = null) => {
  return vi.fn().mockReturnValue(user);
};

export const createMockUseStackApp = () => {
  return vi.fn().mockReturnValue(createMockStackServerApp());
};

// -----------------------------------------------------------------------------
// Provider Mocks
// -----------------------------------------------------------------------------

export const MockStackProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div data-testid="mock-stack-provider">{children}</div>;
};

export const MockStackTheme = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-stack-theme">{children}</div>;
};

// -----------------------------------------------------------------------------
// Authentication Component Mocks
// -----------------------------------------------------------------------------

export const MockSignIn = () => (
  <div data-testid="mock-sign-in">
    <form>
      <input name="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit">Sign In</button>
    </form>
  </div>
);

export const MockSignUp = () => (
  <div data-testid="mock-sign-up">
    <form>
      <input name="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Password" />
      <input name="firstName" placeholder="First Name" />
      <input name="lastName" placeholder="Last Name" />
      <button type="submit">Sign Up</button>
    </form>
  </div>
);

export const MockUserButton = ({ user }: { user?: MockStackUser }) => (
  <div data-testid="mock-user-button">
    {user ? (
      <div>
        <Image
          src={user.profileImageUrl || "/default-avatar.png"}
          alt={user.displayName || "User"}
          width={40}
          height={40}
          unoptimized
        />
        <span>{user.displayName || user.primaryEmail}</span>
        <button type="button" onClick={() => user.signOut()}>
          Sign Out
        </button>
      </div>
    ) : (
      <button type="button">Sign In</button>
    )}
  </div>
);

// -----------------------------------------------------------------------------
// Test Utilities
// -----------------------------------------------------------------------------
// biome-ignore lint/complexity/noStaticOnlyClass: Test utility class with static state management
export class StackAuthTestUtils {
  private static mockUser: MockStackUser | null = null;
  private static mockStackServerApp: MockStackServerApp;

  static initialize() {
    StackAuthTestUtils.mockStackServerApp = createMockStackServerApp(
      StackAuthTestUtils.mockUser,
    );
  }

  /**
   * Set the current mock user for all Stack Auth hooks and server calls
   */
  static setMockUser(user: MockStackUser | null) {
    StackAuthTestUtils.mockUser = user;
    StackAuthTestUtils.mockStackServerApp = createMockStackServerApp(user);
  }

  /**
   * Get the current mock user
   */
  static getMockUser(): MockStackUser | null {
    return StackAuthTestUtils.mockUser;
  }

  /**
   * Get the mock server app instance
   */
  static getMockStackServerApp(): MockStackServerApp {
    return StackAuthTestUtils.mockStackServerApp;
  }

  /**
   * Sign in a test user
   */
  static async signIn(user: MockStackUser = TEST_USERS.OWNER) {
    StackAuthTestUtils.setMockUser(user);
    return user;
  }

  /**
   * Sign out the current user
   */
  static async signOut() {
    StackAuthTestUtils.setMockUser(null);
  }

  /**
   * Reset all mocks to initial state
   */
  static reset() {
    StackAuthTestUtils.mockUser = null;
    StackAuthTestUtils.mockStackServerApp = createMockStackServerApp(null);
    vi.clearAllMocks();
  }

  /**
   * Create a test scenario with authenticated user
   */
  static withAuthenticatedUser<T>(
    user: MockStackUser,
    callback: (user: MockStackUser) => T,
  ): T {
    const originalUser = StackAuthTestUtils.mockUser;
    StackAuthTestUtils.setMockUser(user);
    try {
      return callback(user);
    } finally {
      StackAuthTestUtils.setMockUser(originalUser);
    }
  }

  /**
   * Create a test scenario with unauthenticated user
   */
  static withUnauthenticatedUser<T>(callback: () => T): T {
    const originalUser = StackAuthTestUtils.mockUser;
    StackAuthTestUtils.setMockUser(null);
    try {
      return callback();
    } finally {
      StackAuthTestUtils.setMockUser(originalUser);
    }
  }
}

// Initialize the test utils
StackAuthTestUtils.initialize();

// -----------------------------------------------------------------------------
// Module Mocks (for vi.mock usage)
// -----------------------------------------------------------------------------

export const stackAuthMocks = {
  "@stackframe/stack": {
    useUser: () => StackAuthTestUtils.getMockUser(),
    useStackApp: () => StackAuthTestUtils.getMockStackServerApp(),
    StackProvider: MockStackProvider,
    StackTheme: MockStackTheme,
    SignIn: MockSignIn,
    SignUp: MockSignUp,
    UserButton: MockUserButton,
  },
};

// -----------------------------------------------------------------------------
// Playwright Test Helpers
// -----------------------------------------------------------------------------
// biome-ignore lint/complexity/noStaticOnlyClass: Test utility class with static methods for consistency
export class StackAuthPlaywrightHelpers {
  /**
   * Mock Stack Auth for Playwright tests by intercepting API calls
   */
  static async mockStackAuth(
    page: Page,
    user: MockStackUser | null = TEST_USERS.OWNER,
  ) {
    // Intercept Stack Auth API calls
    await page.route("**/api/stack-auth/**", async (route: Route) => {
      const url = route.request().url();

      if (url.includes("/user")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user }),
        });
      } else if (url.includes("/session")) {
        const session = user ? createMockSession(user) : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ session }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock localStorage for client-side session management
    await page.addInitScript((userData: MockStackUser | null) => {
      if (userData) {
        localStorage.setItem(
          "stack-auth-session",
          JSON.stringify({
            user: userData,
            accessToken: `mock_token_${userData.id}`,
            expiresAt: Date.now() + 3600000,
          }),
        );
      } else {
        localStorage.removeItem("stack-auth-session");
      }
    }, user);
  }

  /**
   * Sign in a test user in Playwright
   */
  static async signIn(page: Page, user: MockStackUser = TEST_USERS.OWNER) {
    await StackAuthPlaywrightHelpers.mockStackAuth(page, user);

    // Navigate to sign-in page and simulate successful authentication
    await page.goto("/handler/sign-in");
    await page.evaluate((userData: MockStackUser) => {
      // Dispatch custom event to simulate successful sign-in
      window.dispatchEvent(
        new CustomEvent("stack-auth-sign-in", {
          detail: { user: userData },
        }),
      );
    }, user);

    // Wait for redirect to dashboard or wherever authenticated users go
    await page.waitForURL(/\/dashboard|\/profile|\/onboarding/);
  }

  /**
   * Sign out the current user in Playwright
   */
  static async signOut(page: Page) {
    await StackAuthPlaywrightHelpers.mockStackAuth(page, null);

    await page.evaluate(() => {
      localStorage.removeItem("stack-auth-session");
      window.dispatchEvent(new CustomEvent("stack-auth-sign-out"));
    });

    // Wait for redirect to public page
    await page.waitForURL(/\/sign-in|\/$/);
  }
}

// -----------------------------------------------------------------------------
// Legacy Compatibility (for migration from Clerk)
// -----------------------------------------------------------------------------

export interface LegacyClerkUserData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailAddresses?: Array<{
    emailAddress: string;
    verification?: { status?: string } | null;
  }>;
  primaryEmailAddress?: {
    emailAddress: string;
    verification?: { status?: string } | null;
  } | null;
  publicMetadata?: {
    onboardingComplete?: boolean;
  };
  unsafeMetadata?: {
    vetMedPreferences?: Record<string, unknown>;
    householdSettings?: Record<string, unknown>;
  };
}

/**
 * Compatibility layer for tests migrating from Clerk
 * These functions provide similar APIs to the old Clerk test utils
 */
export const ClerkCompatibilityLayer = {
  // Map old Clerk user creation to Stack Auth
  createMockClerkUser: (userData: LegacyClerkUserData) =>
    createMockUser({
      displayName: `${userData.firstName} ${userData.lastName}`,
      primaryEmail:
        userData.emailAddresses?.[0]?.emailAddress || userData.email,
      clientMetadata: {
        onboardingComplete:
          userData.publicMetadata?.onboardingComplete || false,
        vetMedPreferences: userData.unsafeMetadata?.vetMedPreferences || {},
        householdSettings: userData.unsafeMetadata?.householdSettings || {},
      },
    }),

  // Map old Clerk session to Stack Auth session
  createTestSession: (userData: LegacyClerkUserData) => {
    const user = ClerkCompatibilityLayer.createMockClerkUser(userData);
    return createMockSession(user);
  },
};

const stackAuthMocksExport = {
  StackAuthTestUtils,
  StackAuthPlaywrightHelpers,
  createMockUser,
  createMockSession,
  createMockStackServerApp,
  TEST_USERS,
  stackAuthMocks,
  ClerkCompatibilityLayer,
};

export default stackAuthMocksExport;
