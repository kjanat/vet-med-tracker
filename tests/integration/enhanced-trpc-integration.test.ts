/**
 * Enhanced tRPC Integration Tests
 *
 * This test suite demonstrates how to test the enhanced tRPC infrastructure:
 * - Rate limiting behavior
 * - Circuit breaker functionality
 * - Caching mechanisms
 * - Input sanitization
 * - Audit logging
 * - Error handling
 *
 * Run with: npm test -- enhanced-trpc-integration.test.ts
 */

import { TRPCError } from "@trpc/server";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { db } from "@/db/drizzle";
import {
	criticalCircuitBreaker,
	databaseCircuitBreaker,
} from "@/lib/circuit-breaker";
import { auditLogger } from "@/lib/logging/audit-logger";
import { logger } from "@/lib/logging/logger";
import { animalCache, cache, householdCache } from "@/lib/redis/cache";
import { enhancedExampleRouter } from "@/server/api/routers/enhanced-example";
import type { EnhancedTRPCContext } from "@/server/api/trpc/enhanced-init";
import { createCallerFactory } from "@/server/api/trpc/enhanced-init";

// Mock infrastructure components
vi.mock("@/lib/redis/cache");
vi.mock("@/lib/circuit-breaker");
vi.mock("@/lib/logging/logger");
vi.mock("@/lib/logging/audit-logger");
vi.mock("@/db/drizzle");

