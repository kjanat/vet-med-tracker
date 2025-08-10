/**
 * Unit tests for admin tRPC router
 * Tests medication administration procedures with household permissions
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRouter } from "@/server/api/routers/admin";
import { mockDb, resetMockDb } from "@/tests/helpers/mock-db";
import {
	testAdministration,
	testAnimal,
	testConfig,
	testRegimen,
} from "@/tests/helpers/test-fixtures";
import {
	createAuthenticatedContext,
	createMockContext,
	mockSession,
} from "@/tests/helpers/trpc-utils";

describe("adminRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetMockDb();
	});

	describe("create", () => {
		const validInput = {
			animalId: testAnimal.id,
			regimenId: testRegimen.id,
			recordedAt: new Date("2023-06-15T12:00:00Z"),
			status: "ON_TIME" as const,
			dose: "250mg",
			notes: "Given with breakfast",
			adverseEvent: false,
			idempotencyKey: "test-key-123",
		};

		it("should create administration for authenticated user", async () => {
			// Mock animal verification
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{
						id: testAnimal.id,
						householdId: testConfig.mockSession.access.householdId,
						timezone: "America/New_York",
					},
				]),
			});

			// Mock regimen verification
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{
						id: testRegimen.id,
						householdId: testConfig.mockSession.access.householdId,
						isActive: true,
						dose: "250mg",
						frequency: "BID",
					},
				]),
			});

			// Mock idempotency check
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			// Mock insertion
			mockDb.insert.mockReturnValueOnce({
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([testAdministration]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.create(validInput);

			expect(result).toEqual(testAdministration);
			expect(mockDb.insert).toHaveBeenCalled();
		});

		it("should reject unauthenticated requests", async () => {
			const ctx = createMockContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
			await expect(caller.create(validInput)).rejects.toThrow("UNAUTHORIZED");
		});

		it("should reject animal from different household", async () => {
			// Mock animal from different household
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{
						id: testAnimal.id,
						householdId: "different-household-id",
						timezone: "America/New_York",
					},
				]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
			await expect(caller.create(validInput)).rejects.toThrow(
				"Animal not found or access denied",
			);
		});

		it("should prevent duplicate administrations with same idempotency key", async () => {
			// Mock existing administration with same key
			mockDb.select
				.mockReturnValueOnce({
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([
						{
							id: testAnimal.id,
							householdId: testConfig.mockSession.access.householdId,
							timezone: "America/New_York",
						},
					]),
				})
				.mockReturnValueOnce({
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([
						{
							id: testRegimen.id,
							householdId: testConfig.mockSession.access.householdId,
							isActive: true,
						},
					]),
				})
				.mockReturnValueOnce({
					from: vi.fn().mockReturnThis(),
					where: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					execute: vi.fn().mockResolvedValue([testAdministration]), // Existing record
				});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.create(validInput);

			// Should return existing record without creating new one
			expect(result).toEqual(testAdministration);
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it("should validate required fields", async () => {
			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(
				caller.create({
					...validInput,
					animalId: "",
				}),
			).rejects.toThrow("String must contain at least 1 character(s)");

			await expect(
				caller.create({
					...validInput,
					dose: "",
				}),
			).rejects.toThrow("String must contain at least 1 character(s)");

			await expect(
				caller.create({
					...validInput,
					idempotencyKey: "",
				}),
			).rejects.toThrow("String must contain at least 1 character(s)");
		});

		it("should validate status enum values", async () => {
			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(
				caller.create({
					...validInput,
					status: "INVALID_STATUS" as any,
				}),
			).rejects.toThrow();
		});

		it("should handle database errors gracefully", async () => {
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				execute: vi
					.fn()
					.mockRejectedValue(new Error("Database connection failed")),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(caller.create(validInput)).rejects.toThrow(
				"Database connection failed",
			);
		});
	});

	describe("list", () => {
		it("should list administrations for household", async () => {
			const mockAdministrations = [
				testAdministration,
				{
					...testAdministration,
					id: "another-admin-id",
					recordedAt: new Date("2023-06-14T12:00:00Z"),
				},
			];

			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue(mockAdministrations),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.list({
				limit: 10,
				offset: 0,
			});

			expect(result).toEqual(mockAdministrations);
			expect(mockDb.select).toHaveBeenCalled();
		});

		it("should filter by animal ID", async () => {
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockImplementation(() => {
					// Verify that animal filter is applied
					return {
						orderBy: vi.fn().mockReturnThis(),
						limit: vi.fn().mockReturnThis(),
						offset: vi.fn().mockReturnThis(),
						execute: vi.fn().mockResolvedValue([testAdministration]),
					};
				}),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([testAdministration]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.list({
				animalId: testAnimal.id,
				limit: 10,
				offset: 0,
			});

			expect(result).toEqual([testAdministration]);
		});

		it("should filter by date range", async () => {
			const startDate = new Date("2023-06-01");
			const endDate = new Date("2023-06-30");

			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([testAdministration]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.list({
				startDate,
				endDate,
				limit: 10,
				offset: 0,
			});

			expect(result).toEqual([testAdministration]);
		});
	});

	// Update procedure doesn't exist in the current implementation
	// Could be added in future if needed

	describe("delete", () => {
		it("should delete administration", async () => {
			// Mock existing record check
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([testAdministration]),
			});

			// Mock delete operation
			mockDb.delete.mockReturnValueOnce({
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([testAdministration]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.delete({
				householdId: testConfig.mockSession.access.householdId,
				recordId: testAdministration.id,
			});

			expect(result).toEqual(testAdministration);
			expect(mockDb.delete).toHaveBeenCalled();
		});

		it("should reject delete of non-existent administration", async () => {
			mockDb.select.mockReturnValueOnce({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			await expect(
				caller.delete({
					householdId: testConfig.mockSession.access.householdId,
					recordId: "non-existent-id",
				}),
			).rejects.toThrow(TRPCError);
			await expect(
				caller.delete({
					householdId: testConfig.mockSession.access.householdId,
					recordId: "non-existent-id",
				}),
			).rejects.toThrow("Administration not found");
		});
	});

	describe("recordBulk", () => {
		const validBulkInput = {
			householdId: testConfig.mockSession.access.householdId,
			animalIds: [testAnimal.id],
			regimenId: testRegimen.id,
			administeredAt: new Date("2023-06-15T12:00:00Z").toISOString(),
			idempotencyKey: "bulk-test-123",
		};

		it("should record bulk administrations", async () => {
			// Mock animal verification
			mockDb.select.mockReturnValue({
				from: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				leftJoin: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				offset: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue([
					{
						id: testAnimal.id,
						name: testAnimal.name,
						householdId: testConfig.mockSession.access.householdId,
						timezone: "America/New_York",
					},
				]),
			});

			const ctx = createAuthenticatedContext();
			const caller = adminRouter.createCaller(ctx);

			const result = await caller.recordBulk(validBulkInput);

			expect(result.summary.total).toBe(1);
			expect(mockDb.select).toHaveBeenCalled();
		});
	});
});
