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
	const tablesResult = await testDb.execute<{ tablename: string }>(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '%drizzle%'`,
	);

	const tables = Array.isArray(tablesResult) ? tablesResult : tablesResult.rows;

	// Disable foreign key checks and truncate tables
	await testDb.execute(`SET session_replication_role = 'replica'`);

	for (const { tablename } of tables) {
		await testDb.execute(`TRUNCATE TABLE "${tablename}" CASCADE`);
	}

	await testDb.execute(`SET session_replication_role = 'origin'`);
}

// Seed helpers
export async function seedTestData() {
	// Create test user
	const userResult = await testDb
		.insert(users)
		.values({
			id: "test-user-1",
			email: "test@example.com",
			name: "Test User",
		})
		.returning();
	const user = userResult[0];

	// Create test household
	if (!user) throw new Error("User not created");
	const householdResult = await testDb
		.insert(households)
		.values({
			id: "test-household-1",
			name: "Test Household",
		})
		.returning();
	const household = householdResult[0];

	// Create membership
	if (!household) throw new Error("Household not created");
	await testDb.insert(memberships).values({
		userId: user.id,
		householdId: household.id,
		role: "OWNER",
	});

	// Create test animal
	const animalResult = await testDb
		.insert(animals)
		.values({
			id: "test-animal-1",
			name: "Buddy",
			species: "dog",
			breed: "Golden Retriever",
			dob: "2020-01-01",
			householdId: household.id,
		})
		.returning();
	const animal = animalResult[0];

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
