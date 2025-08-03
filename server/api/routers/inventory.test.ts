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

	describe("create", () => {
		it("should add a new inventory item", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const mockInventoryItem = {
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				medicationId: "77777777-7777-4777-8777-777777777777",
				unitsTotal: 30,
				unitType: "tablets",
				expiresOn: "2025-12-31",
				lot: "LOT123",
				assignedAnimalId: null,
				inUse: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([mockInventoryItem]),
					}) as any,
			);

			const result = await caller.create({
				householdId: mockSession.access.householdId,
				medicationId: "77777777-7777-4777-8777-777777777777",
				unitsTotal: 30,
				unitType: "tablets",
				expiresOn: new Date("2025-12-31"),
				lot: "LOT123",
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
				caller.create({
					householdId: mockSession.access.householdId,
					medicationId: "77777777-7777-4777-8777-777777777777",
					unitsTotal: 30,
					unitType: "tablets",
					expiresOn: pastDate,
					lot: "LOT123",
				}),
			).rejects.toThrow();
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
				caller.create({
					householdId: mockSession.access.householdId,
					medicationId: "77777777-7777-4777-8777-777777777777",
					unitsTotal: 30,
					unitType: "tablets",
					expiresOn: new Date("2025-12-31"),
					lot: "LOT123",
				}),
			).rejects.toThrow("FORBIDDEN");
		});
	});

	describe("updateQuantity", () => {
		it("should update inventory quantity", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			const updatedItem = {
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				medicationId: "77777777-7777-4777-8777-777777777777",
				unitsRemaining: 25,
				unitsTotal: 30,
				unitType: "tablets",
				expiresOn: "2025-12-31",
				lot: "LOT123",
				assignedAnimalId: null,
				inUse: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "88888888-8888-4888-8888-888888888888",
								householdId: mockSession.access.householdId,
								unitsRemaining: 30,
							},
						]),
					}) as any,
			);

			// Mock updating the item
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([updatedItem]),
					}) as any,
			);

			const result = await caller.updateQuantity({
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				quantityChange: -5,
				reason: "Used 5 tablets",
			});

			expect(result).toEqual(updatedItem);
			expect(result?.unitsRemaining).toBe(25);
		});

		it("should not allow negative quantities", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = inventoryRouter.createCaller(ctx);

			await expect(
				caller.updateQuantity({
					id: "88888888-8888-4888-8888-888888888888",
					householdId: mockSession.access.householdId,
					quantityChange: -35,
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
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "88888888-8888-4888-8888-888888888888",
								householdId: mockSession.access.householdId,
								unitsRemaining: 30,
							},
						]),
					}) as any,
			);

			// Mock update
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([{ unitsRemaining: 25 }]),
					}) as any,
			);

			// Mock audit log insert
			const auditLogSpy = vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as any,
			);

			await caller.updateQuantity({
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				quantityChange: -5,
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
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				medicationId: "77777777-7777-4777-8777-777777777777",
				unitsTotal: 30,
				unitsRemaining: 30,
				unitType: "tablets",
				expiresOn: "2025-12-31",
				lot: "LOT123",
				assignedAnimalId: "99999999-9999-4999-8999-999999999999",
				inUse: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock finding the item
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "88888888-8888-4888-8888-888888888888",
								householdId: mockSession.access.householdId,
								inUse: false,
								medicationId: "77777777-7777-4777-8777-777777777777",
							},
						]),
					}) as any,
			);

			// Mock updating the item
			vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([updatedItem]),
					}) as any,
			);

			const result = await caller.markAsInUse({
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				animalId: "99999999-9999-4999-8999-999999999999",
			});

			expect(result).toEqual(updatedItem);
			expect(result.inUse).toBe(true);
			expect(result.assignedAnimalId).toBe(
				"99999999-9999-4999-8999-999999999999",
			);
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
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "88888888-8888-4888-8888-888888888888",
								householdId: mockSession.access.householdId,
								inUse: false,
								medicationId: "77777777-7777-4777-8777-777777777777",
							},
						]),
					}) as any,
			);

			const updateSpy = vi.spyOn(ctx.db, "update").mockImplementation(
				() =>
					({
						set: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([{ isInUse: true }]),
					}) as any,
			);

			await caller.markAsInUse({
				id: "88888888-8888-4888-8888-888888888888",
				householdId: mockSession.access.householdId,
				animalId: "99999999-9999-4999-8999-999999999999",
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
					id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
					quantity: 30,
					medicationName: "Amoxicillin",
					expiresOn: "2025-12-31",
					inUse: true,
				},
				{
					id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
					quantity: 20,
					medicationName: "Prednisone",
					expiresOn: "2025-06-30",
					inUse: false,
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						innerJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(
							mockInventory.map((item) => ({
								item: {
									id: item.id,
									unitsRemaining: item.quantity,
									expiresOn: item.expiresOn,
									inUse: item.inUse,
									brandOverride: null,
								},
								medication: {
									genericName: item.medicationName,
									brandName: null,
								},
							})),
						),
					}) as any,
			);

			const result = await caller.getHouseholdInventory({
				householdId: mockSession.access.householdId,
			});

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
						innerJoin: vi.fn().mockReturnThis(),
						where: whereSpy,
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as any,
			);

			await caller.getHouseholdInventory({
				householdId: mockSession.access.householdId,
				medicationId: "77777777-7777-4777-8777-777777777777",
			});

			expect(whereSpy).toHaveBeenCalled();
		});
	});
});
