/**
 * Stack Auth Test Utilities
 * Easy-to-use test helpers for Stack Auth testing
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { 
  StackAuthTestUtils,
  createMockUser,
  TEST_USERS,
  type MockStackUser
} from "../mocks/stack-auth";

// -----------------------------------------------------------------------------
// React Testing Library Helpers
// -----------------------------------------------------------------------------

/**
 * Custom render function that automatically sets up Stack Auth context
 */
export const renderWithAuth = (
  ui: React.ReactElement,
  options: RenderOptions & {
    user?: MockStackUser | null;
    initialUser?: MockStackUser;
  } = {}
) => {
  const { user = TEST_USERS.OWNER, initialUser, ...renderOptions } = options;

  // Set up the auth state before rendering
  if (initialUser) {
    StackAuthTestUtils.setMockUser(initialUser);
  } else if (user !== undefined) {
    StackAuthTestUtils.setMockUser(user);
  }

  return render(ui, renderOptions);
};

/**
 * Render with authenticated user
 */
export const renderWithAuthenticatedUser = (
  ui: React.ReactElement,
  user: MockStackUser = TEST_USERS.OWNER,
  options: RenderOptions = {}
) => {
  return renderWithAuth(ui, { ...options, user });
};

/**
 * Render with unauthenticated user
 */
export const renderWithUnauthenticatedUser = (
  ui: React.ReactElement,
  options: RenderOptions = {}
) => {
  return renderWithAuth(ui, { ...options, user: null });
};

// -----------------------------------------------------------------------------
// Test Scenario Helpers
// -----------------------------------------------------------------------------

export const AuthTestScenarios = {
  /**
   * Test with household owner
   */
  withOwner: (callback: (user: MockStackUser) => void | Promise<void>) => {
    return StackAuthTestUtils.withAuthenticatedUser(TEST_USERS.OWNER, callback);
  },

  /**
   * Test with household caregiver
   */
  withCaregiver: (callback: (user: MockStackUser) => void | Promise<void>) => {
    return StackAuthTestUtils.withAuthenticatedUser(TEST_USERS.CAREGIVER, callback);
  },

  /**
   * Test with vet readonly user
   */
  withVet: (callback: (user: MockStackUser) => void | Promise<void>) => {
    return StackAuthTestUtils.withAuthenticatedUser(TEST_USERS.VET_READONLY, callback);
  },

  /**
   * Test with unauthenticated user
   */
  withUnauthenticated: (callback: () => void | Promise<void>) => {
    return StackAuthTestUtils.withUnauthenticatedUser(callback);
  },

  /**
   * Test with custom user
   */
  withCustomUser: (
    userData: Partial<MockStackUser>,
    callback: (user: MockStackUser) => void | Promise<void>
  ) => {
    const user = createMockUser(userData);
    return StackAuthTestUtils.withAuthenticatedUser(user, callback);
  },
};

// -----------------------------------------------------------------------------
// Component Testing Helpers
// -----------------------------------------------------------------------------

/**
 * Helper for testing components that use useUser hook
 */
export const withMockUser = (user: MockStackUser | null) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    return (props: any) => {
      // Set the mock user before component renders
      StackAuthTestUtils.setMockUser(user);
      return <WrappedComponent {...props} />;
    };
  };
};

/**
 * Helper for testing server components that use stackServerApp.getUser()
 */
export const mockServerAuth = {
  /**
   * Mock successful authentication
   */
  authenticated: (user: MockStackUser = TEST_USERS.OWNER) => {
    StackAuthTestUtils.setMockUser(user);
  },

  /**
   * Mock unauthenticated state
   */
  unauthenticated: () => {
    StackAuthTestUtils.setMockUser(null);
  },

  /**
   * Mock authentication with redirect
   */
  redirectToSignIn: () => {
    StackAuthTestUtils.setMockUser(null);
    // The mock will handle throwing redirect errors
  },
};

// -----------------------------------------------------------------------------
// Form Testing Helpers
// -----------------------------------------------------------------------------

