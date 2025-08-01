import { beforeEach, describe, expect, it } from "vitest";
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
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Step 1: Create a medication regimen
			const regimen = await caller.regimens.createRegimen({
				animalId: testData.animal.id,
				medicationId: "med-amoxicillin",
				dosage: "250mg",
				frequency: "BID",
				scheduleType: "FIXED",
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
				notes: "Take with food",
			});

			expect(regimen.id).toBeDefined();
			expect(regimen.isActive).toBe(true);

			// Step 2: Add medication to inventory
			const inventoryItem = await caller.inventory.addItem({
				medicationId: "med-amoxicillin",
				quantity: 30,
				unit: "tablets",
				expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
				lotNumber: "LOT123",
			});

			expect(inventoryItem.quantity).toBe(30);

			// Step 3: Mark inventory as in use
			const inUseItem = await caller.inventory.markAsInUse({
				id: inventoryItem.id,
				animalId: testData.animal.id,
			});

			expect(inUseItem.isInUse).toBe(true);
			expect(inUseItem.assignedToAnimalId).toBe(testData.animal.id);

			// Step 4: Record administration
			const administration = await caller.admin.recordAdministration({
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: new Date().toISOString(),
				inventoryItemId: inventoryItem.id,
				notes: "Given with breakfast",
			});

			expect(administration.id).toBeDefined();
			expect(administration.status).toBe("ON_TIME");
			expect(administration.administeredBy).toBe(testData.user.id);

			// Step 5: Verify inventory was decremented
			const updatedInventory = await caller.inventory.getHouseholdInventory({
				medicationId: "med-amoxicillin",
			});

			expect(updatedInventory[0].quantity).toBe(29); // Decreased by 1

			// Step 6: Check administration history
			const history = await caller.admin.getAdministrationHistory({
				animalId: testData.animal.id,
				limit: 10,
			});

			expect(history).toHaveLength(1);
			expect(history[0].id).toBe(administration.id);
		});

		it("should prevent duplicate administrations with idempotency", async () => {
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create regimen
			const regimen = await caller.regimens.createRegimen({
				animalId: testData.animal.id,
				medicationId: "med-123",
				dosage: "100mg",
				frequency: "QD",
				scheduleType: "FIXED",
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			});

			// Record administration with same timestamp twice
			const timestamp = new Date().toISOString();

			const admin1 = await caller.admin.recordAdministration({
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: timestamp,
			});

			const admin2 = await caller.admin.recordAdministration({
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: timestamp,
			});

			// Should return same administration (idempotent)
			expect(admin2.id).toBe(admin1.id);

			// Verify only one administration exists
			const history = await caller.admin.getAdministrationHistory({
				animalId: testData.animal.id,
			});

			expect(history).toHaveLength(1);
		});

		it("should handle late administration status correctly", async () => {
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create regimen
			const regimen = await caller.regimens.createRegimen({
				animalId: testData.animal.id,
				medicationId: "med-123",
				dosage: "100mg",
				frequency: "BID",
				scheduleType: "FIXED",
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				targetTime: "08:00",
			});

			// Record administration 2 hours late
			const scheduledTime = new Date();
			scheduledTime.setHours(8, 0, 0, 0);

			const lateTime = new Date(scheduledTime);
			lateTime.setHours(10, 0, 0, 0); // 2 hours late

			const administration = await caller.admin.recordAdministration({
				animalId: testData.animal.id,
				regimenId: regimen.id,
				administeredAt: lateTime.toISOString(),
				scheduledFor: scheduledTime.toISOString(),
			});

			expect(administration.status).toBe("LATE");
		});

		it("should handle PRN administrations without scheduled time", async () => {
			const ctx = await createAuthenticatedContext({
				...mockSession,
				subject: testData.user.id,
				access: {
					householdId: testData.household.id,
					role: "CAREGIVER",
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Create PRN regimen
			const prnRegimen = await caller.regimens.createRegimen({
				animalId: testData.animal.id,
				medicationId: "med-pain",
				dosage: "5mg",
				frequency: "PRN",
				scheduleType: "PRN",
				startDate: new Date().toISOString(),
				endDate: null, // No end date for PRN
				notes: "As needed for pain",
			});

			// Record PRN administration
			const administration = await caller.admin.recordAdministration({
				animalId: testData.animal.id,
				regimenId: prnRegimen.id,
				administeredAt: new Date().toISOString(),
				notes: "Dog showing signs of pain after walk",
			});

			expect(administration.status).toBe("PRN");
			expect(administration.scheduledFor).toBeNull();
		});
	});

	describe("Compliance calculation integration", () => {
		it("should calculate weekly compliance correctly", async () => {
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

			const regimen = await caller.regimens.createRegimen({
				animalId: testData.animal.id,
				medicationId: "med-123",
				dosage: "100mg",
				frequency: "BID", // Twice daily = 14 doses in 7 days
				scheduleType: "FIXED",
				startDate: startDate.toISOString(),
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			});

			// Record 12 out of 14 administrations
			for (let i = 0; i < 12; i++) {
				const adminDate = new Date(startDate);
				adminDate.setHours(Math.floor(i / 2) * 12 + 8, 0, 0, 0); // 8am and 8pm
				adminDate.setDate(adminDate.getDate() + Math.floor(i / 2));

				await caller.admin.recordAdministration({
					animalId: testData.animal.id,
					regimenId: regimen.id,
					administeredAt: adminDate.toISOString(),
				});
			}

			// Get compliance report
			const compliance = await caller.insights.getComplianceReport({
				animalId: testData.animal.id,
				period: "week",
			});

			expect(compliance.totalScheduled).toBe(14);
			expect(compliance.totalAdministered).toBe(12);
			expect(compliance.complianceRate).toBeCloseTo(85.7, 1); // 12/14 = 85.7%
		});
	});

	describe("Multi-household access control", () => {
		it("should prevent access to resources from other households", async () => {
			// Create another household
			const [otherHousehold] = await testDb
				.insert(households)
				.values({
					id: "other-household",
					name: "Other Household",
					createdById: "other-user",
				})
				.returning();

			const [otherAnimal] = await testDb
				.insert(animals)
				.values({
					id: "other-animal",
					name: "Max",
					species: "cat",
					householdId: otherHousehold.id,
				})
				.returning();

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

			await expect(
				caller.regimens.createRegimen({
					animalId: otherAnimal.id, // Animal from different household
					medicationId: "med-123",
					dosage: "100mg",
					frequency: "QD",
					scheduleType: "FIXED",
					startDate: new Date().toISOString(),
					endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				}),
			).rejects.toThrow("FORBIDDEN");
		});

		it("should allow users with multiple household memberships to switch context", async () => {
			// Add user to second household
			const [secondHousehold] = await testDb
				.insert(households)
				.values({
					id: "second-household",
					name: "Second Household",
					createdById: testData.user.id,
				})
				.returning();

			await testDb.insert(memberships).values({
				userId: testData.user.id,
				householdId: secondHousehold.id,
				role: "CAREGIVER",
			});

			const [secondAnimal] = await testDb
				.insert(animals)
				.values({
					id: "second-animal",
					name: "Luna",
					species: "cat",
					householdId: secondHousehold.id,
				})
				.returning();

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
			const animals1 = await caller1.animals.getHouseholdAnimals();
			expect(animals1).toHaveLength(1);
			expect(animals1[0].id).toBe(testData.animal.id);

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
			const animals2 = await caller2.animals.getHouseholdAnimals();
			expect(animals2).toHaveLength(1);
			expect(animals2[0].id).toBe(secondAnimal.id);
		});
	});
});

// Import schema (update paths as needed)
import { animals, households, memberships } from "@/server/db/schema";
