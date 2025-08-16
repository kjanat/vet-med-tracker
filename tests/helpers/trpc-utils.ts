import { expect, vi } from "vitest";
import { appRouter } from "@/server/api/root";
import type { Context } from "@/server/api/trpc";
import {
  createMockUser,
  type MockStackUser,
  StackAuthTestUtils,
  TEST_USERS,
} from "../mocks/stack-auth";
import { mockDb } from "./mock-db";

// Define test session type for Stack Auth compatibility
export interface TestSession {
  subject: string;
  access: {
    householdId: string;
    role: string;
  };
  type: string;
  exp: number;
}

// Mock session using Stack Auth test utilities
export const mockSession: TestSession = {
  subject: TEST_USERS.OWNER.id,
  access: {
    householdId: "test-household-123",
    role: "OWNER",
  },
  type: "session_token",
  exp: Date.now() + 3600000, // 1 hour from now
};

// Create mock context for testing
export async function createMockContext(
  overrides: Record<string, unknown> = {},
): Promise<Context> {
  const mockReq = {
    headers: new Headers({
      "content-type": "application/json",
    }),
    ...(overrides.req || {}),
  };

  // Mock the context directly for Stack Auth
  // Note: stackUser is intentionally null here for testing unauthenticated scenarios
  // Use createAuthenticatedContext() for authenticated test scenarios
  return {
    db: mockDb as any,
    headers: mockReq.headers,
    requestedHouseholdId: null,
    stackUser: null,
    dbUser: null,
    currentHouseholdId: null,
    currentMembership: null,
    availableHouseholds: [],
    ...overrides,
  };
}

// Create authenticated context
export async function createAuthenticatedContext(
  session: TestSession = mockSession,
  overrides: Record<string, unknown> = {},
) {
  // Mock user data
  const mockUser = {
    id: session.subject,
    name: "Test User",
    email: "test@example.com",
    image: null,
    emailVerified: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mock membership data
  const mockMembership = {
    id: `membership-${session.subject}`,
    userId: session.subject,
    householdId: session.access.householdId,
    role: session.access.role as "OWNER" | "CAREGIVER" | "VETREADONLY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Create Stack Auth mock user
  const mockStackUser: MockStackUser = createMockUser({
    id: session.subject,
    displayName: "Test User",
    primaryEmail: "test@example.com",
    profileImageUrl: null,
    clientMetadata: {
      onboardingComplete: true,
      vetMedPreferences: {
        defaultTimezone: "America/New_York",
        role: session.access.role,
      },
    },
  });

  // Set the mock user in StackAuthTestUtils for consistency
  StackAuthTestUtils.setMockUser(mockStackUser);

  return createMockContext({
    ...overrides,
    stackUser: mockStackUser,
    dbUser: mockUser,
    currentHouseholdId: session.access.householdId,
    currentMembership: mockMembership,
    availableHouseholds: [
      {
        id: session.access.householdId,
        name: "Test Household",
        timezone: "America/New_York",
        createdAt: new Date(),
        updatedAt: new Date(),
        membership: mockMembership,
      },
    ],
  });
}

// Mock tRPC caller for testing
export function createMockCaller(ctx: Context) {
  return appRouter.createCaller(ctx);
}

// Helper to test protected procedures
export async function testProtectedProcedure(
  procedure: (params: { ctx: Context; input: unknown }) => Promise<unknown>,
  input: unknown,
  expectedError = "UNAUTHORIZED",
) {
  const ctx = await createMockContext();

  await expect(procedure({ ctx, input })).rejects.toThrow(expectedError);
}

// Helper to test successful procedure
export async function testSuccessfulProcedure<T>(
  procedure: (params: { ctx: Context; input: unknown }) => Promise<T>,
  input: unknown,
  session = mockSession,
): Promise<T> {
  const ctx = await createAuthenticatedContext(session);

  return await procedure({ ctx, input });
}

// Mock database queries
export function mockDbQuery(_tableName: string, data: unknown[]) {
  mockDb.select.mockImplementation(
    () =>
      ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(data),
      }) as ReturnType<typeof mockDb.select>,
  );
}
