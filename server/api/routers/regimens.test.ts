import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAuthenticatedContext,
	mockSession,
} from "@/tests/helpers/trpc-utils";
import { regimensRouter } from "./regimens";

describe("regimensRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createRegimen", () => {
		it("should create a new regimen for an animal", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const mockRegimen = {
				id: "regimen-123",
				animalId: "animal-123",
				medicationId: "med-123",
				dosage: "250mg",
				frequency: "BID",
				scheduleType: "FIXED",
				startDate: new Date(),
				endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
				isActive: true,
				notes: "Take with food",
				createdBy: mockSession.subject,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock animal verification
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "animal-123",
								householdId: mockSession.access.householdId,
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock regimen creation
			vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([mockRegimen]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			const result = await caller.createRegimen({
				animalId: "animal-123",
				medicationId: "med-123",
				dosage: "250mg",
				frequency: "BID",
				scheduleType: "FIXED",
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
				notes: "Take with food",
			});

			expect(result).toEqual(mockRegimen);
			expect(ctx.db.insert).toHaveBeenCalled();
		});

		it("should verify animal belongs to household", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			// Mock animal from different household
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "animal-123",
								householdId: "different-household",
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			await expect(
				caller.createRegimen({
					animalId: "animal-123",
					medicationId: "med-123",
					dosage: "250mg",
					frequency: "BID",
					scheduleType: "FIXED",
					startDate: new Date().toISOString(),
					endDate: new Date(
						Date.now() + 10 * 24 * 60 * 60 * 1000,
					).toISOString(),
				}),
			).rejects.toThrow("FORBIDDEN");
		});

		it("should validate end date is after start date", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const startDate = new Date();
			const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // Yesterday

			await expect(
				caller.createRegimen({
					animalId: "animal-123",
					medicationId: "med-123",
					dosage: "250mg",
					frequency: "BID",
					scheduleType: "FIXED",
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
				}),
			).rejects.toThrow("End date must be after start date");
		});

		it("should allow PRN regimens without end date", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const mockPRNRegimen = {
				id: "regimen-prn-123",
				animalId: "animal-123",
				medicationId: "med-123",
				dosage: "5mg",
				frequency: "PRN",
				scheduleType: "PRN",
				startDate: new Date(),
				endDate: null,
				isActive: true,
				notes: "As needed for pain",
				createdBy: mockSession.subject,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock animal verification
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								id: "animal-123",
								householdId: mockSession.access.householdId,
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock regimen creation
			vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						returning: vi.fn().mockResolvedValue([mockPRNRegimen]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			const result = await caller.createRegimen({
				animalId: "animal-123",
				medicationId: "med-123",
				dosage: "5mg",
				frequency: "PRN",
				scheduleType: "PRN",
				startDate: new Date().toISOString(),
				endDate: null,
				notes: "As needed for pain",
			});

			expect(result.scheduleType).toBe("PRN");
			expect(result.endDate).toBeNull();
		});
	});

	describe("updateRegimen", () => {
		it("should update regimen details", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const updatedRegimen = {
				id: "regimen-123",
				animalId: "animal-123",
				medicationId: "med-123",
				dosage: "500mg", // Updated dosage
				frequency: "TID", // Updated frequency
				scheduleType: "FIXED",
				startDate: new Date(),
				endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Extended
				isActive: true,
				notes: "Updated: Take with food and water",
				createdBy: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock finding regimen with animal
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								regimen: {
									id: "regimen-123",
									animalId: "animal-123",
								},
								animal: {
									householdId: mockSession.access.householdId,
								},
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
						returning: vi.fn().mockResolvedValue([updatedRegimen]),
					}) as ReturnType<typeof mockDb.update>,
			);

			const result = await caller.updateRegimen({
				id: "regimen-123",
				dosage: "500mg",
				frequency: "TID",
				endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
				notes: "Updated: Take with food and water",
			});

			expect(result).toEqual(updatedRegimen);
			expect(result.dosage).toBe("500mg");
			expect(result.frequency).toBe("TID");
		});

		it("should log changes in audit log", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			// Mock finding regimen
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								regimen: {
									id: "regimen-123",
									animalId: "animal-123",
									dosage: "250mg",
									frequency: "BID",
								},
								animal: {
									householdId: mockSession.access.householdId,
								},
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
						returning: vi
							.fn()
							.mockResolvedValue([{ dosage: "500mg", frequency: "TID" }]),
					}) as ReturnType<typeof mockDb.select>,
			);

			// Mock audit log
			const auditSpy = vi.spyOn(ctx.db, "insert").mockImplementation(
				() =>
					({
						values: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as ReturnType<typeof mockDb.insert>,
			);

			await caller.updateRegimen({
				id: "regimen-123",
				dosage: "500mg",
				frequency: "TID",
			});

			expect(auditSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "UPDATE_REGIMEN",
					details: expect.objectContaining({
						changes: {
							dosage: { from: "250mg", to: "500mg" },
							frequency: { from: "BID", to: "TID" },
						},
					}),
				}),
			);
		});
	});

	describe("deactivateRegimen", () => {
		it("should deactivate an active regimen", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			// Mock finding active regimen
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								regimen: {
									id: "regimen-123",
									animalId: "animal-123",
									isActive: true,
								},
								animal: {
									householdId: mockSession.access.householdId,
								},
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
						returning: vi.fn().mockResolvedValue([
							{
								id: "regimen-123",
								isActive: false,
								endDate: new Date(),
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			const result = await caller.deactivateRegimen({
				id: "regimen-123",
				reason: "Treatment completed",
			});

			expect(result.isActive).toBe(false);
			expect(result.endDate).toBeDefined();
		});

		it("should not deactivate already inactive regimen", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			// Mock finding inactive regimen
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([
							{
								regimen: {
									id: "regimen-123",
									animalId: "animal-123",
									isActive: false,
								},
								animal: {
									householdId: mockSession.access.householdId,
								},
							},
						]),
					}) as ReturnType<typeof mockDb.select>,
			);

			await expect(
				caller.deactivateRegimen({
					id: "regimen-123",
					reason: "Already inactive",
				}),
			).rejects.toThrow("Regimen is already inactive");
		});
	});

	describe("getAnimalRegimens", () => {
		it("should return all regimens for an animal", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const mockRegimens = [
				{
					id: "regimen-1",
					animalId: "animal-123",
					medicationId: "med-1",
					medicationName: "Amoxicillin",
					dosage: "250mg",
					frequency: "BID",
					scheduleType: "FIXED",
					startDate: new Date(),
					endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
					isActive: true,
					notes: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "regimen-2",
					animalId: "animal-123",
					medicationId: "med-2",
					medicationName: "Prednisone",
					dosage: "5mg",
					frequency: "QD",
					scheduleType: "FIXED",
					startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
					endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
					isActive: false,
					notes: "Completed",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: vi.fn().mockReturnThis(),
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue(mockRegimens),
					}) as ReturnType<typeof mockDb.select>,
			);

			const result = await caller.getAnimalRegimens({
				animalId: "animal-123",
			});

			expect(result).toEqual(mockRegimens);
			expect(result).toHaveLength(2);
		});

		it("should filter by active status if provided", async () => {
			const ctx = await createAuthenticatedContext(mockSession);
			const caller = regimensRouter.createCaller(ctx);

			const whereSpy = vi.fn().mockReturnThis();
			vi.spyOn(ctx.db, "select").mockImplementation(
				() =>
					({
						from: vi.fn().mockReturnThis(),
						leftJoin: vi.fn().mockReturnThis(),
						where: whereSpy,
						orderBy: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([]),
					}) as ReturnType<typeof mockDb.select>,
			);

			await caller.getAnimalRegimens({
				animalId: "animal-123",
				activeOnly: true,
			});

			expect(whereSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					animalId: "animal-123",
					isActive: true,
				}),
			);
		});
	});
});
