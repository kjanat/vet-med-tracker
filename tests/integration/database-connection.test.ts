/**
 * Integration test for database connection and basic operations
 * This test verifies that the local PostgreSQL test database setup works correctly
 */

import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { 
	createTestDatabase, 
	testFactories,
	resetTestDatabaseState,
} from "../helpers/test-db";
import * as schema from "@/db/schema";

describe("Database Connection", () => {
	const db = createTestDatabase();

	beforeEach(async () => {
		// Reset database state before each test
		await resetTestDatabaseState();
	});

	it("should connect to test database successfully", async () => {
		// Simple query to verify connection
		const result = await db.execute(sql`SELECT 1 as connection_test`);
		expect(result).toBeDefined();
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]?.connection_test).toBe(1);
	});

	it("should create and query users table", async () => {
		// Create a test user
		const testUserData = testFactories.user({
			email: "test@example.com",
			name: "Test User",
		});

		const [insertedUser] = await db.insert(schema.users).values({
			id: "test-user-123",
			...testUserData,
		}).returning();

		expect(insertedUser).toBeDefined();
		expect(insertedUser?.email).toBe("test@example.com");
		expect(insertedUser?.name).toBe("Test User");

		// Query the user back
		const foundUser = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, "test-user-123"))
			.limit(1);

		expect(foundUser).toHaveLength(1);
		expect(foundUser[0]?.email).toBe("test@example.com");
		expect(foundUser[0]?.name).toBe("Test User");
	});

	it("should handle foreign key relationships correctly", async () => {
		// Create a user
		const [user] = await db.insert(schema.users).values({
			id: "fk-test-user",
			...testFactories.user({
				email: "fk-test@example.com",
				name: "FK Test User",
			}),
		}).returning();

		// Create a household
		const [household] = await db.insert(schema.households).values({
			...testFactories.household({
				name: "FK Test Household",
			}),
		}).returning();

		// Create membership (foreign key relationship)
		const [membership] = await db.insert(schema.memberships).values({
			...testFactories.membership({
				userId: user!.id,
				householdId: household!.id,
				role: "OWNER",
			}),
		}).returning();

		expect(membership).toBeDefined();
		expect(membership?.userId).toBe(user!.id);
		expect(membership?.householdId).toBe(household!.id);
		expect(membership?.role).toBe("OWNER");

		// Query with join to verify relationship
		const membershipWithRelations = await db
			.select({
				membershipId: schema.memberships.id,
				userEmail: schema.users.email,
				householdName: schema.households.name,
				role: schema.memberships.role,
			})
			.from(schema.memberships)
			.innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
			.innerJoin(schema.households, eq(schema.households.id, schema.memberships.householdId))
			.where(eq(schema.memberships.id, membership!.id));

		expect(membershipWithRelations).toHaveLength(1);
		expect(membershipWithRelations[0]?.userEmail).toBe("fk-test@example.com");
		expect(membershipWithRelations[0]?.householdName).toBe("FK Test Household");
		expect(membershipWithRelations[0]?.role).toBe("OWNER");
	});

	it("should enforce table prefixes", async () => {
		// Verify that all tables have the vetmed_ prefix
		const tableQuery = await db.execute(sql`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name LIKE 'vetmed_%'
			ORDER BY table_name
		`);

		const tableNames = tableQuery.rows.map(row => row.table_name);
		
		// Check that we have the expected vetmed_ prefixed tables
		expect(tableNames).toContain("vetmed_users");
		expect(tableNames).toContain("vetmed_households");
		expect(tableNames).toContain("vetmed_memberships");
		expect(tableNames).toContain("vetmed_animals");
		expect(tableNames).toContain("vetmed_medication_catalog");
		expect(tableNames).toContain("vetmed_regimens");
		expect(tableNames).toContain("vetmed_administrations");

		// Verify no tables exist without the prefix that should have it
		const unprefixedTables = await db.execute(sql`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name NOT LIKE 'vetmed_%'
			AND table_name NOT IN ('drizzle___migrations_metadata', '__drizzle_migrations')
		`);

		expect(unprefixedTables.rows).toHaveLength(0);
	});
});

// Helper to execute raw SQL - importing sql template literal
import { sql } from "drizzle-orm";