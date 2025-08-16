import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { adminRouter } from "@/server/api/routers/admin";
import {
  cleanupTestData,
  createTestDatabase,
  testFactories,
} from "../helpers/test-db";
import { createTestTRPCContext } from "../helpers/test-trpc-context";

describe("Admin Flow Integration", () => {
  const db = createTestDatabase();
  let testData: {
    user: typeof schema.users.$inferSelect;
    household: typeof schema.households.$inferSelect;
    animal: typeof schema.animals.$inferSelect;
    medication: typeof schema.medicationCatalog.$inferSelect;
    regimen: typeof schema.regimens.$inferSelect;
  };

  beforeEach(async () => {
    // Create test data directly in database
    const userData = testFactories.user();
    const householdData = testFactories.household();
    const medicationData = testFactories.medication();

    // Insert test data
    const userResult = await db
      .insert(schema.users)
      .values(userData)
      .returning();
    const user = userResult[0];
    if (!user) throw new Error("Failed to create test user");

    const householdResult = await db
      .insert(schema.households)
      .values(householdData)
      .returning();
    const household = householdResult[0];
    if (!household) throw new Error("Failed to create test household");

    await db.insert(schema.memberships).values({
      userId: user.id,
      householdId: household.id,
      role: "OWNER",
    });

    const animalData = testFactories.animal({ householdId: household.id });
    const animalResult = await db
      .insert(schema.animals)
      .values(animalData)
      .returning();
    const animal = animalResult[0];
    if (!animal) throw new Error("Failed to create test animal");

    const medicationResult = await db
      .insert(schema.medicationCatalog)
      .values(medicationData)
      .returning();
    const medication = medicationResult[0];
    if (!medication) throw new Error("Failed to create test medication");

    const regimenData = testFactories.regimen({
      animalId: animal.id,
      medicationId: medication.id,
    });
    const regimenResult = await db
      .insert(schema.regimens)
      .values(regimenData)
      .returning();
    const regimen = regimenResult[0];
    if (!regimen) throw new Error("Failed to create test regimen");

    testData = { user, household, animal, medication, regimen };
  });

  afterEach(async () => {
    if (testData?.household) {
      await cleanupTestData(db, testData.household.id);
    }
  });

  it("should create administration record in real database", async () => {
    // Create context with real database
    const ctx = createTestTRPCContext({
      user: testData.user,
      household: testData.household,
    });

    const caller = adminRouter.createCaller(ctx);

    // Call the actual router method
    const result = await caller.create({
      householdId: testData.household.id,
      animalId: testData.animal.id,
      regimenId: testData.regimen.id,
      idempotencyKey: "test-key-123",
      notes: "Integration test administration",
      administeredAt: new Date().toISOString(), // Explicitly provide timestamp
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
    expect(saved?.idempotencyKey).toBe("test-key-123");
  });

  it("should respect idempotency in real database", async () => {
    const ctx = createTestTRPCContext({
      user: testData.user,
      household: testData.household,
    });

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
