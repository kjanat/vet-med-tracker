/**
 * Enhanced Example Router - Comprehensive Infrastructure Integration
 *
 * This router demonstrates how to use all the enhanced infrastructure features:
 * - Rate limiting for different operation types
 * - Circuit breakers for database resilience
 * - Structured logging with correlation IDs
 * - Caching for performance optimization
 * - Input sanitization and validation
 * - Audit logging for compliance
 * - Error handling with user-friendly messages
 * - Performance monitoring
 *
 * Each procedure shows different patterns and use cases.
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
// Database imports (example - adjust based on your schema)
import type { db } from "@/db/drizzle";
import {
	vetmedAdministrations as administrations,
	vetmedAnimals as animals,
} from "@/db/schema";
import {
	databaseCircuitBreaker,
	withCircuitBreaker,
} from "@/lib/circuit-breaker";
import {
	AuditEventType,
	AuditSeverity,
	auditLogger,
} from "@/lib/logging/audit-logger";
// Infrastructure imports
import { rateLimitCriticalOperation } from "@/lib/redis/rate-limit";
// Enhanced tRPC initialization
import {
	createCachedQueryProcedure,
	createTRPCRouter,
	criticalOperationProcedure,
	type EnhancedTRPCContext,
	enhancedHouseholdProcedure,
	enhancedOwnerProcedure,
	enhancedProtectedProcedure,
	withEnhancedDatabaseOperation,
} from "@/server/api/trpc/enhanced-init";

/**
 * Input validation schemas with sanitization rules
 */
const CreateAnimalInput = z.object({
	name: z
		.string()
		.min(1, "Animal name is required")
		.max(100, "Animal name must be less than 100 characters")
		.transform((val) => val.trim()), // Built-in sanitization
	species: z.enum(["dog", "cat", "rabbit", "bird", "other"]),
	breed: z
		.string()
		.max(100, "Breed must be less than 100 characters")
		.optional()
		.transform((val) => val?.trim()),
	dateOfBirth: z.date().optional(),
	weight: z
		.number()
		.positive("Weight must be positive")
		.max(1000, "Weight seems unrealistic")
		.optional(),
	notes: z
		.string()
		.max(1000, "Notes must be less than 1000 characters")
		.optional()
		.transform((val) => val?.trim()),
	householdId: z.string().uuid(),
});

const RecordAdministrationInput = z.object({
	animalId: z.string().uuid(),
	regimenId: z.string().uuid(),
	administeredAt: z.date(),
	notes: z
		.string()
		.max(500, "Notes must be less than 500 characters")
		.optional()
		.transform((val) => val?.trim()),
	caregiverName: z
		.string()
		.min(1, "Caregiver name is required")
		.max(100, "Caregiver name must be less than 100 characters")
		.transform((val) => val.trim()),
	householdId: z.string().uuid(),
});

const GetAnimalDetailsInput = z.object({
	animalId: z.string().uuid(),
	includeHistory: z.boolean().default(false),
	householdId: z.string().uuid(),
});

const BulkUpdateAnimalsInput = z.object({
	updates: z
		.array(
			z.object({
				animalId: z.string().uuid(),
				weight: z.number().positive().optional(),
				notes: z.string().max(1000).optional(),
			}),
		)
		.min(1)
		.max(50), // Limit bulk operations
	householdId: z.string().uuid(),
});

/**
 * Helper functions for common operations
 */
async function validateAnimalAccess(
	ctx: EnhancedTRPCContext,
	animalId: string,
	householdId: string,
) {
	// Check animal exists and belongs to household with caching
	const cacheKey = `animal:${animalId}:access:${householdId}`;

	return ctx.cache.getOrSet(
		cacheKey,
		async () => {
			const animal = await withEnhancedDatabaseOperation(
				ctx,
				"select",
				"animals",
				async () => {
					return ctx.db.query.animals.findFirst({
						where: and(
							eq(animals.id, animalId),
							eq(animals.householdId, householdId),
						),
					});
				},
			);

			if (!animal) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Animal not found or access denied",
				});
			}

			return animal;
		},
		{ ttl: 60, staleOnError: true }, // 1 minute cache with stale fallback
	);
}

/**
 * Helper functions to reduce complexity in recordAdministration
 */
