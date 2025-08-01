import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../trpc/context";
import { adminRouter } from "./admin";

// Mock database
const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	returning: vi.fn().mockReturnThis(),
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

// Mock audit log function
vi.mock("../../db/schema/audit", () => ({
	createAuditLog: vi.fn(),
}));

describe("adminRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
		const validInput = {
			householdId: "household-1",
			animalId: "animal-1",
			regimenId: "regimen-1",
			idempotencyKey: "test-key-123",
			notes: "Test notes",
		};

		it("should create an administration record successfully", async () => {
			const mockAnimal = {
				id: "animal-1",
				householdId: "household-1",
				timezone: "America/New_York",
			};
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
				scheduleType: "FIXED",
				timesLocal: ["10:00", "18:00"],
				dose: "1 tablet",
				requiresCoSign: false,
				cutoffMinutes: 240,
			};
			const mockAdministration = {
				id: "admin-1",
				...validInput,
				recordedAt: new Date(),
				status: "ON_TIME",
			};

			// Mock database queries
			mockDb.limit
				.mockResolvedValueOnce([mockAnimal]) // Animal query
				.mockResolvedValueOnce([mockRegimen]) // Regimen query
				.mockResolvedValueOnce([]) // Idempotency check
				.mockResolvedValueOnce([mockAdministration]); // Insert result

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.create(validInput);

			expect(result).toEqual(mockAdministration);
			expect(mockDb.insert).toHaveBeenCalled();
			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					regimenId: "regimen-1",
					animalId: "animal-1",
					householdId: "household-1",
					caregiverId: "user-1",
					notes: "Test notes",
					idempotencyKey: "test-key-123",
				}),
			);
		});

		it("should return existing record for duplicate idempotency key", async () => {
			const mockAnimal = { id: "animal-1", householdId: "household-1" };
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
			};
			const existingAdmin = { id: "admin-existing", ...validInput };

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([mockRegimen])
				.mockResolvedValueOnce([existingAdmin]); // Existing record

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.create(validInput);

			expect(result).toEqual(existingAdmin);
			expect(mockDb.insert).not.toHaveBeenCalled(); // Should not insert
		});

		it("should throw error if animal not found", async () => {
			mockDb.limit.mockResolvedValueOnce([]); // No animal found

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
			await expect(caller.create(validInput)).rejects.toThrow(
				"Animal not found in this household",
			);
		});

		it("should throw error if regimen not found or inactive", async () => {
			const mockAnimal = { id: "animal-1", householdId: "household-1" };

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([]); // No regimen found

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(validInput)).rejects.toThrow(
				"Active regimen not found for this animal",
			);
		});

		it("should validate inventory item if provided", async () => {
			const inputWithInventory = {
				...validInput,
				inventorySourceId: "inventory-1",
			};

			const mockAnimal = { id: "animal-1", householdId: "household-1" };
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
			};
			const mockInventory = {
				id: "inventory-1",
				householdId: "household-1",
				expiresOn: new Date("2025-01-01").toISOString(),
			};

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([mockRegimen])
				.mockResolvedValueOnce([mockInventory]) // Inventory check
				.mockResolvedValueOnce([]) // Idempotency check
				.mockResolvedValueOnce([{ id: "admin-1", ...inputWithInventory }]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.create(inputWithInventory);

			expect(result.sourceItemId).toBe("inventory-1");
		});

		it("should throw error for expired inventory without override", async () => {
			const inputWithInventory = {
				...validInput,
				inventorySourceId: "inventory-1",
				allowOverride: false,
			};

			const mockAnimal = { id: "animal-1", householdId: "household-1" };
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
			};
			const mockInventory = {
				id: "inventory-1",
				householdId: "household-1",
				expiresOn: new Date("2023-01-01").toISOString(), // Expired
			};

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([mockRegimen])
				.mockResolvedValueOnce([mockInventory]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(inputWithInventory)).rejects.toThrow(
				"Cannot use expired medication without override",
			);
		});

		it("should calculate administration status correctly", async () => {
			const mockAnimal = {
				id: "animal-1",
				householdId: "household-1",
				timezone: "America/New_York",
			};
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
				scheduleType: "FIXED",
				timesLocal: ["10:00"],
				cutoffMinutes: 240,
			};

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([mockRegimen])
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ id: "admin-1" }]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			// Test with custom administered time
			const now = new Date();
			const administeredAt = new Date(now);
			administeredAt.setHours(10, 30); // 30 minutes after scheduled

			await caller.create({
				...validInput,
				administeredAt: administeredAt.toISOString(),
			});

			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "ON_TIME", // Within 60 minutes
				}),
			);
		});

		it("should handle PRN medications", async () => {
			const mockAnimal = { id: "animal-1", householdId: "household-1" };
			const mockRegimen = {
				id: "regimen-1",
				animalId: "animal-1",
				active: true,
				scheduleType: "PRN",
			};

			mockDb.limit
				.mockResolvedValueOnce([mockAnimal])
				.mockResolvedValueOnce([mockRegimen])
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ id: "admin-1" }]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await caller.create(validInput);

			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "PRN",
				}),
			);
		});
	});

	describe("list", () => {
		it("should list administrations for a household", async () => {
			const mockAdministrations = [
				{ id: "admin-1", animalId: "animal-1", recordedAt: new Date() },
				{ id: "admin-2", animalId: "animal-2", recordedAt: new Date() },
			];

			mockDb.limit.mockResolvedValueOnce(mockAdministrations);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.list({
				householdId: "household-1",
				limit: 50,
			});

			expect(result).toEqual(mockAdministrations);
			expect(mockDb.where).toHaveBeenCalled();
			expect(mockDb.orderBy).toHaveBeenCalled();
		});

		it("should filter by animal if provided", async () => {
			mockDb.limit.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				animalId: "animal-1",
			});

			// Verify where clause was called with animal filter
			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should filter by date range if provided", async () => {
			mockDb.limit.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				startDate: "2024-01-01T00:00:00Z",
				endDate: "2024-01-31T23:59:59Z",
			});

			// Verify where clause was called with date filters
			expect(mockDb.where).toHaveBeenCalled();
		});
	});
});
