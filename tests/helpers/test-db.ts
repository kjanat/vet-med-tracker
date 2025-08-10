import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { db } from "@/db/drizzle";
import * as schema from "@/db/schema";
import { 
	getTestDatabase, 
	resetTestDatabase, 
	initializeTestDatabase,
	closeTestDatabase,
	checkTestDatabaseHealth 
} from "./test-db-setup";

// Create test database instance using local PostgreSQL
export function createTestDatabase(): typeof db {
	console.log("🔧 Creating test database connection with local PostgreSQL");
	return getTestDatabase();
}

/**
 * Initialize test database before running tests
 */
export async function setupTestDatabase(): Promise<typeof db> {
	await initializeTestDatabase();
	return getTestDatabase();
}

/**
 * Reset database state between test suites
 */
export async function resetTestDatabaseState(): Promise<void> {
	await resetTestDatabase();
}

/**
 * Close test database connections after tests
 */
export async function teardownTestDatabase(): Promise<void> {
	await closeTestDatabase();
}

/**
 * Check if test database is healthy
 */
export async function isTestDatabaseHealthy(): Promise<boolean> {
	return await checkTestDatabaseHealth();
}

// Test data factories
export const testFactories = {
	user: (overrides = {}) => ({
		email: `test-${randomUUID()}@example.com`,
		name: "Test User",
		emailVerified: new Date().toISOString(),
		...overrides,
	}),

	household: (overrides = {}) => ({
		name: "Test Household",
		...overrides,
	}),

	membership: (overrides = {}) => ({
		userId: randomUUID(),
		householdId: randomUUID(),
		role: "OWNER" as const,
		...overrides,
	}),

	animal: (overrides = {}) => ({
		name: "Test Pet",
		species: "Dog",
		householdId: randomUUID(), // This should be provided by the test
		timezone: "America/New_York",
		...overrides,
	}),

	medication: (overrides = {}) => ({
		genericName: "Test Medication",
		route: "ORAL" as const,
		form: "TABLET" as const,
		...overrides,
	}),

	regimen: (overrides = {}) => {
		const defaults = {
			animalId: randomUUID(), // This should be provided by the test
			medicationId: randomUUID(), // This should be provided by the test
			active: true,
			scheduleType: "FIXED" as const,
			timesLocal: ["10:00", "22:00"],
			dose: "1 tablet",
			cutoffMinutes: 240,
			startDate: new Date().toISOString().split("T")[0]!,
		};
		return { ...defaults, ...overrides };
	},

	administration: (overrides = {}) => ({
		regimenId: randomUUID(), // This should be provided by the test
		animalId: randomUUID(), // This should be provided by the test
		householdId: randomUUID(), // This should be provided by the test
		caregiverId: randomUUID(), // This should be provided by the test
		status: "ON_TIME" as const,
		recordedAt: new Date().toISOString(),
		idempotencyKey: randomUUID(),
		...overrides,
	}),
};

// Helper to clean up test data after each test
export async function cleanupTestData(
	db: ReturnType<typeof createTestDatabase>,
	householdId: string,
) {
	// Delete in reverse order of foreign key dependencies

	// First delete audit logs and notifications that reference this household
	await db
		.delete(schema.auditLog)
		.where(eq(schema.auditLog.householdId, householdId));

	await db
		.delete(schema.notificationQueue)
		.where(eq(schema.notificationQueue.householdId, householdId));

	// Then delete administrations
	await db
		.delete(schema.administrations)
		.where(eq(schema.administrations.householdId, householdId));

	// Get all animals for this household
	const animals = await db
		.select({ id: schema.animals.id })
		.from(schema.animals)
		.where(eq(schema.animals.householdId, householdId));

	if (animals.length > 0) {
		await db.delete(schema.regimens).where(
			inArray(
				schema.regimens.animalId,
				animals.map((a) => a.id),
			),
		);
	}

	// Delete inventory items
	await db
		.delete(schema.inventoryItems)
		.where(eq(schema.inventoryItems.householdId, householdId));

	await db
		.delete(schema.animals)
		.where(eq(schema.animals.householdId, householdId));
	await db
		.delete(schema.memberships)
		.where(eq(schema.memberships.householdId, householdId));
	await db
		.delete(schema.households)
		.where(eq(schema.households.id, householdId));
}