async function validateAdministrationInput(
	ctx: EnhancedTRPCContext,
	input: z.infer<typeof RecordAdministrationInput>,
) {
	// Validate animal access first
	const animal = await validateAnimalAccess(
		ctx,
		input.animalId,
		input.householdId,
	);

	// Additional rate limiting for medication recording (core business operation)
	const rateLimitResult = await rateLimitCriticalOperation(
		"administration",
		`${ctx.auth?.userId || "anonymous"}:${input.animalId}`,
		{ isAdmin: ctx.currentMembership?.role === "OWNER" },
	);

	if (!rateLimitResult.success) {
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: `Too many administration records. Please wait ${rateLimitResult.retryAfter} seconds.`,
		});
	}

	return { animal, rateLimitResult };
}

function sanitizeAdministrationInput(
	ctx: EnhancedTRPCContext,
	input: z.infer<typeof RecordAdministrationInput>,
) {
	return {
		...input,
		notes: input.notes
			? ctx.medicalSanitizer.sanitizeNotes(input.notes)
			: undefined,
		caregiverName: ctx.medicalSanitizer.sanitizeAnimalName(input.caregiverName),
	};
}

async function createAdministrationRecord(
	ctx: EnhancedTRPCContext,
	input: z.infer<typeof RecordAdministrationInput>,
	sanitizedInput: ReturnType<typeof sanitizeAdministrationInput>,
) {
	return await withEnhancedDatabaseOperation(
		ctx,
		"insert",
		"administrations",
		async () => {
			// Start a transaction for data consistency
			return ctx.db.transaction(async (tx) => {
				// Insert the administration record
				const [newAdministration] = await tx
					.insert(administrations)
					.values({
						animalId: input.animalId,
						regimenId: input.regimenId,
						householdId: input.householdId,
						caregiverId: ctx.dbUser?.id || "",
						recordedAt: sanitizedInput.administeredAt.toISOString(),
						status: "ON_TIME" as const,
						notes: sanitizedInput.notes,
						idempotencyKey: `${input.animalId}:${input.regimenId}:${new Date().toISOString()}`,
					})
					.returning();

				return newAdministration;
			});
		},
	);
}

async function handleAdministrationSuccess(
	ctx: EnhancedTRPCContext,
	input: z.infer<typeof RecordAdministrationInput>,
	animal: typeof animals.$inferSelect,
	sanitizedInput: ReturnType<typeof sanitizeAdministrationInput>,
	administration: unknown,
) {
	// Comprehensive audit logging for medication administration
	await auditLogger.logEvent({
		eventType: AuditEventType.MEDICATION_ADMINISTERED,
		severity: AuditSeverity.HIGH,
		userId: ctx.auth?.userId || "",
		householdId: ctx.currentHouseholdId || "",
		targetId: (administration as { id?: string })?.id || "",
		targetType: "administration",
		metadata: {
			animalId: input.animalId,
			animalName: animal?.name || "",
			regimenId: input.regimenId,
			administeredAt: sanitizedInput.administeredAt.toISOString(),
			caregiverName: sanitizedInput.caregiverName,
			hasNotes: !!sanitizedInput.notes,
			correlationId: ctx.correlationId,
		},
	});

	// Invalidate relevant caches
	const cacheInvalidations = [
		ctx.animalCache.invalidateAnimal(input.animalId),
		ctx.cache.delete(`regimen:${input.regimenId}:status`),
	];
	if (ctx.currentHouseholdId) {
		cacheInvalidations.push(
			ctx.cache.delete(`household:${ctx.currentHouseholdId}:pending-meds`),
		);
	}
	await Promise.all(cacheInvalidations);

	// Log successful completion
	await ctx.logger.info(
		"Medication administration recorded successfully",
		{
			administrationId: (administration as { id?: string })?.id || "",
			animalId: input.animalId,
			regimenId: input.regimenId,
		},
		ctx.correlationId,
	);
}

