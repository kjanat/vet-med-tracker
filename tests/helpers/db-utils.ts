import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterAll, beforeAll, beforeEach } from "vitest";

// Test database connection
const testDbUrl =
	process.env.DATABASE_URL_UNPOOLED ||
	process.env.DATABASE_URL ||
	"postgresql://test:test@localhost:5432/vetmed_test";
const sqlClient = neon(testDbUrl);
export const testDb = drizzle(sqlClient);

// Database lifecycle hooks
export function setupTestDatabase() {
	beforeAll(async () => {
		// Run migrations - currently skipped in test, assuming database schema is already set up
		// TODO: Enable migrations when ready
		// await migrate(testDb, { migrationsFolder: "./drizzle" });
	});

	beforeEach(async () => {
		// Clear all tables before each test
		await cleanDatabase();
	});

	afterAll(async () => {
		// Close connection
		// Neon http doesn't have an end method
	});
}

// Clean database helper
export async function cleanDatabase() {
	// Get all table names
	const tables = await sqlClient(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '%drizzle%'
  `);

	// Disable foreign key checks and truncate tables
	await sqlClient(`SET session_replication_role = 'replica'`);

	for (const { tablename } of tables) {
		await sqlClient(`TRUNCATE TABLE "${tablename}" CASCADE`);
	}

	await sqlClient(`SET session_replication_role = 'origin'`);
}

// Seed helpers
export async function seedTestData() {
	// Create test user
	const [user] = await testDb
		.insert(users)
		.values({
			id: "test-user-1",
			email: "test@example.com",
			name: "Test User",
		})
		.returning();

	// Create test household
	const [household] = await testDb
		.insert(households)
		.values({
			id: "test-household-1",
			name: "Test Household",
			createdById: user.id,
		})
		.returning();

	// Create membership
	await testDb.insert(memberships).values({
		userId: user.id,
		householdId: household.id,
		role: "OWNER",
	});

	// Create test animal
	const [animal] = await testDb
		.insert(animals)
		.values({
			id: "test-animal-1",
			name: "Buddy",
			species: "dog",
			breed: "Golden Retriever",
			dateOfBirth: new Date("2020-01-01"),
			householdId: household.id,
		})
		.returning();

	return { user, household, animal };
}

// Transaction helper for tests
export async function withTransaction<T>(
	fn: (tx: typeof testDb) => Promise<T>,
): Promise<T> {
	// Neon HTTP doesn't support transactions, so we just execute normally
	return await fn(testDb);
}

// Import your schema tables (you'll need to update these imports based on your actual schema)
import { animals, households, memberships, users } from "@/server/db/schema";
