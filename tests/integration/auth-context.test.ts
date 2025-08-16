import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAuthenticatedContext,
  createMockContext,
  type TestSession,
} from "../helpers/trpc-utils";
import { StackAuthTestUtils, TEST_USERS } from "../mocks/stack-auth";

describe("Authentication Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    StackAuthTestUtils.reset();
  });

  it("should create authenticated context with test user", async () => {
    const testSession: TestSession = {
      subject: TEST_USERS.OWNER.id,
      access: {
        householdId: "test-household-123",
        role: "OWNER",
      },
      type: "session_token",
      exp: Date.now() + 3600000,
    };

    const ctx = await createAuthenticatedContext(testSession);

    expect(ctx.currentHouseholdId).toBe(testSession.access.householdId);
    expect(ctx.currentMembership?.role).toBe("OWNER");
    expect(ctx.dbUser).toBeDefined();
    expect(ctx.stackUser).toBeDefined();
    expect(ctx.stackUser?.id).toBe(TEST_USERS.OWNER.id);
  });

  it("should handle different user roles correctly", async () => {
    const caregiverSession: TestSession = {
      subject: TEST_USERS.CAREGIVER.id,
      access: {
        householdId: "test-household-456",
        role: "CAREGIVER",
      },
      type: "session_token",
      exp: Date.now() + 3600000,
    };

    const ctx = await createAuthenticatedContext(caregiverSession);

    expect(ctx.currentMembership?.role).toBe("CAREGIVER");
    expect(ctx.stackUser?.id).toBe(TEST_USERS.CAREGIVER.id);
  });

  it("should reject unauthenticated requests", async () => {
    const ctx = await createMockContext();

    expect(ctx.dbUser).toBeNull();
    expect(ctx.currentHouseholdId).toBeNull();
    expect(ctx.stackUser).toBeNull();
  });

  it("should handle VET_READONLY user role", async () => {
    const vetSession: TestSession = {
      subject: TEST_USERS.VET_READONLY.id,
      access: {
        householdId: "test-household-789",
        role: "VETREADONLY",
      },
      type: "session_token",
      exp: Date.now() + 3600000,
    };

    const ctx = await createAuthenticatedContext(vetSession);

    expect(ctx.currentMembership?.role).toBe("VETREADONLY");
    expect(ctx.stackUser?.id).toBe(TEST_USERS.VET_READONLY.id);
  });
});