async function handleAdministrationError(
	ctx: EnhancedTRPCContext,
	input: z.infer<typeof RecordAdministrationInput>,
	sanitizedInput: ReturnType<typeof sanitizeAdministrationInput>,
	error: unknown,
) {
	// Enhanced error logging for critical operations
	await ctx.logger.error(
		"Failed to record medication administration",
		error instanceof Error ? error : new Error(String(error)),
		{
			animalId: input.animalId,
			regimenId: input.regimenId,
			caregiver: sanitizedInput.caregiverName,
		},
		ctx.correlationId,
	);

	// Audit log the failure
	await auditLogger.logEvent({
		eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
		severity: AuditSeverity.HIGH,
		userId: ctx.auth?.userId || "",
		householdId: ctx.currentHouseholdId || "",
		targetId: input.animalId,
		targetType: "administration",
		metadata: {
			event: "medication_administration_failed",
			animalId: input.animalId,
			regimenId: input.regimenId,
			error: error instanceof Error ? error.message : String(error),
			correlationId: ctx.correlationId,
		},
	});

	throw error;
}

/**
 * Sanitize update data for bulk operations
 */
function sanitizeUpdateData(
	update: { weight?: number; notes?: string },
	ctx: EnhancedTRPCContext,
): Record<string, unknown> {
	const sanitizedUpdate: Record<string, unknown> = {};

	if (update.weight !== undefined) {
		sanitizedUpdate.weight = update.weight;
	}

	if (update.notes !== undefined) {
		sanitizedUpdate.notes = ctx.medicalSanitizer.sanitizeNotes(update.notes);
	}

	sanitizedUpdate.updatedAt = new Date();
	return sanitizedUpdate;
}

/**
 * Process a single animal update
 */
