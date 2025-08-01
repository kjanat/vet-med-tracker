import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminRouter } from "@/server/api/routers/admin";
import type { Context } from "@/server/api/trpc/context";
import * as schema from "@/server/db/schema";
import {
	cleanupTestData,
	createTestDatabase,
	testFactories,
} from "../helpers/test-db";

describe("Admin Flow Integration", () => {
	const db = createTestDatabase();
	let testData: {
		user: any;
		household: any;
		animal: any;
		medication: any;
		regimen: any;
	};

	beforeEach(async () => {
		// Create test data directly in database
		const userData = testFactories.user();
		const householdData = testFactories.household();
		const animalData = testFactories.animal({ householdId: householdData.id });
		const medicationData = testFactories.medication();
		const regimenData = testFactories.regimen({
			animalId: animalData.id,
			medicationId: medicationData.id,
		});

		// Insert test data
		const [user] = await db.insert(schema.users).values(userData).returning();
		const [household] = await db
			.insert(schema.households)
			.values(householdData)
			.returning();

		await db.insert(schema.memberships).values({
			userId: user.id,
			householdId: household.id,
			role: "OWNER",
		});

		const [animal] = await db
			.insert(schema.animals)
			.values(animalData)
			.returning();
		const [medication] = await db
			.insert(schema.medicationCatalog)
			.values(medicationData)
			.returning();
		const [regimen] = await db
			.insert(schema.regimens)
			.values(regimenData)
			.returning();

		testData = { user, household, animal, medication, regimen };
	});

	afterEach(async () => {
		if (testData?.household) {
			await cleanupTestData(db, testData.household.id);
		}
	});

	it("should create administration record in real database", async () => {
		// Create context with real database
		const ctx: Context = {
			db,
			user: testData.user,
			session: {
				access_token: "test-token",
				refresh_token: "test-refresh",
				expires_at: Date.now() + 3600000,
				householdMemberships: [
					{
						householdId: testData.household.id,
						role: "OWNER",
						joinedAt: new Date(),
					},
				],
			},
			currentHouseholdId: testData.household.id,
			currentMembership: {
				householdId: testData.household.id,
				role: "OWNER",
				joinedAt: new Date(),
			},
			headers: new Headers(),
			requestedHouseholdId: testData.household.id,
		};

		const caller = adminRouter.createCaller(ctx);

		// Call the actual router method
		const result = await caller.create({
			householdId: testData.household.id,
			animalId: testData.animal.id,
			regimenId: testData.regimen.id,
			idempotencyKey: "test-key-123",
			notes: "Integration test administration",
		});

		// Verify the result
		expect(result).toBeDefined();
		expect(result.animalId).toBe(testData.animal.id);
		expect(result.regimenId).toBe(testData.regimen.id);
		expect(result.notes).toBe("Integration test administration");
		expect(result.caregiverId).toBe(testData.user.id);

		// Verify it was actually saved in the database
		const [saved] = await db
			.select()
			.from(schema.administrations)
			.where(eq(schema.administrations.id, result.id));

		expect(saved).toBeDefined();
		expect(saved.idempotencyKey).toBe("test-key-123");
	});

	it("should respect idempotency in real database", async () => {
		const ctx: Context = {
			db,
			user: testData.user,
			session: {
				access_token: "test-token",
				refresh_token: "test-refresh",
				expires_at: Date.now() + 3600000,
				householdMemberships: [
					{
						householdId: testData.household.id,
						role: "OWNER",
						joinedAt: new Date(),
					},
				],
			},
			currentHouseholdId: testData.household.id,
			currentMembership: {
				householdId: testData.household.id,
				role: "OWNER",
				joinedAt: new Date(),
			},
			headers: new Headers(),
			requestedHouseholdId: testData.household.id,
		};

		const caller = adminRouter.createCaller(ctx);
		const idempotencyKey = "duplicate-test-key";

		// Create first administration
		const first = await caller.create({
			householdId: testData.household.id,
			animalId: testData.animal.id,
			regimenId: testData.regimen.id,
			idempotencyKey,
		});

		// Try to create duplicate with same idempotency key
		const second = await caller.create({
			householdId: testData.household.id,
			animalId: testData.animal.id,
			regimenId: testData.regimen.id,
			idempotencyKey,
		});

		// Should return the same record
		expect(second.id).toBe(first.id);

		// Verify only one record exists in database
		const records = await db
			.select()
			.from(schema.administrations)
			.where(eq(schema.administrations.idempotencyKey, idempotencyKey));

		expect(records).toHaveLength(1);
	});
});
