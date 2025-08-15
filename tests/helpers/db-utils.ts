import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterAll, beforeAll, beforeEach } from "vitest";
// Import your schema tables (you'll need to update these imports based on your actual schema)
import * as schema from "@/db/schema";
import { animals, households, memberships, users } from "@/db/schema";

// Test database connection
const testDbUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgresql://test:test@localhost:5432/vetmed_test";
const sqlClient = neon(testDbUrl);
export const testDb = drizzle(sqlClient, { schema });

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

  // Sort tables to handle dependencies - audit logs first, then other tables
  const sortedTables = [...tables].sort((a, b) => {
    // Priority order for deletion
    const priority: Record<string, number> = {
      vetmed_audit_log: 1,
      vetmed_notification_queue: 2,
      vetmed_administrations: 3,
      vetmed_regimens: 4,
      vetmed_inventory_items: 5,
      vetmed_animals: 6,
      vetmed_memberships: 7,
      vetmed_households: 8,
      vetmed_users: 9,
      vetmed_medication_catalog: 10,
    };

    const aPriority = priority[a.tablename] || 99;
    const bPriority = priority[b.tablename] || 99;

    return aPriority - bPriority;
  });

  // Use CASCADE to handle foreign key constraints without requiring superuser privileges
  // This works on Neon databases
  for (const { tablename } of sortedTables) {
    await testDb.execute(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
}

// Seed helpers
export async function seedTestData() {
  // Create test user
  const userResult = await testDb
    .insert(users)
    .values({
      email: `test-${randomUUID()}@example.com`,
      name: "Test User",
    })
    .returning();
  const user = userResult[0];

  // Create test household
  if (!user) throw new Error("User not created");
  const householdResult = await testDb
    .insert(households)
    .values({
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
