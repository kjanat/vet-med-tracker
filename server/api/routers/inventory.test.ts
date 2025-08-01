import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../trpc/context";
import { inventoryRouter } from "./inventory";

// Mock database
const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	innerJoin: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
};

// Mock context
const createMockContext = (overrides?: Partial<Context>): Context => ({
	db: mockDb,
	user: {
		id: "user-1",
		name: "Test User",
		email: "test@example.com",
	},
	session: {
		access_token: "mock-token",
		refresh_token: "mock-refresh",
		expires_at: Date.now() + 3600000,
	},
	currentHouseholdId: "household-1",
	...overrides,
});

describe("inventoryRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("list", () => {
		const mockInventoryItems = [
			{
				item: {
					id: "inventory-1",
					householdId: "household-1",
					medicationId: "med-1",
					brandOverride: null,
					lotNumber: "LOT123",
					expiresOn: "2025-01-01",
					unitsRemaining: 20,
					unitsTotal: 30,
					inUse: true,
					assignedAnimalId: "animal-1",
					storageLocation: "Cabinet A",
					notes: "Keep refrigerated",
				},
				medication: {
					id: "med-1",
					genericName: "Amoxicillin",
					brandName: "Amoxil",
					strength: "250mg",
					form: "Tablet",
					route: "Oral",
				},
			},
			{
				item: {
					id: "inventory-2",
					householdId: "household-1",
					medicationId: "med-2",
					brandOverride: "Generic Brand",
					lotNumber: null,
					expiresOn: "2024-06-01",
					unitsRemaining: 5,
					unitsTotal: 10,
					inUse: false,
					assignedAnimalId: null,
					storageLocation: null,
					notes: null,
				},
				medication: {
					id: "med-2",
					genericName: "Gabapentin",
					brandName: null,
					strength: "100mg/mL",
					form: "Liquid",
					route: "Oral",
				},
			},
		];

		it("should list inventory items for a household", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockInventoryItems);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.list({
				householdId: "household-1",
			});

			expect(result).toHaveLength(2);

			// Check first item
			expect(result[0]).toMatchObject({
				id: "inventory-1",
				name: "Amoxil",
				genericName: "Amoxicillin",
				lot: "LOT123",
				unitsRemaining: 20,
				isExpired: false,
				inUse: true,
			});

			// Check second item with brand override
			expect(result[1]).toMatchObject({
				id: "inventory-2",
				name: "Generic Brand", // Should use brandOverride
				genericName: "Gabapentin",
				lot: "",
				unitsRemaining: 5,
				isExpired: false, // Not expired yet (2024-06-01)
				inUse: false,
			});
		});

		it("should filter by medication ID", async () => {
			mockDb.orderBy.mockResolvedValueOnce([mockInventoryItems[0]]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				medicationId: "med-1",
			});

			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should filter by animal ID", async () => {
			mockDb.orderBy.mockResolvedValueOnce([mockInventoryItems[0]]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				animalId: "animal-1",
			});

			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should exclude expired items by default", async () => {
			mockDb.orderBy.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				includeExpired: false, // default
			});

			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should include expired items when requested", async () => {
			const expiredItem = {
				...mockInventoryItems[1],
				item: {
					...mockInventoryItems[1].item,
					expiresOn: "2023-01-01", // Expired
				},
			};

			mockDb.orderBy.mockResolvedValueOnce([
				mockInventoryItems[0],
				expiredItem,
			]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.list({
				householdId: "household-1",
				includeExpired: true,
			});

			expect(result).toHaveLength(2);
			expect(result[1].isExpired).toBe(true);
		});

		it("should filter by in-use status", async () => {
			mockDb.orderBy.mockResolvedValueOnce([mockInventoryItems[0]]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.list({
				householdId: "household-1",
				inUseOnly: true,
			});

			expect(result).toHaveLength(1);
			expect(result[0].inUse).toBe(true);
		});
	});

	describe("getSources", () => {
		it("should get inventory sources for a medication", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockInventoryItems);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.getSources({
				householdId: "household-1",
				medicationName: "Amoxicillin",
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: "inventory-1",
				name: "Amoxil",
				lot: "LOT123",
				unitsRemaining: 20,
				isExpired: false,
				isWrongMed: false,
				inUse: true,
			});
		});

		it("should perform case-insensitive medication name search", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockInventoryItems);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.getSources({
				householdId: "household-1",
				medicationName: "amoxicillin", // lowercase
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("Amoxil");
		});

		it("should search across generic name, brand name, and override", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockInventoryItems);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			// Search by brand override
			const result1 = await caller.getSources({
				householdId: "household-1",
				medicationName: "Generic",
			});

			expect(result1).toHaveLength(1);
			expect(result1[0].name).toBe("Generic Brand");

			// Search by generic name
			mockDb.orderBy.mockResolvedValueOnce(mockInventoryItems);
			const result2 = await caller.getSources({
				householdId: "household-1",
				medicationName: "Gabapentin",
			});

			expect(result2).toHaveLength(1);
		});

		it("should order by in-use status and expiration", async () => {
			const multipleItems = [
				...mockInventoryItems,
				{
					item: {
						...mockInventoryItems[0].item,
						id: "inventory-3",
						inUse: false,
						expiresOn: "2024-12-01",
					},
					medication: mockInventoryItems[0].medication,
				},
			];

			mockDb.orderBy.mockResolvedValueOnce(multipleItems);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.getSources({
				householdId: "household-1",
				medicationName: "Amox",
			});

			// Should have in-use items first
			expect(result[0].inUse).toBe(true);
			expect(result[1].inUse).toBe(false);
		});

		it("should exclude expired items by default", async () => {
			const expiredItem = {
				...mockInventoryItems[0],
				item: {
					...mockInventoryItems[0].item,
					expiresOn: "2023-01-01",
				},
			};

			mockDb.orderBy.mockResolvedValueOnce([expiredItem]);

			const ctx = createMockContext();
			const caller = inventoryRouter.createCaller(ctx);

			const result = await caller.getSources({
				householdId: "household-1",
				medicationName: "Amoxicillin",
				includeExpired: false,
			});

			// Should filter out expired items on application side
			expect(result).toHaveLength(0);
		});
	});
});
