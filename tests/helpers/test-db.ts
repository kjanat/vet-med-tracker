import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/server/db/schema";

// For integration tests, we'll use a test-specific schema or database
// This requires a test database URL in your environment
export function createTestDatabase() {
	const testDatabaseUrl =
		process.env.TEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

	if (!testDatabaseUrl) {
		throw new Error(
			"TEST_DATABASE_URL or DATABASE_URL_UNPOOLED must be set for integration tests",
		);
	}

	const sql = neon(testDatabaseUrl);
	const db = drizzle(sql, {
		schema,
		logger: false, // Disable logging in tests
	});

	return db;
}

// Test data factories
export const testFactories = {
	user: (overrides = {}) => ({
		id: randomUUID(),
		email: `test-${randomUUID()}@example.com`,
		name: "Test User",
		emailVerified: new Date(),
		...overrides,
	}),

	household: (overrides = {}) => ({
		id: randomUUID(),
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
		id: randomUUID(),
		name: "Test Pet",
		species: "Dog",
		householdId: randomUUID(),
		timezone: "America/New_York",
		...overrides,
	}),

	medication: (overrides = {}) => ({
		id: randomUUID(),
		genericName: "Test Medication",
		route: "Oral",
		form: "Tablet",
		...overrides,
	}),

	regimen: (overrides = {}) => ({
		id: randomUUID(),
		animalId: randomUUID(),
		medicationId: randomUUID(),
		active: true,
		scheduleType: "FIXED" as const,
		timesLocal: ["10:00", "22:00"],
		dose: "1 tablet",
		cutoffMinutes: 240,
		...overrides,
	}),

	administration: (overrides = {}) => ({
		id: randomUUID(),
		regimenId: randomUUID(),
		animalId: randomUUID(),
		householdId: randomUUID(),
		caregiverId: randomUUID(),
		status: "ON_TIME" as const,
		recordedAt: new Date(),
		administeredAt: new Date(),
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
