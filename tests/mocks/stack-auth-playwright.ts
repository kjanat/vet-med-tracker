/**
 * Stack Auth Mocks for Playwright E2E Tests
 * This file provides mock user data and types for Playwright tests
 * without depending on Vitest (which causes CommonJS issues)
 */

// -----------------------------------------------------------------------------
// Mock Types (matching Stack Auth's actual types)
// -----------------------------------------------------------------------------

export interface MockStackUser {
  id: string;
  displayName?: string | null;
  primaryEmail?: string | null;
  primaryEmailVerified: boolean;
  profileImageUrl?: string | null;
  clientMetadata?: Record<string, unknown>;
  createdAt: Date;
  hasPassword: boolean;
  authMethod: "password" | "oauth" | "magic_link";
  selectedTeamId?: string | null;
  selectedTeam?: unknown | null;
}

export interface MockStackSession {
  user: MockStackUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

// -----------------------------------------------------------------------------
// Test User Data
// -----------------------------------------------------------------------------

export const TEST_USERS = {
  OWNER: {
    id: "test-owner-123",
    displayName: "Test Owner",
    primaryEmail: "owner@test.com",
    primaryEmailVerified: true,
    profileImageUrl: null,
    clientMetadata: {
      role: "OWNER",
      householdId: "test-household-123",
    },
    createdAt: new Date("2024-01-01"),
    hasPassword: true,
    authMethod: "password" as const,
    selectedTeamId: null,
    selectedTeam: null,
  },
  CAREGIVER: {
    id: "test-caregiver-456",
    displayName: "Test Caregiver",
    primaryEmail: "caregiver@test.com",
    primaryEmailVerified: true,
    profileImageUrl: null,
    clientMetadata: {
      role: "CAREGIVER",
      householdId: "test-household-123",
    },
    createdAt: new Date("2024-01-01"),
    hasPassword: true,
    authMethod: "password" as const,
    selectedTeamId: null,
    selectedTeam: null,
  },
  VET_READONLY: {
    id: "test-vet-789",
    displayName: "Test Vet",
    primaryEmail: "vet@test.com",
    primaryEmailVerified: true,
    profileImageUrl: null,
    clientMetadata: {
      role: "VETREADONLY",
      householdId: "test-household-123",
    },
    createdAt: new Date("2024-01-01"),
    hasPassword: true,
    authMethod: "password" as const,
    selectedTeamId: null,
    selectedTeam: null,
  },
  UNAUTHENTICATED: null,
} as const;

// -----------------------------------------------------------------------------
// Mock Session Factory
// -----------------------------------------------------------------------------

export function createMockSession(
  user: MockStackUser | null,
): MockStackSession | null {
  if (!user) return null;

  return {
    user,
    accessToken: `mock_token_${user.id}`,
    refreshToken: `mock_refresh_${user.id}`,
    expiresAt: Date.now() + 3600000, // 1 hour from now
  };
}

// -----------------------------------------------------------------------------
// Mock Auth State
// -----------------------------------------------------------------------------

export interface MockAuthState {
  user: MockStackUser | null;
  session: MockStackSession | null;
  isLoading: boolean;
  error: Error | null;
}

export function createMockAuthState(
  user: MockStackUser | null = null,
): MockAuthState {
  return {
    user,
    session: createMockSession(user),
    isLoading: false,
    error: null,
  };
}

// -----------------------------------------------------------------------------
// Mock Response Builders for API Routes
// -----------------------------------------------------------------------------

export const mockApiResponses = {
  /**
   * Create a successful authentication response
   */
  signInSuccess: (user: MockStackUser) => ({
    status: 200,
    data: {
      user,
      session: createMockSession(user),
    },
  }),

  /**
   * Create an authentication error response
   */
  signInError: (message = "Invalid credentials") => ({
    status: 401,
    error: {
      message,
      code: "INVALID_CREDENTIALS",
    },
  }),

  /**
   * Create a sign out response
   */
  signOutSuccess: () => ({
    status: 200,
    data: {
      success: true,
    },
  }),

  /**
   * Create a session response
   */
  sessionResponse: (user: MockStackUser | null) => {
    if (!user) {
      return {
        status: 401,
        error: {
          message: "Not authenticated",
          code: "UNAUTHENTICATED",
        },
      };
    }
    return {
      status: 200,
      data: {
        session: createMockSession(user),
      },
    };
  },

  /**
   * Create a user profile response
   */
  userResponse: (user: MockStackUser | null) => {
    if (!user) {
      return {
        status: 401,
        error: {
          message: "Not authenticated",
          code: "UNAUTHENTICATED",
        },
      };
    }
    return {
      status: 200,
      data: {
        user,
      },
    };
  },
};

// -----------------------------------------------------------------------------
// Test Helpers
// -----------------------------------------------------------------------------

export const testHelpers = {
  /**
   * Create a mock authenticated page context
   */
  createAuthenticatedContext: (user: MockStackUser = TEST_USERS.OWNER) => {
    return {
      user,
      session: createMockSession(user),
      localStorage: {
        "stack-auth-session": JSON.stringify(createMockSession(user)),
        "stack-auth-user": JSON.stringify(user),
      },
      cookies: [
        {
          name: "stack-session",
          value: user.id,
          domain: "localhost",
          path: "/",
          httpOnly: true,
        },
      ],
    };
  },

  /**
   * Create a mock unauthenticated page context
   */
  createUnauthenticatedContext: () => {
    return {
      user: null,
      session: null,
      localStorage: {},
      cookies: [],
    };
  },

  /**
   * Verify authentication state in a page
   */
  verifyAuthState: (actual: unknown, expected: MockStackUser | null) => {
    if (expected === null) {
      return actual === null || actual === undefined;
    }

    if (typeof actual !== "object" || actual === null) {
      return false;
    }

    const user = actual as MockStackUser;
    return (
      user.id === expected.id &&
      user.primaryEmail === expected.primaryEmail &&
      user.displayName === expected.displayName
    );
  },
};

export default {
  TEST_USERS,
  createMockSession,
  createMockAuthState,
  mockApiResponses,
  testHelpers,
};
