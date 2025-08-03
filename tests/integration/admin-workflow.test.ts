import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { animals, households, memberships, regimens } from "@/db/schema";
import { appRouter } from "@/server/api/routers/_app";
import {
	seedTestData,
	setupTestDatabase,
	testDb,
} from "@/tests/helpers/db-utils";
import {
	createAuthenticatedContext,
	mockSession,
} from "@/tests/helpers/trpc-utils";

describe("Administration Workflow Integration", () => {
	setupTestDatabase();

	let testData: Awaited<ReturnType<typeof seedTestData>>;

	beforeEach(async () => {
		testData = await seedTestData();
	});

	describe("Complete medication administration workflow", () => {
		it("should handle full administration flow with inventory tracking", async () => {
			if (!testData.animal || !testData.household || !testData.user) {
				throw new Error("Test data missing required entities");
			}
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Step 1: Create a medication regimen directly in database
			const medicationId = randomUUID();
			const regimenData = {
				animalId: testData.animal.id,
				medicationId: medicationId,
				dose: "250mg",
				scheduleType: "FIXED" as const,
				timesLocal: ["08:00", "20:00"],
				startDate: new Date().toISOString().split("T")[0]!,
				endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				instructions: "Take with food",
				active: true,
			};
			const regimenResult = await testDb
				.insert(regimens)
				.values(regimenData)
				.returning();
			const regimen = regimenResult[0];
			if (!regimen) throw new Error("Failed to create test regimen");

			expect(regimen.id).toBeDefined();
			expect(regimen.active).toBe(true);

			// Step 2: Add medication to inventory
			const inventoryItemResult = await caller.inventory.create({
				householdId: testData.household.id,
				medicationId: medicationId,
				unitsTotal: 30,
				unitType: "tablets",
				expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
				lot: "LOT123",
				storage: "ROOM",
			});

			if (!inventoryItemResult) {
				throw new Error("Failed to create inventory item");
			}
			const inventoryItem = inventoryItemResult;
			expect(inventoryItem.quantityUnits).toBe(30);

			// Step 3: Mark inventory as in use
			const inUseItem = await caller.inventory.markAsInUse({
				id: inventoryItem.id,
				householdId: testData.household.id,
				animalId: testData.animal.id,
			});

			expect(inUseItem.inUse).toBe(true);
			expect(inUseItem.assignedAnimalId).toBe(testData.animal.id);

			// Step 4: Record administration
			const administration = await caller.admin.create({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: new Date().toISOString(),
				inventorySourceId: inventoryItem.id,
				idempotencyKey: "test-admin-1",
				notes: "Given with breakfast",
			});

			expect(administration.id).toBeDefined();
			expect(administration.status).toBe("ON_TIME");
			expect(administration.caregiverId).toBe(testData.user.id);

			// Step 5: Verify inventory was decremented
			const updatedInventory = await caller.inventory.list({
				householdId: testData.household.id,
				medicationId: medicationId,
			});

			expect(updatedInventory[0]?.unitsRemaining).toBe(29); // Decreased by 1

			// Step 6: Check administration history
			const history = await caller.admin.list({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				limit: 10,
			});

			expect(history).toHaveLength(1);
			expect(history[0]?.id).toBe(administration.id);
		});

		it("should prevent duplicate administrations with idempotency", async () => {
			if (!testData.animal || !testData.household || !testData.user) {
				throw new Error("Test data missing required entities");
			}
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create regimen directly in database
			const regimenData = {
				animalId: testData.animal.id,
				medicationId: randomUUID(),
				dose: "100mg",
				scheduleType: "FIXED" as const,
				timesLocal: ["09:00"],
				startDate: new Date().toISOString().split("T")[0]!,
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				active: true,
			};
			const regimenResult = await testDb
				.insert(regimens)
				.values(regimenData)
				.returning();
			const regimen = regimenResult[0];
			if (!regimen) throw new Error("Failed to create test regimen");

			// Record administration with same timestamp twice
			const timestamp = new Date().toISOString();

			const admin1 = await caller.admin.create({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: timestamp,
				idempotencyKey: "test-duplicate-1",
			});

			const admin2 = await caller.admin.create({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: timestamp,
				idempotencyKey: "test-duplicate-1",
			});

			// Should return same administration (idempotent)
			expect(admin2.id).toBe(admin1.id);

			// Verify only one administration exists
			const history = await caller.admin.list({
				householdId: testData.household.id,
				animalId: testData.animal.id,
			});

			expect(history).toHaveLength(1);
		});

		it("should handle late administration status correctly", async () => {
			if (!testData.animal || !testData.household || !testData.user) {
				throw new Error("Test data missing required entities");
			}
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create regimen directly in database
			const regimenData = {
				animalId: testData.animal.id,
				medicationId: randomUUID(),
				dose: "100mg",
				scheduleType: "FIXED" as const,
				timesLocal: ["08:00", "20:00"],
				startDate: new Date().toISOString().split("T")[0]!,
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				active: true,
			};
			const regimenResult = await testDb
				.insert(regimens)
				.values(regimenData)
				.returning();
			const regimen = regimenResult[0];
			if (!regimen) throw new Error("Failed to create test regimen");

			// Record administration 2 hours late
			const scheduledTime = new Date();
			scheduledTime.setHours(8, 0, 0, 0);

			const lateTime = new Date(scheduledTime);
			lateTime.setHours(10, 0, 0, 0); // 2 hours late

			const administration = await caller.admin.create({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: lateTime.toISOString(),
				idempotencyKey: `late-admin-${Date.now()}`,
			});

			expect(administration.status).toBe("LATE");
		});

		it("should handle PRN administrations without scheduled time", async () => {
			if (!testData.animal || !testData.household || !testData.user) {
				throw new Error("Test data missing required entities");
			}
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create PRN regimen directly in database
			const prnRegimenData = {
				animalId: testData.animal.id,
				medicationId: randomUUID(),
				dose: "5mg",
				scheduleType: "PRN" as const,
				timesLocal: [],
				startDate: new Date().toISOString().split("T")[0]!,
				instructions: "As needed for pain",
				active: true,
			};
			const prnRegimenResult = await testDb
				.insert(regimens)
				.values(prnRegimenData)
				.returning();
			const prnRegimen = prnRegimenResult[0];
			if (!prnRegimen) throw new Error("Failed to create test PRN regimen");

			// Record PRN administration
			const administration = await caller.admin.create({
				householdId: testData.household.id,
				animalId: testData.animal.id,
				regimenId: prnRegimen.id,
				administeredAt: new Date().toISOString(),
				notes: "Dog showing signs of pain after walk",
				idempotencyKey: `prn-admin-${Date.now()}`,
			});

			expect(administration.status).toBe("PRN");
			expect(administration.scheduledFor).toBeNull();
		});
	});

	describe("Compliance calculation integration", () => {
		it("should calculate weekly compliance correctly", async () => {
			if (!testData.animal || !testData.household || !testData.user) {
				throw new Error("Test data missing required entities");
			}
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "OWNER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create a regimen that started 7 days ago
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 7);

			const regimenData = {
				animalId: testData.animal.id,
				medicationId: randomUUID(),
				dose: "100mg",
				scheduleType: "FIXED" as const,
				timesLocal: ["08:00", "20:00"], // Twice daily = 14 doses in 7 days
				startDate: startDate.toISOString().split("T")[0]!,
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				active: true,
			};
			const regimenResult = await testDb
				.insert(regimens)
				.values(regimenData)
				.returning();
			const regimen = regimenResult[0];
			if (!regimen) throw new Error("Failed to create test regimen");

			// Record 12 out of 14 administrations
			for (let i = 0; i < 12; i++) {
				const adminDate = new Date(startDate);
				adminDate.setHours(Math.floor(i / 2) * 12 + 8, 0, 0, 0); // 8am and 8pm
				adminDate.setDate(adminDate.getDate() + Math.floor(i / 2));

				await caller.admin.create({
					householdId: testData.household.id,
					animalId: testData.animal.id,
					regimenId: regimen.id,
					administeredAt: adminDate.toISOString(),
					idempotencyKey: `compliance-admin-${i}-${Date.now()}`,
				});
			}

			// Get compliance report
			// TODO: Uncomment when insights router is implemented
			// const compliance = await caller.insights.getComplianceReport({
			// 	animalId: testData.animal.id,
			// 	period: "week",
			// });

			// expect(compliance.totalScheduled).toBe(14);
			// expect(compliance.totalAdministered).toBe(12);
			// expect(compliance.complianceRate).toBeCloseTo(85.7, 1); // 12/14 = 85.7%
		});
	});

	describe("Multi-household access control", () => {
		it("should prevent access to resources from other households", async () => {
			// Create another household
			const otherHousehold = (
				await testDb
					.insert(households)
					.values({
						name: "Other Household",
					})
					.returning()
			)[0]!;

			const _otherAnimal = (
				await testDb
					.insert(animals)
					.values({
						name: "Max",
						species: "cat",
						householdId: otherHousehold.id,
					})
					.returning()
			)[0]!;

			// Try to access other household's animal
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "OWNER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Try to list animals from another household
			const result = await caller.animal.list({
				householdId: otherHousehold.id, // Different household
			});

			// Should return empty because user doesn't have access to other household
			expect(result).toHaveLength(0);
		});

		it("should allow users with multiple household memberships to switch context", async () => {
			// Add user to second household
			const secondHousehold = (
				await testDb
					.insert(households)
					.values({
						name: "Second Household",
					})
					.returning()
			)[0]!;

			await testDb.insert(memberships).values({
				userId: testData.user.id,
				householdId: secondHousehold.id,
				role: "CAREGIVER",
			});

			const secondAnimal = (
				await testDb
					.insert(animals)
					.values({
						name: "Luna",
						species: "cat",
						householdId: secondHousehold.id,
					})
					.returning()
			)[0]!;

			// Access with first household context
			const ctx1 = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "OWNER",
				},
			});

			const caller1 = appRouter.createCaller(ctx1);
			const animals1 = await caller1.animal.list({
				householdId: testData.household?.id,
			});
			expect(animals1).toHaveLength(1);
			expect(animals1[0]?.id).toBe(testData.animal?.id);

			// Switch to second household context
			const ctx2 = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: secondHousehold.id,
					role: "CAREGIVER",
				},
			});

			const caller2 = appRouter.createCaller(ctx2);
			const animals2 = await caller2.animal.list({
				householdId: secondHousehold.id,
			});
			expect(animals2).toHaveLength(1);
			expect(animals2[0]?.id).toBe(secondAnimal.id);
		});
	});
});