/**
 * Simulate user sign-in flow
 */
export const simulateSignIn = async (user: MockStackUser = TEST_USERS.OWNER) => {
  StackAuthTestUtils.setMockUser(user);
  
  // Simulate sign-in success
  if (user.update) {
    await user.update({
      clientMetadata: {
        ...user.clientMetadata,
        lastSignInAt: Date.now(),
      },
    });
  }
  
  return user;
};

/**
 * Simulate user sign-out flow
 */
export const simulateSignOut = async () => {
  const currentUser = StackAuthTestUtils.getMockUser();
  
  if (currentUser?.signOut) {
    await currentUser.signOut();
  }
  
  StackAuthTestUtils.setMockUser(null);
};

// -----------------------------------------------------------------------------
// tRPC Testing Helpers
// -----------------------------------------------------------------------------

/**
 * Helper for testing tRPC procedures that require authentication
 */
export const createAuthenticatedTRPCContext = (user: MockStackUser = TEST_USERS.OWNER) => {
  StackAuthTestUtils.setMockUser(user);
  
  return {
    session: null, // Stack Auth doesn't use sessions in the same way
    stackUser: user,
    userId: user.id,
    // Add other context properties as needed
  };
};

/**
 * Helper for testing tRPC procedures without authentication
 */
export const createUnauthenticatedTRPCContext = () => {
  StackAuthTestUtils.setMockUser(null);
  
  return {
    session: null,
    stackUser: null,
    userId: null,
  };
};

// -----------------------------------------------------------------------------
// Migration Helpers (for transitioning from Clerk)
// -----------------------------------------------------------------------------

/**
 * Helper to migrate existing Clerk-based tests to Stack Auth
 * Maps common Clerk patterns to Stack Auth equivalents
 */
export const ClerkToStackMigrationHelpers = {
  /**
   * Convert Clerk user mock to Stack Auth user mock
   */
  convertClerkUser: (clerkUser: any): MockStackUser => {
    return createMockUser({
      id: clerkUser.id,
      displayName: clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}` 
        : null,
      primaryEmail: clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress,
      primaryEmailVerified: clerkUser.emailAddresses?.[0]?.verification?.status === "complete",
      clientMetadata: {
        onboardingComplete: clerkUser.publicMetadata?.onboardingComplete || false,
        ...clerkUser.unsafeMetadata,
      },
    });
  },

  /**
   * Replace auth().userId with Stack Auth equivalent
   */
  mockAuthUserId: (userId: string | null) => {
    if (userId) {
      const user = createMockUser({ id: userId });
      StackAuthTestUtils.setMockUser(user);
    } else {
      StackAuthTestUtils.setMockUser(null);
    }
  },

  /**
   * Replace currentUser() with Stack Auth equivalent
   */
  mockCurrentUser: (user: MockStackUser | null) => {
    StackAuthTestUtils.setMockUser(user);
  },
};

// -----------------------------------------------------------------------------
// Debug Helpers
// -----------------------------------------------------------------------------

/**
 * Debug helper to inspect current auth state
 */
export const debugAuthState = () => {
  const user = StackAuthTestUtils.getMockUser();
  console.log("Current Stack Auth Mock State:", {
    isAuthenticated: !!user,
    user: user ? {
      id: user.id,
      displayName: user.displayName,
      email: user.primaryEmail,
      metadata: user.clientMetadata,
    } : null,
  });
};

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  StackAuthTestUtils,
  createMockUser,
  TEST_USERS,
} from "../mocks/stack-auth";

// Default export with all utilities
export default {
  renderWithAuth,
  renderWithAuthenticatedUser,
  renderWithUnauthenticatedUser,
  AuthTestScenarios,
  withMockUser,
  mockServerAuth,
  simulateSignIn,
  simulateSignOut,
  createAuthenticatedTRPCContext,
  createUnauthenticatedTRPCContext,
  ClerkToStackMigrationHelpers,
  debugAuthState,
  StackAuthTestUtils,
  createMockUser,
  TEST_USERS,
};