async function processSingleUpdate(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	update: { animalId: string; weight?: number; notes?: string },
	ctx: EnhancedTRPCContext,
	results: { animalId: string; success: boolean; error?: string }[],
): Promise<void> {
	try {
		const sanitizedUpdate = sanitizeUpdateData(update, ctx);

		await tx
			.update(animals)
			.set(sanitizedUpdate)
			.where(eq(animals.id, update.animalId));

		results.push({
			animalId: update.animalId,
			success: true,
		});
	} catch (error) {
		results.push({
			animalId: update.animalId,
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Process bulk updates in transaction
 */
async function processBulkUpdates(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	updates: { animalId: string; weight?: number; notes?: string }[],
	ctx: EnhancedTRPCContext,
	results: { animalId: string; success: boolean; error?: string }[],
): Promise<void> {
	for (const update of updates) {
		await processSingleUpdate(tx, update, ctx, results);
	}
}

/**
 * Create cached query procedure for animal details
 * This demonstrates advanced caching patterns
 */
const cachedAnimalQueryProcedure = createCachedQueryProcedure<{
	animalId: string;
	includeHistory: boolean;
	householdId: string;
}>({
	keyGenerator: (input, ctx) =>
		`animal:${input.animalId}:details:${input.includeHistory}:${ctx.auth?.userId || "anonymous"}`,
	ttl: 300, // 5 minutes
	staleOnError: true,
});

/**
 * Enhanced example router with comprehensive feature demonstration
 */
export const enhancedExampleRouter = createTRPCRouter({
	/**
	 * EXAMPLE 1: Basic protected procedure with logging and sanitization
	 * Demonstrates: Input sanitization, structured logging, error handling
	 */
	createAnimal: enhancedHouseholdProcedure
		.input(CreateAnimalInput)
		.mutation(async ({ ctx, input }) => {
			// Additional input sanitization using our medical sanitizer
			const sanitizedInput = {
				...input,
				name: ctx.medicalSanitizer.sanitizeAnimalName(input.name),
				notes: input.notes
					? ctx.medicalSanitizer.sanitizeNotes(input.notes)
					: undefined,
			};

			// Log operation start
			await ctx.logger.info(
				"Creating new animal",
				{
					animalName: sanitizedInput.name,
					species: sanitizedInput.species,
					householdId: sanitizedInput.householdId,
				},
				ctx.correlationId,
			);

			try {
				// Database operation with circuit breaker protection
				const newAnimal = await withEnhancedDatabaseOperation(
					ctx,
					"insert",
					"animals",
					async () => {
						const [animal] = await ctx.db
							.insert(animals)
							.values(sanitizedInput)
							.returning();

						return animal;
					},
				);

				// Audit log the creation
				await auditLogger.logEvent({
					eventType: AuditEventType.ANIMAL_CREATED,
					severity: AuditSeverity.LOW,
					userId: ctx.auth?.userId || "",
					householdId: ctx.currentHouseholdId || "",
					targetId: newAnimal?.id || "",
					targetType: "animal",
					metadata: {
						animalName: newAnimal?.name || "",
						species: newAnimal?.species || "",
						correlationId: ctx.correlationId,
					},
				});

				// Invalidate related caches
				if (ctx.currentHouseholdId) {
					await ctx.householdCache.invalidateHousehold(ctx.currentHouseholdId);
				}

				// Log successful completion
				await ctx.logger.info(
					"Animal created successfully",
					{ animalId: newAnimal?.id || "", animalName: newAnimal?.name || "" },
					ctx.correlationId,
				);

				return {
					success: true,
					animal: newAnimal,
					message: "Animal created successfully",
				};
			} catch (error) {
				// Enhanced error logging
				await ctx.logger.error(
					"Failed to create animal",
					error instanceof Error ? error : new Error(String(error)),
					{
						animalName: sanitizedInput.name,
						householdId: sanitizedInput.householdId,
					},
					ctx.correlationId,
				);

				// Re-throw with enhanced error information
				throw error;
			}
		}),

	/**
	 * EXAMPLE 2: Critical operation with enhanced rate limiting and audit logging
	 * Demonstrates: Critical rate limiting, audit logging, circuit breaker usage
	 */
	recordAdministration: criticalOperationProcedure
		.input(RecordAdministrationInput)
		.mutation(async ({ ctx, input }) => {
			// Validate input and rate limits
			const { animal } = await validateAdministrationInput(ctx, input);
			const sanitizedInput = sanitizeAdministrationInput(ctx, input);

			// Log the critical operation start
			await ctx.logger.info(
				"Recording medication administration",
				{
					animalId: input.animalId,
					animalName: animal?.name || "",
					regimenId: input.regimenId,
					caregiver: sanitizedInput.caregiverName,
				},
				ctx.correlationId,
			);

			try {
				// Create the administration record
				const administration = await createAdministrationRecord(
					ctx,
					input,
					sanitizedInput,
				);

				// Handle success logging and cleanup
				await handleAdministrationSuccess(
					ctx,
					input,
					animal,
					sanitizedInput,
					administration,
				);

				return {
					success: true,
					administration,
					message: "Medication administration recorded successfully",
				};
			} catch (error) {
				// Handle error logging and cleanup
				await handleAdministrationError(ctx, input, sanitizedInput, error);
			}
		}),

	/**
	 * EXAMPLE 3: Cached query with circuit breaker fallback
	 * Demonstrates: Advanced caching, circuit breaker fallbacks, performance optimization
	 */
	getAnimalDetails: cachedAnimalQueryProcedure
		.input(GetAnimalDetailsInput)
		.query(async ({ ctx, input }) => {
			// Validate animal access
			const animal = await validateAnimalAccess(
				ctx,
				input.animalId,
				input.householdId,
			);

			try {
				// Get animal details with optional history
				const animalDetails = await withCircuitBreaker(
					async () => {
						return withEnhancedDatabaseOperation(
							ctx,
							"select",
							"animals",
							async () => {
								type AnimalWithAge = typeof animals.$inferSelect & {
									age: number | null;
								};
								const baseData: AnimalWithAge = {
									...animal,
									// Add computed fields
									age: animal.dob
										? Math.floor(
												(Date.now() - new Date(animal.dob).getTime()) /
													(365.25 * 24 * 60 * 60 * 1000),
											)
										: null,
								};

								if (!input.includeHistory) {
									return baseData;
								}

								// Fetch administration history if requested
								const recentAdministrations =
									await ctx.db.query.administrations.findMany({
										where: eq(administrations.animalId, input.animalId),
										orderBy: desc(administrations.recordedAt),
										limit: 50,
										with: {
											regimen: {
												with: {
													medication: true,
												},
											},
										},
									});

								return {
									...baseData,
									recentAdministrations,
								};
							},
						);
					},
					databaseCircuitBreaker,
					// Fallback: return basic animal data from cache or minimal data
					async () => {
						await ctx.logger.warn(
							"Using fallback for animal details due to database issues",
							{ animalId: input.animalId },
							ctx.correlationId,
						);

						// Try to get from animal-specific cache
						const cachedAnimal = await ctx.animalCache.getAnimal(
							input.animalId,
						);

						type FallbackAnimal = typeof animals.$inferSelect & {
							age: number | null;
							_fallback: boolean;
							_message: string;
						};

						if (cachedAnimal) {
							return {
								...cachedAnimal,
								age: null,
								_fallback: true,
								_message:
									"Some data may be outdated due to temporary service issues",
							} as FallbackAnimal;
						}

						// Absolute fallback: return basic animal data
						return {
							...animal,
							age: null,
							_fallback: true,
							_message:
								"Limited data available due to temporary service issues",
						} as FallbackAnimal;
					},
				);

				// Log performance metrics
				const performance = ctx.performanceTracker.getMetrics();
				await ctx.logger.debug(
					"Animal details retrieved",
					{
						animalId: input.animalId,
						includeHistory: input.includeHistory,
						duration: performance.duration,
						fromCache: false, // This would be set by the caching middleware
						fallback:
							"_fallback" in animalDetails ? !!animalDetails._fallback : false,
					},
					ctx.correlationId,
				);

				return {
					success: true,
					data: animalDetails,
					_meta: {
						cached: false, // Set by caching middleware
						fallback:
							"_fallback" in animalDetails ? !!animalDetails._fallback : false,
						performance: {
							duration: performance.duration,
							memoryUsed: performance.memoryUsage,
						},
					},
				};
			} catch (error) {
				await ctx.logger.error(
					"Failed to retrieve animal details",
					error instanceof Error ? error : new Error(String(error)),
					{ animalId: input.animalId, includeHistory: input.includeHistory },
					ctx.correlationId,
				);

				throw error;
			}
		}),

	/**
	 * EXAMPLE 4: Owner-only procedure with bulk operations and comprehensive validation
	 * Demonstrates: Owner authorization, bulk operations, transaction handling, validation
	 */
	bulkUpdateAnimals: enhancedOwnerProcedure
		.input(BulkUpdateAnimalsInput)
		.mutation(async ({ ctx, input }) => {
			// Additional rate limiting for bulk operations
			const rateLimitResult = await rateLimitCriticalOperation(
				"inventory", // Using inventory rate limit for bulk operations
				ctx.auth?.userId || "anonymous",
				{ isAdmin: true }, // Owners are considered admins for this operation
			);

			if (!rateLimitResult.success) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: `Bulk operations rate limited. Try again in ${rateLimitResult.retryAfter} seconds.`,
				});
			}

			// Validate all animals belong to the household (batch validation)
			const animalIds = input.updates.map((u) => u.animalId);
			const validAnimals = await withEnhancedDatabaseOperation(
				ctx,
				"select",
				"animals",
				async () => {
					return ctx.db.query.animals.findMany({
						where: and(eq(animals.householdId, input.householdId)),
						columns: { id: true, name: true },
					});
				},
			);

			const validAnimalIds = new Set(validAnimals.map((a) => a.id));
			const invalidIds = animalIds.filter((id) => !validAnimalIds.has(id));

			if (invalidIds.length > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid animal IDs: ${invalidIds.join(", ")}`,
				});
			}

			// Log bulk operation start
			await ctx.logger.info(
				"Starting bulk animal update",
				{
					householdId: input.householdId,
					animalCount: input.updates.length,
					updateFields: input.updates[0]
						? Object.keys(input.updates[0]).filter((k) => k !== "animalId")
						: [],
				},
				ctx.correlationId,
			);

			const results: { animalId: string; success: boolean; error?: string }[] =
				[];

			try {
				// Process updates in a transaction
				await withEnhancedDatabaseOperation(
					ctx,
					"update",
					"animals",
					async () => {
						return ctx.db.transaction(async (tx) => {
							await processBulkUpdates(tx, input.updates, ctx, results);
						});
					},
				);

				// Audit log bulk operation
				await auditLogger.logEvent(
					{
						eventType: AuditEventType.ANIMAL_UPDATED,
						severity: AuditSeverity.MEDIUM,
						userId: ctx.auth?.userId || "",
						householdId: ctx.currentHouseholdId || "",
						targetId: "",
						targetType: "animals",
						metadata: {
							totalUpdates: input.updates.length,
							successfulUpdates: results.filter((r) => r.success).length,
							failedUpdates: results.filter((r) => !r.success).length,
							animalIds,
							correlationId: ctx.correlationId,
						},
					},
					ctx.correlationId,
				);

				// Invalidate caches for updated animals
				const invalidations = animalIds.map((id) =>
					ctx.animalCache.invalidateAnimal(id),
				);
				if (ctx.currentHouseholdId) {
					invalidations.push(
						ctx.householdCache.invalidateHousehold(ctx.currentHouseholdId),
					);
				}
				await Promise.all(invalidations);

				const successCount = results.filter((r) => r.success).length;
				const failCount = results.filter((r) => !r.success).length;

				// Log completion
				await ctx.logger.info(
					"Bulk animal update completed",
					{
						totalUpdates: input.updates.length,
						successful: successCount,
						failed: failCount,
					},
					ctx.correlationId,
				);

				return {
					success: true,
					results,
					summary: {
						total: input.updates.length,
						successful: successCount,
						failed: failCount,
					},
					message:
						failCount > 0
							? `Updated ${successCount} animals successfully, ${failCount} failed`
							: `Successfully updated all ${successCount} animals`,
				};
			} catch (error) {
				await ctx.logger.error(
					"Bulk animal update failed",
					error instanceof Error ? error : new Error(String(error)),
					{
						householdId: input.householdId,
						animalCount: input.updates.length,
					},
					ctx.correlationId,
				);

				// Audit log the failure
				await auditLogger.logEvent({
					eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
					severity: AuditSeverity.MEDIUM,
					userId: ctx.auth?.userId || "",
					householdId: ctx.currentHouseholdId || "",
					targetType: "animals",
					metadata: {
						event: "bulk_animal_update_failed",
						animalCount: input.updates.length,
						error: error instanceof Error ? error.message : String(error),
						correlationId: ctx.correlationId,
					},
				});

				throw error;
			}
		}),

	/**
	 * EXAMPLE 5: Health check procedure with system status monitoring
	 * Demonstrates: System health monitoring, infrastructure status reporting
	 */
	systemHealthCheck: enhancedProtectedProcedure.query(async ({ ctx }) => {
		// This endpoint should use bypass for rate limiting in the middleware
		const startTime = Date.now();

		try {
			// Check database connectivity with a simple query
			const dbHealth = await withEnhancedDatabaseOperation(
				ctx,
				"select",
				"health",
				async () => {
					// Simple connectivity test
					const _result = await ctx.db.execute(sql`SELECT 1 as health`);
					return { healthy: true, latency: Date.now() - startTime };
				},
			);

			// Check cache connectivity
			const cacheHealth = await (async () => {
				try {
					const testKey = `health:${Date.now()}`;
					await ctx.cache.set(testKey, "test", { ttl: 10 });
					const retrieved = await ctx.cache.get(testKey);
					await ctx.cache.delete(testKey);
					return {
						healthy: retrieved === "test",
						latency: Date.now() - startTime,
					};
				} catch {
					return { healthy: false, latency: -1 };
				}
			})();

			// Get circuit breaker status
			const circuitBreakers = {
				database: databaseCircuitBreaker.getMetrics(),
			};

			const overallHealth = dbHealth.healthy && cacheHealth.healthy;

			await ctx.logger.info(
				"Health check completed",
				{
					overall: overallHealth,
					database: dbHealth,
					cache: cacheHealth,
					circuitBreakers,
				},
				ctx.correlationId,
			);

			return {
				healthy: overallHealth,
				timestamp: new Date().toISOString(),
				services: {
					database: dbHealth,
					cache: cacheHealth,
				},
				circuitBreakers,
				performance: {
					totalLatency: Date.now() - startTime,
				},
			};
		} catch (error) {
			await ctx.logger.error(
				"Health check failed",
				error instanceof Error ? error : new Error(String(error)),
				{},
				ctx.correlationId,
			);

			return {
				healthy: false,
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : String(error),
				performance: {
					totalLatency: Date.now() - startTime,
				},
			};
		}
	}),
});

export type EnhancedExampleRouter = typeof enhancedExampleRouter;
