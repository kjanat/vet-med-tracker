import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { inventoryRouter } from "@/server/api/routers/inventory";
import {
  cleanupTestData,
  createTestDatabase,
  testFactories,
} from "../helpers/test-db";
import { createTestTRPCContext } from "../helpers/test-trpc-context";

describe("Inventory CRUD Operations", () => {
  const db = createTestDatabase();
  let testData: {
    user: typeof schema.users.$inferSelect;
    household: typeof schema.households.$inferSelect;
    medication: typeof schema.medicationCatalog.$inferSelect;
  };

  beforeEach(async () => {
    // Create test data in real database
    const userData = testFactories.user();
    const householdData = testFactories.household();
    const medicationData = testFactories.medication();

    // Insert test data
    const [user] = await db.insert(schema.users).values(userData).returning();
    if (!user) throw new Error("Failed to create test user");

    const [household] = await db
      .insert(schema.households)
      .values(householdData)
      .returning();
    if (!household) throw new Error("Failed to create test household");

    await db.insert(schema.memberships).values({
      userId: user.id,
      householdId: household.id,
      role: "OWNER",
    });

    const [medication] = await db
      .insert(schema.medicationCatalog)
      .values(medicationData)
      .returning();
    if (!medication) throw new Error("Failed to create test medication");

    testData = { user, household, medication };
  });

  afterEach(async () => {
    if (testData?.household) {
      await cleanupTestData(db, testData.household.id);
    }
  });

  describe("list", () => {
    it("should list inventory items for a household", async () => {
      // Create inventory item in database
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [inventoryItem] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "TEST123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 75,
          unitType: "tablets",
          inUse: true,
        })
        .returning();

      // Create context and caller
      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.list({
        householdId: testData.household.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: inventoryItem?.id,
        name: testData.medication.brandName || testData.medication.genericName,
        genericName: testData.medication.genericName,
        strength: testData.medication.strength,
        lot: "TEST123",
        unitsRemaining: 75,
        inUse: true,
      });
    });

    it("should filter expired items when includeExpired is false", async () => {
      // Create expired inventory item
      const expiredDate = new Date();
      expiredDate.setMonth(expiredDate.getMonth() - 1);

      await db.insert(schema.inventoryItems).values({
        householdId: testData.household.id,
        medicationId: testData.medication.id,
        lot: "EXPIRED123",
        expiresOn: expiredDate.toISOString().split("T")[0] ?? "",
        storage: "ROOM",
        quantityUnits: 50,
        unitsRemaining: 25,
        unitType: "tablets",
      });

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.list({
        householdId: testData.household.id,
        includeExpired: false,
      });

      // Should not include expired item
      expect(result).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("should create a new inventory item", async () => {
      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const result = await caller.create({
        householdId: testData.household.id,
        medicationId: testData.medication.id,
        lot: "NEW123",
        expiresOn: expiryDate,
        storage: "FRIDGE",
        unitsTotal: 50,
        unitType: "tablets",
      });

      expect(result).toBeDefined();
      if (result) {
        expect(result.householdId).toBe(testData.household.id);
        expect(result.medicationId).toBe(testData.medication.id);
        expect(result.lot).toBe("NEW123");
        expect(result.unitsRemaining).toBe(50);
        expect(result.storage).toBe("FRIDGE");
      }
    });
  });

  describe("update", () => {
    it("should update an inventory item", async () => {
      // Create an inventory item first
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [item] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "ORIGINAL123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 100,
          unitType: "tablets",
        })
        .returning();

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.update({
        id: item?.id ?? "",
        householdId: testData.household.id,
        lot: "UPDATED123",
        unitsRemaining: 25,
        notes: "Updated notes",
      });

      expect(result).toBeDefined();
      expect(result.lot).toBe("UPDATED123");
      expect(result.unitsRemaining).toBe(25);
      expect(result.notes).toBe("Updated notes");
    });

    it("should throw error if item not found", async () => {
      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      await expect(
        caller.update({
          id: crypto.randomUUID(),
          householdId: testData.household.id,
        }),
      ).rejects.toThrow("Inventory item not found or already deleted");
    });
  });

  describe("setInUse", () => {
    it("should set in-use status to true", async () => {
      // Create an inventory item first
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [item] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "USE123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 100,
          unitType: "tablets",
          inUse: false,
        })
        .returning();

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.setInUse({
        id: item?.id ?? "",
        householdId: testData.household.id,
        inUse: true,
      });

      expect(result.inUse).toBe(true);
      expect(result.openedOn).toBeDefined();
    });
  });

  describe("delete", () => {
    it("should soft delete an inventory item", async () => {
      // Create an inventory item first
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [item] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "DELETE123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 100,
          unitType: "tablets",
        })
        .returning();

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.delete({
        id: item?.id ?? "",
        householdId: testData.household.id,
      });

      expect(result.deletedAt).toBeDefined();
    });
  });

  describe("assignToAnimal", () => {
    it("should assign item to an animal", async () => {
      // Create test animal
      const animalData = testFactories.animal({
        householdId: testData.household.id,
      });
      const [animal] = await db
        .insert(schema.animals)
        .values(animalData)
        .returning();

      // Create inventory item
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [item] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "ASSIGN123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 100,
          unitType: "tablets",
        })
        .returning();

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.assignToAnimal({
        id: item?.id ?? "",
        householdId: testData.household.id,
        animalId: animal?.id ?? "",
      });

      expect(result.assignedAnimalId).toBe(animal?.id);
    });

    it("should unassign item when animalId is null", async () => {
      // First create an animal to assign
      const animalData = testFactories.animal({
        householdId: testData.household.id,
      });
      const [animal] = await db
        .insert(schema.animals)
        .values(animalData)
        .returning();

      // Create inventory item assigned to the animal
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6);

      const [item] = await db
        .insert(schema.inventoryItems)
        .values({
          householdId: testData.household.id,
          medicationId: testData.medication.id,
          lot: "UNASSIGN123",
          expiresOn: expiryDate.toISOString().split("T")[0] ?? "",
          storage: "ROOM",
          quantityUnits: 100,
          unitsRemaining: 100,
          unitType: "tablets",
          assignedAnimalId: animal?.id ?? "", // Start with an assigned animal
        })
        .returning();

      const ctx = createTestTRPCContext({
        user: testData.user,
        household: testData.household,
      });
      const caller = inventoryRouter.createCaller(ctx);

      const result = await caller.assignToAnimal({
        id: item?.id ?? "",
        householdId: testData.household.id,
        animalId: null,
      });

      expect(result.assignedAnimalId).toBeNull();
    });
  });
});
