import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClerkMockHelpers, TEST_USERS } from "../helpers/clerk-test-utils";
import { createMockContext, createAuthenticatedContext } from "../helpers/trpc-utils";

describe("Authentication Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create authenticated context with test user", async () => {
    const testSession = ClerkMockHelpers.createTestSession(TEST_USERS.OWNER);
    const ctx = await createAuthenticatedContext(testSession);
    
    expect(ctx.currentHouseholdId).toBe(testSession.access.householdId);
    expect(ctx.currentMembership?.role).toBe("OWNER");
    expect(ctx.dbUser).toBeDefined();
  });

  it("should handle different user roles correctly", async () => {
    const caregiverSession = ClerkMockHelpers.createTestSession(TEST_USERS.CAREGIVER);
    const ctx = await createAuthenticatedContext(caregiverSession);
    
    expect(ctx.currentMembership?.role).toBe("CAREGIVER");
  });

  it("should reject unauthenticated requests", async () => {
    const ctx = await createMockContext();
    
    expect(ctx.dbUser).toBeNull();
    expect(ctx.currentHouseholdId).toBeNull();
  });
});