import type { inferAsyncReturnType } from "@trpc/server";
import { expect, vi } from "vitest";
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

// Mock session
export const mockSession: TestSession = {
	subject: "11111111-1111-4111-8111-111111111111",
	access: {
		householdId: "22222222-2222-4222-8222-222222222222",
		role: "OWNER",
	},
	type: "access_token",
	exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

// Create mock context for testing
export async function createMockContext(
	overrides: Record<string, unknown> = {},
): Promise<inferAsyncReturnType<typeof createTRPCContext>> {
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
		session: null,
		user: null,
		currentHouseholdId: null,
		currentMembership: null,
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
		availableHouseholds: [{
			id: session.access.householdId,
			name: "Test Household",
			role: session.access.role,
		}],
	});
}

// Mock tRPC caller for testing
export function createMockCaller(
	ctx: inferAsyncReturnType<typeof createTRPCContext>,
) {
	return appRouter.createCaller(ctx);
}

// Helper to test protected procedures
export async function testProtectedProcedure(
	procedure: (params: {
		ctx: inferAsyncReturnType<typeof createTRPCContext>;
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
		ctx: inferAsyncReturnType<typeof createTRPCContext>;
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

import { appRouter } from "@/server/api/routers/_app";
// Import your actual context and router (update paths as needed)
import type { createClerkTRPCContext } from "@/server/api/trpc/clerk-init";

// Type alias for backwards compatibility
type createTRPCContext = typeof createClerkTRPCContext;
