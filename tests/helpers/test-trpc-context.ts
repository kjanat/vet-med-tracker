import type * as schema from "@/db/schema";
import type { ClerkContext } from "../../server/api/trpc/clerk-init";
import { createTestDatabase } from "./test-db";

/**
 * Create a test context for tRPC that bypasses Clerk authentication
 * This is specifically for integration tests that need to test the API logic
 * without dealing with actual authentication
 */
export function createTestTRPCContext(options: {
	user: typeof schema.users.$inferSelect;
	household: typeof schema.households.$inferSelect;
	membership?: Partial<typeof schema.memberships.$inferSelect>;
}): ClerkContext {
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

	return {
		db,
		headers: new Headers(),
		requestedHouseholdId: household.id,
		// Mock Clerk auth result
		auth: {
			userId: user.id,
			sessionId: `test-session-${Date.now()}`,
			// Add other required auth properties
		} as any,
		// Mock Clerk user
		clerkUser: {
			id: user.id,
			emailAddresses: [{ emailAddress: user.email }],
			firstName: user.name?.split(" ")[0] || "",
			lastName: user.name?.split(" ")[1] || "",
			username: user.email.split("@")[0],
			imageUrl: user.image,
			publicMetadata: {},
			unsafeMetadata: {},
		} as any,
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
export function createUnauthenticatedTestContext(): ClerkContext {
	const db = createTestDatabase();

	return {
		db,
		headers: new Headers(),
		requestedHouseholdId: null,
		auth: null,
		clerkUser: null,
		dbUser: null,
		currentHouseholdId: null,
		currentMembership: null,
		availableHouseholds: [],
	};
}