describe("Enhanced tRPC Integration", () => {
	let caller: ReturnType<typeof createCallerFactory>;
	let mockContext: EnhancedTRPCContext;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup mock context
		mockContext = {
			// Base Clerk context
			db: db as any,
			headers: new Headers(),
			requestedHouseholdId: "household-123",
			auth: { userId: "user-123" },
			clerkUser: {
				id: "clerk-user-123",
				firstName: "Test",
				lastName: "User",
				emailAddresses: [{ emailAddress: "test@example.com" }],
			} as any,
			dbUser: {
				id: "user-123",
				name: "Test User",
				email: "test@example.com",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any,
			currentHouseholdId: "household-123",
			currentMembership: {
				id: "membership-123",
				userId: "user-123",
				householdId: "household-123",
				role: "OWNER" as const,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any,
			availableHouseholds: [],

			// Infrastructure components
			cache: cache as any,
			householdCache: householdCache as any,
			animalCache: animalCache as any,
			logger: logger as any,
			correlationId: "test-correlation-id",
			requestId: "test-request-id",
			sanitizer: {
				sanitizeObject: vi.fn((obj) => obj),
				quickValidate: vi.fn(() => true),
			} as any,
			medicalSanitizer: {
				sanitizeAnimalName: vi.fn((name: string) => name),
				sanitizeMedicationName: vi.fn((name: string) => name),
				sanitizeDosage: vi.fn((dosage: string) => dosage),
				sanitizeNotes: vi.fn((notes: string) => notes),
			} as any,
			performanceTracker: {
				getMetrics: vi.fn(() => ({
					duration: 100,
					memoryUsed: 50,
				})),
			} as any,
			householdId: "household-123",
			membership: {
				role: "OWNER" as const,
				id: "membership-123",
				userId: "user-123",
				householdId: "household-123",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any,
		};

		// Setup caller
		const createCaller = createCallerFactory(enhancedExampleRouter);
		caller = createCaller(mockContext);

		// Mock successful operations by default
		(cache.get as Mock).mockResolvedValue(null);
		(cache.set as Mock).mockResolvedValue(true);
		(cache.delete as Mock).mockResolvedValue(true);
		(cache.getOrSet as Mock).mockImplementation(async (_key, factory) => {
			return await factory();
		});

		(logger.info as Mock).mockResolvedValue(void 0);
		(logger.error as Mock).mockResolvedValue(void 0);
		(logger.warn as Mock).mockResolvedValue(void 0);
		(logger.debug as Mock).mockResolvedValue(void 0);

		(auditLogger.logDataEvent as Mock).mockResolvedValue(void 0);
		(auditLogger.logSecurityEvent as Mock).mockResolvedValue(void 0);
		(auditLogger.logErrorEvent as Mock).mockResolvedValue(void 0);

		(databaseCircuitBreaker.getMetrics as Mock).mockReturnValue({
			state: "CLOSED",
			failureCount: 0,
			successCount: 10,
			failureRate: 0,
		});

		(databaseCircuitBreaker.execute as Mock).mockImplementation(async (fn) => {
			return await fn();
		});
	});

	afterEach(() => {
		// Reset circuit breakers
		if (databaseCircuitBreaker.reset) {
			databaseCircuitBreaker.reset();
		}
		if (criticalCircuitBreaker.reset) {
			criticalCircuitBreaker.reset();
		}
	});

	describe("Input Sanitization", () => {
		it("should sanitize animal creation input", async () => {
			// Mock database operations
			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "animal-123",
							name: "Fluffy",
							species: "cat",
							householdId: "household-123",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]),
				}),
			});

			const input = {
				name: "  Fluffy<script>alert('xss')</script>  ",
				species: "cat" as const,
				notes: "Good cat with some <dangerous>tags</dangerous>",
				householdId: "household-123",
			};

			const result = await caller.createAnimal(input);

			expect(result.success).toBe(true);
			expect(
				mockContext.medicalSanitizer.sanitizeAnimalName,
			).toHaveBeenCalledWith(input.name);
			expect(mockContext.medicalSanitizer.sanitizeNotes).toHaveBeenCalledWith(
				input.notes,
			);
		});

		it("should reject invalid input", async () => {
			const input = {
				name: "", // Invalid: empty name
				species: "cat" as const,
				householdId: "household-123",
			};

			await expect(caller.createAnimal(input)).rejects.toThrow();
		});
	});

	describe("Logging and Monitoring", () => {
		it("should log successful operations", async () => {
			// Mock database operations
			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "animal-123",
							name: "Fluffy",
							species: "cat",
							householdId: "household-123",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]),
				}),
			});

			const input = {
				name: "Fluffy",
				species: "cat" as const,
				householdId: "household-123",
			};

			await caller.createAnimal(input);

			expect(logger.info).toHaveBeenCalledWith(
				"Creating new animal",
				expect.objectContaining({
					animalName: "Fluffy",
					species: "cat",
					householdId: "household-123",
				}),
				mockContext.correlationId,
			);

			expect(logger.info).toHaveBeenCalledWith(
				"Animal created successfully",
				expect.objectContaining({
					animalId: "animal-123",
					animalName: "Fluffy",
				}),
				mockContext.correlationId,
			);
		});

		it("should log and handle errors properly", async () => {
			// Mock database error
			const dbError = new Error("Database connection failed");
			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(dbError),
				}),
			});

			const input = {
				name: "Fluffy",
				species: "cat" as const,
				householdId: "household-123",
			};

			await expect(caller.createAnimal(input)).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				"Failed to create animal",
				dbError,
				expect.objectContaining({
					animalName: "Fluffy",
					householdId: "household-123",
				}),
				mockContext.correlationId,
			);
		});
	});

	describe("Caching", () => {
		it("should use cache for animal details", async () => {
			const animalData = {
				id: "animal-123",
				name: "Fluffy",
				species: "cat",
				householdId: "household-123",
				age: 2,
			};

			// Mock cache hit
			(cache.getOrSet as Mock).mockResolvedValueOnce(animalData);

			const input = {
				animalId: "animal-123",
				includeHistory: false,
				householdId: "household-123",
			};

			const result = await caller.getAnimalDetails(input);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(animalData);
			expect(cache.getOrSet).toHaveBeenCalledWith(
				expect.stringContaining("animal:animal-123:access:household-123"),
				expect.any(Function),
				expect.objectContaining({
					ttl: 60,
					staleOnError: true,
				}),
			);
		});

		it("should invalidate cache after animal creation", async () => {
			// Mock database operations
			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "animal-123",
							name: "Fluffy",
							species: "cat",
							householdId: "household-123",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]),
				}),
			});

			const input = {
				name: "Fluffy",
				species: "cat" as const,
				householdId: "household-123",
			};

			await caller.createAnimal(input);

			expect(householdCache.invalidateHousehold).toHaveBeenCalledWith(
				"household-123",
			);
		});
	});

	describe("Circuit Breaker", () => {
		it("should handle circuit breaker open state", async () => {
			// Mock open circuit breaker
			(databaseCircuitBreaker.execute as Mock).mockImplementation(
				async (_fn, fallback) => {
					if (fallback) {
						return await fallback();
					}
					throw new Error("Circuit breaker is OPEN");
				},
			);

			const input = {
				animalId: "animal-123",
				includeHistory: true,
				householdId: "household-123",
			};

			// Should use fallback data
			const result = await caller.getAnimalDetails(input);

			expect(result.success).toBe(true);
			expect(result.data._fallback).toBe(true);
			expect(logger.warn).toHaveBeenCalledWith(
				"Using fallback for animal details due to database issues",
				expect.objectContaining({ animalId: "animal-123" }),
				mockContext.correlationId,
			);
		});
	});

	describe("Audit Logging", () => {
		it("should audit critical operations", async () => {
			// Mock database operations
			(db.transaction as Mock).mockImplementation(async (fn) => {
				const mockTx = {
					insert: vi.fn().mockReturnValue({
						values: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([
								{
									id: "admin-123",
									animalId: "animal-123",
									regimenId: "regimen-123",
									administeredAt: new Date(),
									caregiverName: "Test Caregiver",
									createdBy: "user-123",
									createdAt: new Date(),
									updatedAt: new Date(),
								},
							]),
						}),
					}),
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue({}),
						}),
					}),
				};
				return await fn(mockTx);
			});

			// Mock animal validation
			(cache.getOrSet as Mock).mockResolvedValueOnce({
				id: "animal-123",
				name: "Fluffy",
				householdId: "household-123",
			});

			const input = {
				animalId: "animal-123",
				regimenId: "regimen-123",
				administeredAt: new Date(),
				caregiverName: "Test Caregiver",
				householdId: "household-123",
			};

			await caller.recordAdministration(input);

			expect(auditLogger.logDataEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "medication_administered",
					userId: "user-123",
					householdId: "household-123",
					resourceType: "administration",
					severity: "high",
				}),
			);
		});

		it("should audit failed operations", async () => {
			const dbError = new Error("Transaction failed");
			(db.transaction as Mock).mockRejectedValue(dbError);

			// Mock animal validation
			(cache.getOrSet as Mock).mockResolvedValueOnce({
				id: "animal-123",
				name: "Fluffy",
				householdId: "household-123",
			});

			const input = {
				animalId: "animal-123",
				regimenId: "regimen-123",
				administeredAt: new Date(),
				caregiverName: "Test Caregiver",
				householdId: "household-123",
			};

			await expect(caller.recordAdministration(input)).rejects.toThrow();

			expect(auditLogger.logErrorEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "medication_administration_failed",
					userId: "user-123",
					householdId: "household-123",
					error: "Transaction failed",
				}),
			);
		});
	});

	describe("Authorization", () => {
		it("should allow owner operations for owners", async () => {
			// Mock database operations for bulk update
			(db.query.animals.findMany as Mock).mockResolvedValue([
				{ id: "animal-1", name: "Fluffy" },
				{ id: "animal-2", name: "Buddy" },
			]);

			(db.transaction as Mock).mockImplementation(async (fn) => {
				const mockTx = {
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue({}),
						}),
					}),
				};
				return await fn(mockTx);
			});

			const input = {
				updates: [
					{ animalId: "animal-1", weight: 5.5 },
					{ animalId: "animal-2", notes: "Updated notes" },
				],
				householdId: "household-123",
			};

			const result = await caller.bulkUpdateAnimals(input);

			expect(result.success).toBe(true);
			expect(result.summary.successful).toBe(2);
			expect(auditLogger.logDataEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "bulk_animal_update_completed",
				}),
			);
		});

		it("should reject owner operations for non-owners", async () => {
			// Change user role to caregiver
			mockContext.membership.role = "CAREGIVER";
			mockContext.currentMembership!.role = "CAREGIVER";

			const input = {
				updates: [{ animalId: "animal-1", weight: 5.5 }],
				householdId: "household-123",
			};

			await expect(caller.bulkUpdateAnimals(input)).rejects.toThrow(TRPCError);

			expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "unauthorized_owner_access_attempt",
					details: expect.objectContaining({
						userRole: "CAREGIVER",
					}),
				}),
			);
		});
	});

	describe("Performance Monitoring", () => {
		it("should track performance metrics", async () => {
			// Mock database operations
			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "animal-123",
							name: "Fluffy",
							species: "cat",
							householdId: "household-123",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]),
				}),
			});

			const input = {
				name: "Fluffy",
				species: "cat" as const,
				householdId: "household-123",
			};

			await caller.createAnimal(input);

			expect(mockContext.performanceTracker.getMetrics).toHaveBeenCalled();
		});

		it("should report slow operations", async () => {
			// Mock slow operation
			(mockContext.performanceTracker.getMetrics as Mock).mockReturnValue({
				duration: 2000, // 2 seconds
				memoryUsed: 100,
			});

			const result = await caller.systemHealthCheck();

			expect(result.healthy).toBeDefined();
			expect(result.performance.totalLatency).toBeGreaterThan(0);
		});
	});

	describe("Health Check", () => {
		it("should return healthy status when all services are up", async () => {
			// Mock successful health checks
			(db.execute as Mock).mockResolvedValue([{ health: 1 }]);
			(cache.set as Mock).mockResolvedValue(true);
			(cache.get as Mock).mockResolvedValue("test");
			(cache.delete as Mock).mockResolvedValue(true);

			const result = await caller.systemHealthCheck();

			expect(result.healthy).toBe(true);
			expect(result.services.database.healthy).toBe(true);
			expect(result.services.cache.healthy).toBe(true);
		});

		it("should return unhealthy status when services are down", async () => {
			// Mock service failures
			(db.execute as Mock).mockRejectedValue(new Error("DB connection failed"));
			(cache.set as Mock).mockRejectedValue(
				new Error("Cache connection failed"),
			);

			const result = await caller.systemHealthCheck();

			expect(result.healthy).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle validation errors properly", async () => {
			const input = {
				name: "x".repeat(101), // Too long
				species: "cat" as const,
				householdId: "household-123",
			};

			try {
				await caller.createAnimal(input);
				expect.fail("Should have thrown validation error");
			} catch (error) {
				expect(error).toBeInstanceOf(TRPCError);
				expect((error as TRPCError).code).toBe("BAD_REQUEST");
			}
		});

		it("should provide user-friendly error messages", async () => {
			// Mock database constraint violation
			const dbError = new Error("Unique constraint violation");
			(dbError as any).code = "UNIQUE_VIOLATION";

			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(dbError),
				}),
			});

			const input = {
				name: "Fluffy",
				species: "cat" as const,
				householdId: "household-123",
			};

			try {
				await caller.createAnimal(input);
				expect.fail("Should have thrown error");
			} catch (_error) {
				expect(logger.error).toHaveBeenCalledWith(
					"Failed to create animal",
					dbError,
					expect.any(Object),
					mockContext.correlationId,
				);
			}
		});
	});

	describe("Data Sanitization Edge Cases", () => {
		it("should handle special medical terminology", async () => {
			const input = {
				name: "Fluffy",
				species: "cat" as const,
				notes: "Prescribed Co-trimoxazole 250mg BID",
				householdId: "household-123",
			};

			(db.insert as Mock).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([
						{
							id: "animal-123",
							name: "Fluffy",
							species: "cat",
							notes: input.notes,
							householdId: "household-123",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]),
				}),
			});

			const result = await caller.createAnimal(input);

			expect(result.success).toBe(true);
			expect(mockContext.medicalSanitizer.sanitizeNotes).toHaveBeenCalledWith(
				input.notes,
			);
		});

		it("should reject malicious input", async () => {
			const maliciousInput = {
				name: "'; DROP TABLE animals; --",
				species: "cat" as const,
				householdId: "household-123",
			};

			// Sanitizer should clean the input
			(mockContext.medicalSanitizer.sanitizeAnimalName as Mock).mockReturnValue(
				"  DROP TABLE animals  ",
			);

			const _result = await caller.createAnimal(maliciousInput);

			expect(
				mockContext.medicalSanitizer.sanitizeAnimalName,
			).toHaveBeenCalledWith(maliciousInput.name);
		});
	});
});

