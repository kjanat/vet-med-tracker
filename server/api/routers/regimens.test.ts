import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAuthenticatedContext,
	mockSession,
} from "@/tests/helpers/trpc-utils";
import { regimenRouter } from "./regimens";

describe("regimenRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("list", () => {
		it("should list all regimens for a household", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimenRouter.createCaller(ctx);

			const mockRegimens = [
				{
					regimen: {
						id: "regimen-1",
						animalId: "animal-1",
						medicationId: "med-1",
						scheduleType: "FIXED",
						timesLocal: ["08:00", "18:00"],
						active: true,
						startDate: "2025-01-01",
						endDate: null,
						cutoffMinutes: 240,
						highRisk: false,
						requiresCoSign: false,
						dose: "1 tablet",
						route: "oral",
						instructions: null,
						prnReason: null,
						createdAt: new Date(),
						updatedAt: new Date(),
						deletedAt: null,
					},
					animal: {
						id: "animal-1",
						name: "Buddy",
						species: "dog",
						householdId: mockSession.access.householdId,
					},
					medication: {
						id: "med-1",
						genericName: "Amoxicillin",
						brandName: null,
						route: "oral",
						form: "tablet",
						strength: "250mg",
					},
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						innerJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockRegimens),
					}) as any,
			);

			const result = await caller.list({
				householdId: mockSession.access.householdId,
			});

			expect(result).toEqual(mockRegimens);
			expect(result).toHaveLength(1);
		});

		it("should filter by animalId if provided", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimenRouter.createCaller(ctx);

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

			await caller.list({
				householdId: mockSession.access.householdId,
				animalId: "animal-123",
			});

			expect(whereSpy).toHaveBeenCalled();
		});
	});

	describe("listDue", () => {
		it("should list due medications", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimenRouter.createCaller(ctx);

			const mockActiveRegimens = [
				{
					regimen: {
						id: "regimen-1",
						scheduleType: "FIXED",
						timesLocal: ["08:00", "18:00"],
						route: "oral",
						dose: "1 tablet",
						highRisk: false,
						requiresCoSign: false,
						instructions: null,
						prnReason: null,
						cutoffMinutes: 240,
					},
					animal: {
						id: "animal-1",
						name: "Buddy",
						species: "dog",
						photoUrl: null,
						timezone: "America/New_York",
					},
					medication: {
						genericName: "Amoxicillin",
						brandName: null,
						route: "oral",
						form: "tablet",
						strength: "250mg",
					},
					lastAdmin: null,
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						innerJoin: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockActiveRegimens),
					}) as any,
			);

			const result = await caller.listDue({
				householdId: mockSession.access.householdId,
			});

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("getById", () => {
		it("should get a single regimen by ID", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimenRouter.createCaller(ctx);

			const mockRegimen = {
				regimen: {
					id: "regimen-123",
					animalId: "animal-123",
					medicationId: "med-123",
					scheduleType: "FIXED",
					timesLocal: ["08:00", "18:00"],
					active: true,
					startDate: "2025-01-01",
					endDate: null,
					cutoffMinutes: 240,
					highRisk: false,
					requiresCoSign: false,
					dose: "1 tablet",
					route: "oral",
					instructions: null,
					prnReason: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					deletedAt: null,
				},
				animal: {
					id: "animal-123",
					name: "Buddy",
					species: "dog",
					householdId: mockSession.access.householdId,
				},
				medication: {
					id: "med-123",
					genericName: "Amoxicillin",
					brandName: null,
					route: "oral",
					form: "tablet",
					strength: "250mg",
				},
			};

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						innerJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([mockRegimen]),
					}) as any,
			);

			const result = await caller.getById({
				id: "regimen-123",
				householdId: mockSession.access.householdId,
			});

			expect(result).toEqual(mockRegimen);
		});

		it("should throw NOT_FOUND if regimen doesn't exist", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimenRouter.createCaller(ctx);

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						innerJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as any,
			);

			await expect(
				caller.getById({
					id: "non-existent",
					householdId: mockSession.access.householdId,
				}),
			).rejects.toThrow("NOT_FOUND");
		});
	});
});
