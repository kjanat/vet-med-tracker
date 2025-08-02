import type { inferAsyncReturnType } from "@trpc/server";
import { expect, vi } from "vitest";
import { appRouter } from "@/server/api/routers/_app";
import type { createClerkTRPCContext } from "@/server/api/trpc/clerk-init";
import { ClerkMockHelpers } from "./clerk-test-utils";
import { mockDb } from "./mock-db";

// Define test session type to match Clerk expectations
export interface TestSession {
	subject: string;
	access: {
		householdId: string;
		role: string;
	};
	type: string;
	exp: number;
}

// Mock session using Clerk test mode patterns
export const mockSession: TestSession = ClerkMockHelpers.createTestSession();

// Create mock context for testing
export async function createMockContext(
	overrides: Record<string, unknown> = {},
): Promise<inferAsyncReturnType<typeof createClerkTRPCContext>> {
	const mockReq = {
		headers: new Headers({
			"content-type": "application/json",
		}),
		...(overrides.req || {}),
	};

	// Mock the auth context directly
	return {
		db: mockDb as any,
		headers: mockReq.headers,
		requestedHouseholdId: null,
		auth: vi.fn().mockResolvedValue({ userId: null, sessionId: null }) as any,
		clerkUser: null,
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
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	// Mock membership data
	const mockMembership = {
		id: `membership-${session.subject}`,
		userId: session.subject,
		householdId: session.access.householdId,
		role: session.access.role as "OWNER" | "CAREGIVER" | "VETREADONLY",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	// Mock Clerk user context
	const mockClerkUser = {
		id: session.subject,
		firstName: "Test",
		lastName: "User",
		emailAddresses: [{ emailAddress: "test@example.com" }],
		imageUrl: null,
	};

	return createMockContext({
		...overrides,
		clerkUser: mockClerkUser,
		dbUser: mockUser,
		currentHouseholdId: session.access.householdId,
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
export function createMockCaller(
	ctx: inferAsyncReturnType<typeof createClerkTRPCContext>,
) {
	return appRouter.createCaller(ctx);
}

// Helper to test protected procedures
export async function testProtectedProcedure(
	procedure: (params: {
		ctx: inferAsyncReturnType<typeof createClerkTRPCContext>;
		input: unknown;
	}) => Promise<unknown>,
	input: unknown,
	expectedError = "UNAUTHORIZED",
) {
	const ctx = await createMockContext();

	await expect(procedure({ ctx, input })).rejects.toThrow(expectedError);
}

// Helper to test successful procedure
export async function testSuccessfulProcedure<T>(
	procedure: (params: {
		ctx: inferAsyncReturnType<typeof createClerkTRPCContext>;
		input: unknown;
	}) => Promise<T>,
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