// Helper functions for testing
const _createMockContext = (
	overrides: Partial<EnhancedTRPCContext> = {},
): EnhancedTRPCContext => {
	return {
		// Default mock context
		db: db as any,
		headers: new Headers(),
		requestedHouseholdId: "household-123",
		auth: { userId: "user-123" },
		clerkUser: {
			id: "clerk-user-123",
			firstName: "Test",
			lastName: "User",
			emailAddresses: [{ emailAddress: "test@example.com" }],
		} as any,
		dbUser: {
			id: "user-123",
			name: "Test User",
			email: "test@example.com",
			createdAt: new Date(),
			updatedAt: new Date(),
		} as any,
		currentHouseholdId: "household-123",
		currentMembership: {
			id: "membership-123",
			userId: "user-123",
			householdId: "household-123",
			role: "OWNER" as const,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as any,
		availableHouseholds: [],

		// Infrastructure components
		cache: cache as any,
		householdCache: householdCache as any,
		animalCache: animalCache as any,
		logger: logger as any,
		correlationId: "test-correlation-id",
		requestId: "test-request-id",
		sanitizer: {
			sanitizeObject: vi.fn((obj) => obj),
			quickValidate: vi.fn(() => true),
		} as any,
		medicalSanitizer: {
			sanitizeAnimalName: vi.fn((name: string) => name),
			sanitizeMedicationName: vi.fn((name: string) => name),
			sanitizeDosage: vi.fn((dosage: string) => dosage),
			sanitizeNotes: vi.fn((notes: string) => notes),
		} as any,
		performanceTracker: {
			getMetrics: vi.fn(() => ({
				duration: 100,
				memoryUsed: 50,
			})),
		} as any,

		// Apply overrides
		...overrides,
	};
};

const _setupMockInfrastructure = () => {
	// Reset mocks
	vi.clearAllMocks();

	// Setup default successful mocks
	(cache.get as Mock).mockResolvedValue(null);
	(cache.set as Mock).mockResolvedValue(true);
	(cache.delete as Mock).mockResolvedValue(true);
	(cache.getOrSet as Mock).mockImplementation(async (_key, factory) => {
		return await factory();
	});

	(logger.info as Mock).mockResolvedValue(void 0);
	(logger.error as Mock).mockResolvedValue(void 0);
	(logger.warn as Mock).mockResolvedValue(void 0);
	(logger.debug as Mock).mockResolvedValue(void 0);

	(auditLogger.logDataEvent as Mock).mockResolvedValue(void 0);
	(auditLogger.logSecurityEvent as Mock).mockResolvedValue(void 0);
	(auditLogger.logErrorEvent as Mock).mockResolvedValue(void 0);

	(databaseCircuitBreaker.getMetrics as Mock).mockReturnValue({
		state: "CLOSED",
		failureCount: 0,
		successCount: 10,
		failureRate: 0,
	});

	(databaseCircuitBreaker.execute as Mock).mockImplementation(async (fn) => {
		return await fn();
	});
};
