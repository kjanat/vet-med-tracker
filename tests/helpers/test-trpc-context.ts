import type * as schema from "@/db/schema";
import type { Context } from "@/server/api/trpc";
import { createMockUser, type MockStackUser } from "../mocks/stack-auth";
import { createTestDatabase } from "./test-db";

/**
 * Create a test context for tRPC that uses Stack Auth mocks
 * This is specifically for integration tests that need to test the API logic
 * without dealing with actual authentication
 */
export function createTestTRPCContext(options: {
	user: typeof schema.users.$inferSelect;
	household: typeof schema.households.$inferSelect;
	membership?: Partial<typeof schema.memberships.$inferSelect>;
}): Context {
	const { user, household, membership } = options;
	const db = createTestDatabase();

	// Create a complete membership object with defaults
	const fullMembership: typeof schema.memberships.$inferSelect = {
		id: membership?.id || `test-membership-${Date.now()}`,
		userId: user.id,
		householdId: household.id,
		role: membership?.role || "OWNER",
		createdAt: membership?.createdAt || new Date().toISOString(),
		updatedAt: membership?.updatedAt || new Date().toISOString(),
	};

	// Create Stack Auth mock user based on database user
	const stackUser: MockStackUser = createMockUser({
		id: user.id,
		displayName: user.name || "",
		primaryEmail: user.email,
		profileImageUrl: user.image,
		clientMetadata: {
			onboardingComplete: true,
			vetMedPreferences: {
				defaultTimezone: "America/New_York",
				preferredUnits: "metric",
			},
		},
	});

	return {
		db,
		headers: new Headers(),
		requestedHouseholdId: household.id,
		// Stack Auth user
		stackUser,
		// Database user
		dbUser: user,
		currentHouseholdId: household.id,
		currentMembership: fullMembership,
		availableHouseholds: [
			{
				...household,
				membership: fullMembership,
			},
		],
	};
}

/**
 * Create a test context for unauthenticated requests
 */
export function createUnauthenticatedTestContext(): Context {
	const db = createTestDatabase();

	return {
		db,
		headers: new Headers(),
		requestedHouseholdId: null,
		stackUser: null,
		dbUser: null,
		currentHouseholdId: null,
		currentMembership: null,
		availableHouseholds: [],
	};
}
