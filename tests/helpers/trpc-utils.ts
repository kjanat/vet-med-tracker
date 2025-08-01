import type { Session } from "@openauthjs/openauth/core";
import type { inferAsyncReturnType } from "@trpc/server";
import { expect, vi } from "vitest";
import { mockDb } from "./mock-db";

// Mock session
export const mockSession: Session = {
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
		...overrides.req,
	};

	// Mock the auth context directly
	return {
		db: mockDb,
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
	session: Session = mockSession,
	overrides: Record<string, unknown> = {},
) {
	// Mock user data
	const mockUser = {
		id: session.subject,
		name: "Test User",
		email: "test@example.com",
		defaultHouseholdId: session.access.householdId,
	};

	// Mock membership data
	const mockMembership = {
		userId: session.subject,
		householdId: session.access.householdId,
		role: session.access.role,
		joinedAt: new Date(),
	};

	return createMockContext({
		...overrides,
		session: {
			...session,
			householdMemberships: [mockMembership],
		},
		user: mockUser,
		currentHouseholdId: session.access.householdId,
		currentMembership: mockMembership,
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
import type { createTRPCContext } from "@/server/api/trpc/init";
