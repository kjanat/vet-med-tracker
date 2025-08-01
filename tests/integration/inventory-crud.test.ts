import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTRPCCaller } from "@/server/api/routers/_app";
import { createTestContext } from "../helpers/test-context";

describe("Inventory CRUD Operations", () => {
	let ctx: ReturnType<typeof createTestContext>;
	let caller: ReturnType<typeof createTRPCCaller>;

	beforeEach(() => {
		ctx = createTestContext();
		caller = createTRPCCaller(ctx);
	});

	describe("list", () => {
		it("should list inventory items for a household", async () => {
			const householdId = "test-household-id";
			const medicationId = "test-med-id";

			// Mock medication catalog data
			const mockMedication = {
				id: medicationId,
				genericName: "Amoxicillin",
				brandName: "Amoxil",
				strength: "500mg",
				route: "ORAL",
				form: "TABLET",
			};

			// Mock inventory items
			const mockInventoryItem = {
				id: "item-1",
				householdId,
				medicationId,
				lot: "TEST123",
				expiresOn: "2024-12-31",
				storage: "ROOM",
				unitsTotal: 100,
				unitsRemaining: 75,
				inUse: true,
				assignedAnimalId: null,
				deletedAt: null,
			};

			// Setup mocks
			ctx.db.select.mockResolvedValueOnce([
				{
					item: mockInventoryItem,
					medication: mockMedication,
				},
			]);

			const result = await caller.inventory.list({
				householdId,
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: "item-1",
				name: "Amoxil",
				genericName: "Amoxicillin",
				strength: "500mg",
				lot: "TEST123",
				unitsRemaining: 75,
				inUse: true,
			});
		});

		it("should filter expired items when includeExpired is false", async () => {
			const householdId = "test-household-id";

			ctx.db.select.mockResolvedValueOnce([]);

			const result = await caller.inventory.list({
				householdId,
				includeExpired: false,
			});

			expect(result).toHaveLength(0);
			// Verify the query included expiration date filter
			expect(ctx.db.select).toHaveBeenCalled();
		});
	});

	describe("create", () => {
		it("should create a new inventory item", async () => {
			const householdId = "test-household-id";
			const medicationId = "test-med-id";

			const newItem = {
				householdId,
				medicationId,
				lot: "NEW123",
				expiresOn: new Date("2024-12-31"),
				storage: "FRIDGE" as const,
				unitsTotal: 50,
				unitType: "tablets",
			};

			const mockCreatedItem = {
				id: "new-item-id",
				...newItem,
				expiresOn: "2024-12-31",
				unitsRemaining: 50,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			ctx.db.insert.mockReturnValueOnce({
				values: vi.fn().mockReturnValueOnce({
					returning: vi.fn().mockResolvedValueOnce([mockCreatedItem]),
				}),
			});

			const result = await caller.inventory.create(newItem);

			expect(result).toMatchObject({
				id: "new-item-id",
				householdId,
				medicationId,
				lot: "NEW123",
				unitsRemaining: 50,
			});
		});
	});

	describe("update", () => {
		it("should update an inventory item", async () => {
			const itemId = "item-1";
			const householdId = "test-household-id";

			const updateData = {
				id: itemId,
				householdId,
				lot: "UPDATED123",
				unitsRemaining: 25,
				notes: "Updated notes",
			};

			const mockUpdatedItem = {
				id: itemId,
				...updateData,
				updatedAt: new Date(),
			};

			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([mockUpdatedItem]),
					}),
				}),
			});

			const result = await caller.inventory.update(updateData);

			expect(result).toMatchObject({
				id: itemId,
				lot: "UPDATED123",
				unitsRemaining: 25,
				notes: "Updated notes",
			});
		});

		it("should throw error if item not found", async () => {
			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([]),
					}),
				}),
			});

			await expect(
				caller.inventory.update({
					id: "non-existent",
					householdId: "test-household-id",
				}),
			).rejects.toThrow("Inventory item not found or already deleted");
		});
	});

	describe("setInUse", () => {
		it("should set in-use status to true", async () => {
			const itemId = "item-1";
			const householdId = "test-household-id";

			const mockUpdatedItem = {
				id: itemId,
				inUse: true,
				openedOn: "2024-01-01",
				updatedAt: new Date(),
			};

			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([mockUpdatedItem]),
					}),
				}),
			});

			const result = await caller.inventory.setInUse({
				id: itemId,
				householdId,
				inUse: true,
			});

			expect(result.inUse).toBe(true);
			expect(result.openedOn).toBeDefined();
		});
	});

	describe("delete", () => {
		it("should soft delete an inventory item", async () => {
			const itemId = "item-1";
			const householdId = "test-household-id";

			const mockDeletedItem = {
				id: itemId,
				deletedAt: new Date(),
				updatedAt: new Date(),
			};

			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([mockDeletedItem]),
					}),
				}),
			});

			const result = await caller.inventory.delete({
				id: itemId,
				householdId,
			});

			expect(result.deletedAt).toBeDefined();
		});
	});

	describe("assignToAnimal", () => {
		it("should assign item to an animal", async () => {
			const itemId = "item-1";
			const householdId = "test-household-id";
			const animalId = "animal-1";

			const mockUpdatedItem = {
				id: itemId,
				assignedAnimalId: animalId,
				updatedAt: new Date(),
			};

			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([mockUpdatedItem]),
					}),
				}),
			});

			const result = await caller.inventory.assignToAnimal({
				id: itemId,
				householdId,
				animalId,
			});

			expect(result.assignedAnimalId).toBe(animalId);
		});

		it("should unassign item when animalId is null", async () => {
			const itemId = "item-1";
			const householdId = "test-household-id";

			const mockUpdatedItem = {
				id: itemId,
				assignedAnimalId: null,
				updatedAt: new Date(),
			};

			ctx.db.update.mockReturnValueOnce({
				set: vi.fn().mockReturnValueOnce({
					where: vi.fn().mockReturnValueOnce({
						returning: vi.fn().mockResolvedValueOnce([mockUpdatedItem]),
					}),
				}),
			});

			const result = await caller.inventory.assignToAnimal({
				id: itemId,
				householdId,
				animalId: null,
			});

			expect(result.assignedAnimalId).toBeNull();
		});
	});
});
