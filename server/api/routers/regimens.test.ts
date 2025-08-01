import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../trpc/context";
import { regimenRouter } from "./regimens";

// Mock database
const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	innerJoin: vi.fn().mockReturnThis(),
	leftJoin: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
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

describe("regimenRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listDue", () => {
		const mockActiveRegimens = [
			{
				regimen: {
					id: "regimen-1",
					scheduleType: "FIXED",
					timesLocal: ["10:00", "18:00"],
					dose: "1 tablet",
					highRisk: false,
					requiresCoSign: false,
					instructions: "Give with food",
					prnReason: null,
				},
				animal: {
					id: "animal-1",
					name: "Buddy",
					species: "Dog",
					photoUrl: "https://example.com/buddy.jpg",
					timezone: "America/New_York",
				},
				medication: {
					genericName: "Amoxicillin",
					brandName: "Amoxil",
					route: "Oral",
					form: "Tablet",
					strength: "250mg",
				},
				lastAdmin: null,
			},
			{
				regimen: {
					id: "regimen-2",
					scheduleType: "PRN",
					timesLocal: null,
					dose: "0.5mL",
					highRisk: true,
					requiresCoSign: true,
					instructions: null,
					prnReason: "Pain",
				},
				animal: {
					id: "animal-2",
					name: "Mittens",
					species: "Cat",
					photoUrl: null,
					timezone: "America/New_York",
				},
				medication: {
					genericName: "Gabapentin",
					brandName: null,
					route: "Oral",
					form: "Liquid",
					strength: "100mg/mL",
				},
				lastAdmin: {
					id: "admin-1",
					recordedAt: new Date(),
					status: "ON_TIME",
				},
			},
		];

		it("should list due medications successfully", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockActiveRegimens);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.listDue({
				householdId: "household-1",
				includeUpcoming: true,
			});

			expect(result).toHaveLength(2);

			// Check first medication (FIXED schedule)
			expect(result[0]).toMatchObject({
				id: "regimen-1",
				animalId: "animal-1",
				animalName: "Buddy",
				medicationName: "Amoxicillin",
				isPRN: false,
				section: expect.stringMatching(/^(due|later|prn)$/),
			});

			// Check second medication (PRN)
			expect(result[1]).toMatchObject({
				id: "regimen-2",
				animalId: "animal-2",
				animalName: "Mittens",
				medicationName: "Gabapentin",
				isPRN: true,
				section: "prn",
				isHighRisk: true,
				requiresCoSign: true,
			});
		});

		it("should use household from context if not provided", async () => {
			mockDb.orderBy.mockResolvedValueOnce([]);

			const ctx = createMockContext({ currentHouseholdId: "household-2" });
			const caller = regimenRouter.createCaller(ctx);

			await caller.listDue({});

			// Verify it used the context household
			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should throw error if no household provided", async () => {
			const ctx = createMockContext({ currentHouseholdId: undefined });
			const caller = regimenRouter.createCaller(ctx);

			await expect(caller.listDue({})).rejects.toThrow(
				"householdId is required",
			);
		});

		it("should filter by animal if provided", async () => {
			mockDb.orderBy.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			await caller.listDue({
				householdId: "household-1",
				animalId: "animal-1",
			});

			expect(mockDb.where).toHaveBeenCalled();
		});

		it("should categorize medications by due status", async () => {
			// Mock current time to be 10:30 AM
			const mockDate = new Date("2024-01-01T10:30:00");
			vi.setSystemTime(mockDate);

			mockDb.orderBy.mockResolvedValueOnce(mockActiveRegimens);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.listDue({
				householdId: "household-1",
				includeUpcoming: true,
			});

			// The FIXED medication with times at 10:00 and 18:00
			// At 10:30, the 10:00 dose is "due" (within 60 minutes)
			const fixedMed = result.find((r) => r.id === "regimen-1");
			expect(fixedMed?.section).toBe("due");
			expect(fixedMed?.isOverdue).toBe(true);
			expect(fixedMed?.minutesUntilDue).toBeLessThan(0);

			// The PRN medication should always be in PRN section
			const prnMed = result.find((r) => r.id === "regimen-2");
			expect(prnMed?.section).toBe("prn");

			vi.useRealTimers();
		});

		it("should sort medications by urgency", async () => {
			const multipleRegimens = [
				{
					...mockActiveRegimens[0],
					regimen: { ...mockActiveRegimens[0].regimen, id: "due-1" },
				},
				{
					...mockActiveRegimens[0],
					regimen: {
						...mockActiveRegimens[0].regimen,
						id: "later-1",
						timesLocal: ["14:00"],
					},
				},
				{
					...mockActiveRegimens[1], // PRN
				},
			];

			mockDb.orderBy.mockResolvedValueOnce(multipleRegimens);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.listDue({
				householdId: "household-1",
				includeUpcoming: true,
			});

			// Should be sorted: due -> later -> prn
			const sections = result.map((r) => r.section);
			expect(sections).toEqual(["due", "later", "prn"]);
		});

		it("should calculate compliance percentage", async () => {
			mockDb.orderBy.mockResolvedValueOnce(mockActiveRegimens);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.listDue({
				householdId: "household-1",
			});

			// Should have compliance percentage
			result.forEach((regimen) => {
				expect(regimen.compliance).toBeGreaterThanOrEqual(85);
				expect(regimen.compliance).toBeLessThanOrEqual(100);
			});
		});
	});

	describe("list", () => {
		it("should list all regimens for a household", async () => {
			const mockRegimens = [
				{
					regimen: { id: "regimen-1", active: true },
					animal: { id: "animal-1", name: "Buddy" },
					medication: { genericName: "Amoxicillin" },
				},
			];

			mockDb.orderBy.mockResolvedValueOnce(mockRegimens);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.list({
				householdId: "household-1",
			});

			expect(result).toEqual(mockRegimens);
		});

		it("should filter by animal and active status", async () => {
			mockDb.orderBy.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			await caller.list({
				householdId: "household-1",
				animalId: "animal-1",
				activeOnly: true,
			});

			expect(mockDb.where).toHaveBeenCalled();
		});
	});

	describe("getById", () => {
		it("should get a regimen by ID", async () => {
			const mockRegimen = {
				regimen: { id: "regimen-1" },
				animal: { id: "animal-1", householdId: "household-1" },
				medication: { genericName: "Amoxicillin" },
			};

			mockDb.limit.mockResolvedValueOnce([mockRegimen]);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			const result = await caller.getById({
				id: "regimen-1",
				householdId: "household-1",
			});

			expect(result).toEqual(mockRegimen);
		});

		it("should throw error if regimen not found", async () => {
			mockDb.limit.mockResolvedValueOnce([]);

			const ctx = createMockContext();
			const caller = regimenRouter.createCaller(ctx);

			await expect(
				caller.getById({
					id: "regimen-1",
					householdId: "household-1",
				}),
			).rejects.toThrow("Regimen not found");
		});
	});
});
