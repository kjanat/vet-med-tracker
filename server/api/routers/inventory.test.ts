import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAuthenticatedContext,
	mockSession,
} from "@/tests/helpers/trpc-utils";
import { inventoryRouter } from "./inventory";

describe("inventoryRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addItem", () => {
		it("should add a new inventory item", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const mockInventoryItem = {
				id: "inv-123",
				householdId: mockSession.access.householdId,
				medicationId: "med-123",
				quantity: 30,
				unit: "tablets",
				expiryDate: new Date("2025-12-31"),
				lotNumber: "LOT123",
				assignedToAnimalId: null,
				isInUse: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: mockSession.subject,
			};

			vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([mockInventoryItem]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			const result = await caller.addItem({
				medicationId: "med-123",
				quantity: 30,
				unit: "tablets",
				expiryDate: "2025-12-31",
				lotNumber: "LOT123",
			});

			expect(result).toEqual(mockInventoryItem);
			expect(ctx.db.insert).toHaveBeenCalled();
		});

		it("should validate expiry date is in the future", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 1);

			await expect(
				caller.addItem({
					medicationId: "med-123",
					quantity: 30,
					unit: "tablets",
					expiryDate: pastDate.toISOString().split("T")[0],
					lotNumber: "LOT123",
				}),
			).rejects.toThrow("Expiry date must be in the future");
		});

		it("should require caregiver role or higher", async () => {
			const ctx = await createAuthenticatedContext({
				...mockSession,
				access: {
					householdId: mockSession.access.householdId,
					role: "VETREADONLY",
				},
			});
			const caller = inventoryRouter.createCaller(ctx);

			await expect(
				caller.addItem({
					medicationId: "med-123",
					quantity: 30,
					unit: "tablets",
					expiryDate: "2025-12-31",
					lotNumber: "LOT123",
				}),
			).rejects.toThrow("FORBIDDEN");
		});
	});

	describe("updateQuantity", () => {
		it("should update inventory quantity", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const updatedItem = {
				id: "inv-123",
				householdId: mockSession.access.householdId,
				medicationId: "med-123",
				quantity: 25,
				unit: "tablets",
				expiryDate: new Date("2025-12-31"),
				lotNumber: "LOT123",
				assignedToAnimalId: null,
				isInUse: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: "user-1",
			};

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "inv-123",
								householdId: mockSession.access.householdId,
								quantity: 30,
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock updating the item
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([updatedItem]),
					}) as ReturnType<typeof mockDb.update>,
			);

			const result = await caller.updateQuantity({
				id: "inv-123",
				quantity: 25,
				reason: "Used 5 tablets",
			});

			expect(result).toEqual(updatedItem);
			expect(result.quantity).toBe(25);
		});

		it("should not allow negative quantities", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			await expect(
				caller.updateQuantity({
					id: "inv-123",
					quantity: -5,
					reason: "Invalid update",
				}),
			).rejects.toThrow();
		});

		it("should log quantity changes in audit log", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "inv-123",
								householdId: mockSession.access.householdId,
								quantity: 30,
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock update
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([{ quantity: 25 }]),
					}) as ReturnType<typeof mockDb.update>,
			);

			// Mock audit log insert
			const auditLogSpy = vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			await caller.updateQuantity({
				id: "inv-123",
				quantity: 25,
				reason: "Used 5 tablets",
			});

			expect(auditLogSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "UPDATE_INVENTORY_QUANTITY",
					details: expect.objectContaining({
						oldQuantity: 30,
						newQuantity: 25,
						reason: "Used 5 tablets",
					}),
				}),
			);
		});
	});

	describe("markAsInUse", () => {
		it("should mark inventory item as in use", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const updatedItem = {
				id: "inv-123",
				householdId: mockSession.access.householdId,
				medicationId: "med-123",
				quantity: 30,
				unit: "tablets",
				expiryDate: new Date("2025-12-31"),
				lotNumber: "LOT123",
				assignedToAnimalId: "animal-123",
				isInUse: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: "user-1",
			};

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "inv-123",
								householdId: mockSession.access.householdId,
								isInUse: false,
								medicationId: "med-123",
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock updating the item
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([updatedItem]),
					}) as ReturnType<typeof mockDb.update>,
			);

			const result = await caller.markAsInUse({
				id: "inv-123",
				animalId: "animal-123",
			});

			expect(result).toEqual(updatedItem);
			expect(result.isInUse).toBe(true);
			expect(result.assignedToAnimalId).toBe("animal-123");
		});

		it("should unmark other items of same medication when marking as in use", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "inv-123",
								householdId: mockSession.access.householdId,
								isInUse: false,
								medicationId: "med-123",
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			const updateSpy = vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([{ isInUse: true }]),
					}) as ReturnType<typeof mockDb.update>,
			);

			await caller.markAsInUse({
				id: "inv-123",
				animalId: "animal-123",
			});

			// Should be called twice: once to unmark others, once to mark this one
			expect(updateSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("getHouseholdInventory", () => {
		it("should return all inventory items for household", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const mockInventory = [
				{
					id: "inv-1",
					householdId: mockSession.access.householdId,
					medicationId: "med-1",
					medicationName: "Amoxicillin",
					quantity: 30,
					unit: "tablets",
					expiryDate: new Date("2025-12-31"),
					isInUse: true,
					assignedToAnimalId: "animal-1",
					assignedToAnimalName: "Buddy",
				},
				{
					id: "inv-2",
					householdId: mockSession.access.householdId,
					medicationId: "med-2",
					medicationName: "Prednisone",
					quantity: 20,
					unit: "tablets",
					expiryDate: new Date("2025-06-30"),
					isInUse: false,
					assignedToAnimalId: null,
					assignedToAnimalName: null,
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockInventory),
					}) as ReturnType<typeof mockDb.select>,
			);

			const result = await caller.getHouseholdInventory();

			expect(result).toEqual(mockInventory);
			expect(result).toHaveLength(2);
		});

		it("should filter by medication if provided", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const whereSpy = vi.fn().mockReturnThis();
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: whereSpy,
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			await caller.getHouseholdInventory({ medicationId: "med-123" });

			expect(whereSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					medicationId: "med-123",
				}),
			);
		});
	});

	describe("getLowStockItems", () => {
		it("should return items below threshold", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const lowStockItems = [
				{
					id: "inv-1",
					medicationName: "Amoxicillin",
					quantity: 5,
					unit: "tablets",
					daysRemaining: 2,
					assignedToAnimalName: "Buddy",
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(lowStockItems),
					}) as ReturnType<typeof mockDb.select>,
			);

			const result = await caller.getLowStockItems({ threshold: 7 });

			expect(result).toEqual(lowStockItems);
			expect(result[0].daysRemaining).toBeLessThanOrEqual(7);
		});
	});
});
