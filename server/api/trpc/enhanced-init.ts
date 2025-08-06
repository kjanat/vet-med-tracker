/**
 * Enhanced tRPC initialization with full infrastructure integration
 *
 * This file demonstrates how to integrate all the available infrastructure components:
 * - Rate limiting with Redis
 * - Circuit breakers for resilience
 * - Structured logging with correlation IDs
 * - Caching for performance
 * - Input sanitization and validation
 * - Connection middleware for database protection
 * - Audit logging for compliance
 * - Error handling with user-friendly messages
 *
 * Usage:
 * Import procedures from this file instead of clerk-init.ts for enhanced features
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";

// Database and schema imports
import { dbPooled as db } from "@/db/drizzle";
import type { households, memberships, users } from "@/db/schema";
import {
	criticalCircuitBreaker,
	withCircuitBreaker,
} from "@/lib/circuit-breaker";
import {
	createTRPCConnectionMiddleware,
	withDatabaseSafeguards,
} from "@/lib/connection-middleware";
import {
	createEnhancedError,
	setupGlobalErrorHandling,
	toUserFriendlyError,
} from "@/lib/error-handling";
import { AuditEventType, auditLogger } from "@/lib/logging/audit-logger";
import { Logger, logger } from "@/lib/logging/logger";
import { logDatabaseOperation } from "@/lib/logging/trpc-middleware";
// Infrastructure imports
import { animalCache, cache, householdCache } from "@/lib/redis/cache";
import {
	applyRateLimit,
	rateLimitCriticalOperation,
} from "@/lib/redis/rate-limit";
import {
	InputSanitizer,
	MedicalDataSanitizer,
} from "@/lib/validation/sanitizer";

// Context helpers
import {
	determineCurrentHousehold,
	setupAuthenticatedUser,
} from "./clerk-context-helpers";

/**
 * Enhanced context type with infrastructure components
 */
export interface EnhancedTRPCContext {
	// Base Clerk context
	db: typeof db;
	headers: Headers;
	requestedHouseholdId: string | null;
	auth: Awaited<ReturnType<typeof auth>> | null;
	clerkUser: Awaited<ReturnType<typeof currentUser>>;
	dbUser: typeof users.$inferSelect | null;
	currentHouseholdId: string | null;
	currentMembership: typeof memberships.$inferSelect | null;
	availableHouseholds: Array<
		typeof households.$inferSelect & {
			membership: typeof memberships.$inferSelect;
		}
	>;

	// Enhanced infrastructure
	cache: typeof cache;
	householdCache: typeof householdCache;
	animalCache: typeof animalCache;
	logger: typeof logger;
	correlationId: string;
	requestId: string;
	sanitizer: typeof InputSanitizer;
	medicalSanitizer: typeof MedicalDataSanitizer;

	// Performance tracking
	performanceTracker: ReturnType<typeof logger.startPerformanceTracking>;
}

/**
 * Enhanced context creation with full infrastructure
 */
export const createEnhancedTRPCContext = async (
	opts: FetchCreateContextFnOptions,
): Promise<EnhancedTRPCContext> => {
	// Generate request tracking IDs
	const correlationId = Logger.generateCorrelationId();
	const requestId = opts.req.headers.get("x-request-id") || correlationId;

	// Start performance tracking
	const performanceTracker = logger.startPerformanceTracking();

	// Create logging context
	const _loggingContext = await logger.createContext("trpc.context", {
		correlationId,
		requestId,
		userAgent: opts.req.headers.get("user-agent") || "unknown",
		path: new URL(opts.req.url).pathname,
	});

	// Extract householdId from headers
	const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;

	// Get Clerk auth context
	const authResult = await auth();
	const clerkUser = await currentUser();

	// Initialize base context
	const baseContext = {
		db,
		headers: opts.req.headers,
		requestedHouseholdId,
		auth: authResult,
		clerkUser,
		dbUser: null as typeof users.$inferSelect | null,
		currentHouseholdId: null as string | null,
		currentMembership: null as typeof memberships.$inferSelect | null,
		availableHouseholds: [] as EnhancedTRPCContext["availableHouseholds"],

		// Infrastructure components
		cache,
		householdCache,
		animalCache,
		logger,
		correlationId,
		requestId,
		sanitizer: InputSanitizer,
		medicalSanitizer: MedicalDataSanitizer,
		performanceTracker,
	};

	// If user is not authenticated, return base context
	if (!authResult?.userId || !clerkUser) {
		return baseContext;
	}

	try {
		// Setup authenticated user context with circuit breaker protection
		const userContext = await withCircuitBreaker(
			async () => {
				return await setupAuthenticatedUser(authResult.userId, clerkUser);
			},
			criticalCircuitBreaker,
			// Fallback for user context setup failures
			async () => {
				logger.warn(
					"Failed to setup user context due to database issues",
					{
						userId: authResult.userId,
					},
					correlationId,
				);
				// Cannot proceed without user context - throw error instead of returning invalid data
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to load user data. Please try again later.",
				});
			},
		);

		// Determine current household if not already set
		if (
			!userContext.currentHouseholdId &&
			userContext.availableHouseholds.length > 0
		) {
			const { currentHouseholdId, currentMembership } =
				determineCurrentHousehold(
					userContext.availableHouseholds,
					requestedHouseholdId,
				);
			userContext.currentHouseholdId = currentHouseholdId;
			userContext.currentMembership = currentMembership;
		}

		// Update logging context with user information
		logger.updateContext(correlationId, {
			userId: authResult.userId,
			householdId: userContext.currentHouseholdId || undefined,
		});

		// Log successful context creation
		await logger.info(
			"Enhanced tRPC context created successfully",
			{
				userId: authResult.userId,
				householdId: userContext.currentHouseholdId,
				availableHouseholds: userContext.availableHouseholds.length,
			},
			correlationId,
		);

		return {
			...baseContext,
			...userContext,
		};
	} catch (error) {
		const enhancedError = createEnhancedError(error, {
			endpoint: "trpc",
			operation: "context-setup",
			userId: authResult.userId,
		});

		await logger.error(
			"Failed to setup enhanced tRPC context",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId: authResult.userId,
				userEmail: clerkUser?.emailAddresses[0]?.emailAddress,
				enhancedErrorId: enhancedError.id,
			},
			correlationId,
		);

		// In production, throw error to prevent silent failures
		if (process.env.NODE_ENV === "production") {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Failed to initialize user context. Please try refreshing the page or contact support.",
				cause: error,
			});
		}

		// Continue with base context in development
		return baseContext;
	}
};

// Setup global error handling
setupGlobalErrorHandling();

// Initialize tRPC with enhanced context and error handling
const t = initTRPC.context<EnhancedTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error, path, ctx }) {
		// Create enhanced error for reporting
		const enhancedError = createEnhancedError(error, {
			endpoint: "trpc",
			operation: path || "unknown",
			userId: ctx?.auth?.userId || undefined,
			householdId: ctx?.currentHouseholdId || undefined,
		});

		// Report error for monitoring (with rate limiting to prevent spam)
		if (ctx?.correlationId) {
			// Rate limit error reporting to prevent spam
			applyRateLimit("user", ctx.correlationId, {
				bypassReason: "error-reporting",
			})
				.then((rateLimitResult) => {
					if (rateLimitResult.success) {
						logger
							.error(
								"tRPC Error",
								error instanceof Error ? error : new Error(String(error)),
								{
									path: path || "unknown",
									userId: ctx.auth?.userId,
									householdId: ctx.currentHouseholdId,
									enhancedErrorId: enhancedError.id,
								},
								ctx.correlationId,
							)
							.catch(console.error);
					}
				})
				.catch(console.error);
		}

		// Convert to user-friendly error
		const userFriendlyError = toUserFriendlyError(error);

		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
				userFriendly: {
					message: userFriendlyError.userMessage,
					suggestedActions: userFriendlyError.suggestedActions,
					retryable: userFriendlyError.retryable,
					retryAfter: userFriendlyError.retryAfter,
					degraded: userFriendlyError.degradedMode,
					contactSupport: userFriendlyError.contactSupport,
				},
				errorId: enhancedError.id,
				correlationId: ctx?.correlationId,
				requestId: ctx?.requestId,
			},
		};
	},
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Create middleware instances
const connectionMiddleware = createTRPCConnectionMiddleware();

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
	const ip = extractClientIP(ctx.headers);

	// Determine if user is authenticated and admin
	const isAuthenticated = !!ctx.auth?.userId;
	const isAdmin = ctx.currentMembership?.role === "OWNER";
	const userId = ctx.auth?.userId;
	const _householdId = ctx.currentHouseholdId || ctx.requestedHouseholdId;

	// Apply rate limiting
	const result = await applyRateLimit(
		isAuthenticated ? "user" : "ip",
		isAuthenticated && userId ? userId : ip,
		{
			isAdmin,
			bypassReason:
				path === "health" || path.startsWith("system") ? "system" : undefined,
		},
	);

	if (!result.success) {
		throw new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
		});
	}

	return next();
});

// Helper function to extract client IP
function extractClientIP(headers: Headers): string {
	const forwardedFor = headers.get("x-forwarded-for");
	const realIP = headers.get("x-real-ip");
	const cfConnectingIP = headers.get("cf-connecting-ip");

	if (forwardedFor) {
		const firstIp = forwardedFor.split(",")[0];
		return firstIp ? firstIp.trim() : "unknown";
	}

	return realIP || cfConnectingIP || "unknown";
}

/**
 * Logging middleware
 */
const loggingMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
	// Skip health check paths
	if (path === "health" || path === "ping") {
		return next();
	}

	// Start performance tracking
	const startTime = Date.now();

	// Log request if enabled
	if (process.env.NODE_ENV === "development") {
		await ctx.logger.debug(
			`tRPC ${type} request: ${path}`,
			{ type, path },
			ctx.correlationId,
		);
	}

	try {
		const result = await next();

		// Log success
		const duration = Date.now() - startTime;
		if (duration > 1000) {
			await ctx.logger.warn(
				`Slow tRPC operation: ${path}`,
				{ duration, type, path },
				ctx.correlationId,
			);
		}

		return result;
	} catch (error) {
		// Log error
		const duration = Date.now() - startTime;
		await ctx.logger.error(
			`tRPC ${type} error: ${path}`,
			error instanceof Error ? error : new Error(String(error)),
			{ type, path, duration },
			ctx.correlationId,
		);
		throw error;
	}
});

/**
 * Enhanced input sanitization middleware
 */
const sanitizationMiddleware = t.middleware(
	async ({ ctx, next, input, path }) => {
		// Skip sanitization for health checks
		if (path === "health") {
			return next();
		}

		// Sanitize input if it exists and is an object
		let sanitizedInput = input;
		if (input && typeof input === "object") {
			try {
				// Apply general sanitization
				sanitizedInput = InputSanitizer.sanitizeObject(
					input as Record<string, unknown>,
					{
						fieldRules: {
							// Domain-specific sanitization rules
							animalName: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizeAnimalName(value)
									: value,
							medicationName: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizeMedicationName(value)
									: value,
							dosage: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizeDosage(value)
									: value,
							notes: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizeNotes(value)
									: value,
							email: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizeEmail(value)
									: value,
							phone: (value: unknown) =>
								typeof value === "string"
									? MedicalDataSanitizer.sanitizePhoneNumber(value)
									: value,
						},
					},
				);

				// Log sanitization if changes were made (for debugging in development)
				if (
					process.env.NODE_ENV === "development" &&
					JSON.stringify(input) !== JSON.stringify(sanitizedInput)
				) {
					await logger.debug(
						"Input sanitized",
						{
							path,
							changes: true,
							originalSize: JSON.stringify(input).length,
							sanitizedSize: JSON.stringify(sanitizedInput).length,
						},
						ctx.correlationId,
					);
				}
			} catch (error) {
				await logger.warn(
					"Input sanitization failed",
					{
						path,
						inputType: typeof input,
						error: error instanceof Error ? error.message : String(error),
					},
					ctx.correlationId,
				);
				// Continue with original input if sanitization fails
			}
		}

		return next({
			ctx: {
				...ctx,
				// Pass sanitized input through context
				sanitizedInput,
			},
		});
	},
);

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = t.middleware(async ({ ctx, next, path }) => {
	const tracker = logger.startPerformanceTracking();
	const startTime = Date.now();

	try {
		const result = await next();

		const performance = tracker.getMetrics();

		// Log slow operations
		if (performance.duration > 1000) {
			// > 1 second
			await logger.warn(
				`Slow tRPC operation: ${path}`,
				{
					duration: performance.duration,
					path,
					memoryUsage: performance.memoryUsage,
				},
				ctx.correlationId,
			);
		}

		// Track performance metrics
		await logger.debug(
			`tRPC operation completed: ${path}`,
			{
				duration: performance.duration,
				memoryUsed: performance.memoryUsage,
				path,
				success: true,
			},
			ctx.correlationId,
		);

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;

		await logger.error(
			`tRPC operation failed: ${path}`,
			error instanceof Error ? error : new Error(String(error)),
			{
				duration,
				path,
				success: false,
			},
			ctx.correlationId,
		);

		throw error;
	}
});

/**
 * Caching middleware factory
 */
function createCachingMiddleware<T extends Record<string, unknown>>(options: {
	keyGenerator: (input: T, ctx: EnhancedTRPCContext) => string;
	ttl?: number;
	staleOnError?: boolean;
	skipCache?: (input: T, ctx: EnhancedTRPCContext) => boolean;
}) {
	return t.middleware(async ({ ctx, next, input }) => {
		// Check if we should skip caching
		if (options.skipCache?.(input as T, ctx)) {
			return next();
		}

		// Generate cache key
		const cacheKey = options.keyGenerator(input as T, ctx);

		try {
			// Try to get from cache
			const cached = await ctx.cache.get<unknown>(cacheKey);
			if (cached !== null) {
				await logger.debug("Cache hit", { cacheKey }, ctx.correlationId);
				return {
					ok: true,
					data: cached,
					marker: {} as never,
				};
			}

			// Execute procedure
			const result = await next();

			// Cache the result if successful
			if (result.ok && result.data !== undefined) {
				await ctx.cache.set(cacheKey, result.data, {
					ttl: options.ttl || 300, // 5 minutes default
					staleOnError: options.staleOnError || false,
				});

				await logger.debug(
					"Cache miss - result cached",
					{ cacheKey },
					ctx.correlationId,
				);
			}

			return result;
		} catch (error) {
			await logger.warn(
				"Caching middleware error",
				{
					cacheKey,
					error: error instanceof Error ? error.message : String(error),
				},
				ctx.correlationId,
			);

			// Continue without caching
			return next();
		}
	});
}

// Base procedures with infrastructure middleware
export const publicProcedure = t.procedure
	.use(connectionMiddleware)
	.use(loggingMiddleware)
	.use(sanitizationMiddleware)
	.use(performanceMiddleware);

// Enhanced protected procedure with rate limiting
export const enhancedProtectedProcedure = t.procedure
	.use(connectionMiddleware)
	.use(rateLimitMiddleware)
	.use(loggingMiddleware)
	.use(sanitizationMiddleware)
	.use(performanceMiddleware)
	.use(async ({ ctx, next }) => {
		if (!ctx.auth?.userId || !ctx.dbUser) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You must be logged in to perform this action",
			});
		}

		if (!ctx.clerkUser) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Clerk user data is missing",
			});
		}

		return next({
			ctx: {
				...ctx,
				// TypeScript now knows these are non-null
				auth: ctx.auth,
				clerkUser: ctx.clerkUser,
				dbUser: ctx.dbUser,
			},
		});
	});

// Enhanced household-scoped procedure with caching
export const enhancedHouseholdProcedure = enhancedProtectedProcedure
	.use(
		createCachingMiddleware({
			keyGenerator: (input: unknown, ctx) =>
				`household:${ctx.currentHouseholdId}:${JSON.stringify(input)}`,
			ttl: 300, // 5 minutes
			staleOnError: true,
			skipCache: (input, _ctx) => {
				// Skip cache for write operations or if explicitly requested
				return (input as Record<string, unknown>)?.skipCache === true;
			},
		}),
	)
	.use(async ({ ctx, next, input }) => {
		// Get householdId from input, context, or headers
		const householdId =
			(input as { householdId?: string })?.householdId ||
			ctx.currentHouseholdId ||
			ctx.requestedHouseholdId;

		if (!householdId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "householdId is required",
			});
		}

		// Check if user has membership in this household
		let membership = ctx.currentMembership;

		// If the requested household is different from current context, verify membership
		if (householdId !== ctx.currentHouseholdId) {
			const householdMembership = ctx.availableHouseholds.find(
				(h) => h.id === householdId,
			);

			if (!householdMembership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a member of this household",
				});
			}

			membership = householdMembership.membership;
		}

		if (!membership) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You are not a member of this household",
			});
		}

		return next({
			ctx: {
				...ctx,
				householdId,
				membership,
			},
		});
	});

// Enhanced owner procedure with audit logging
export const enhancedOwnerProcedure = enhancedHouseholdProcedure.use(
	async ({ ctx, next, input, path }) => {
		if (ctx.membership.role !== "OWNER") {
			// Audit failed owner access attempt
			await auditLogger.logSecurityEvent(
				AuditEventType.PERMISSION_DENIED,
				ctx.auth.userId,
				ctx.householdId,
				undefined, // ipAddress
				undefined, // userAgent
				{
					userRole: ctx.membership.role,
					requestedOperation: path,
					resource: path || "unknown",
					input:
						input && typeof input === "object"
							? InputSanitizer.sanitizeObject(input as Record<string, unknown>)
							: undefined,
				},
				ctx.correlationId,
			);

			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You must be a household owner to perform this action",
			});
		}

		// Audit successful owner operation
		await auditLogger.logDataChange(
			AuditEventType.HOUSEHOLD_UPDATED, // Using a generic event type for owner operations
			ctx.auth.userId,
			ctx.householdId,
			path || "unknown", // targetId
			"owner_operation", // targetType
			undefined, // previousValues
			{
				operation: path,
				input:
					input && typeof input === "object"
						? InputSanitizer.sanitizeObject(input as Record<string, unknown>)
						: undefined,
			}, // newValues
			undefined, // reason
			ctx.correlationId,
		);

		const result = await next({ ctx });

		// Audit successful completion
		await auditLogger.logDataChange(
			AuditEventType.HOUSEHOLD_UPDATED,
			ctx.auth.userId,
			ctx.householdId,
			path || "unknown",
			"owner_operation_completed",
			undefined,
			{
				operation: path,
				success: true,
			},
			undefined,
			ctx.correlationId,
		);

		return result;
	},
);

/**
 * Critical operation procedure with enhanced protections
 */
export const criticalOperationProcedure = enhancedProtectedProcedure.use(
	async ({ ctx, next, path, input }) => {
		// Apply critical operation rate limiting
		const rateLimitResult = await rateLimitCriticalOperation(
			"administration", // or determine from path
			ctx.auth.userId,
			{ isAdmin: ctx.currentMembership?.role === "OWNER" },
		);

		if (!rateLimitResult.success) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: `Critical operation rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
			});
		}

		// Use critical circuit breaker
		return withCircuitBreaker(
			async () => {
				// Audit critical operation
				await auditLogger.logDataChange(
					AuditEventType.SUSPICIOUS_ACTIVITY, // Using suspicious activity for critical operations
					ctx.auth.userId,
					ctx.currentHouseholdId || "",
					path || "unknown",
					"critical_operation_started",
					undefined,
					{
						operation: path,
						input:
							input && typeof input === "object"
								? InputSanitizer.sanitizeObject(
										input as Record<string, unknown>,
									)
								: undefined,
					},
					undefined,
					ctx.correlationId,
				);

				const result = await next({ ctx });

				// Audit successful completion
				await auditLogger.logDataChange(
					AuditEventType.SUSPICIOUS_ACTIVITY,
					ctx.auth.userId,
					ctx.currentHouseholdId || "",
					path || "unknown",
					"critical_operation_completed",
					undefined,
					{
						operation: path,
						success: true,
					},
					undefined,
					ctx.correlationId,
				);

				return result;
			},
			criticalCircuitBreaker,
			// Fallback for critical operations
			() => {
				throw new TRPCError({
					code: "SERVICE_UNAVAILABLE",
					message:
						"Critical service is temporarily unavailable. Please try again later.",
				});
			},
		);
	},
);

/**
 * Database operation wrapper for procedures
 */
export async function withEnhancedDatabaseOperation<T>(
	ctx: EnhancedTRPCContext,
	operation: string,
	tableName: string,
	fn: () => Promise<T>,
): Promise<T> {
	return withDatabaseSafeguards(
		async () => {
			// Create a simplified context for logDatabaseOperation
			const simpleCtx = {
				auth: ctx.auth?.userId ? { userId: ctx.auth.userId } : undefined,
				householdId: ctx.currentHouseholdId || undefined,
			};
			return logDatabaseOperation(simpleCtx, operation, tableName, fn);
		},
		{
			userId: ctx.auth?.userId || undefined,
			householdId: ctx.currentHouseholdId || undefined,
			operationType: operation.startsWith("select") ? "read" : "write",
			endpoint: `db.${tableName}.${operation}`,
			priority: operation === "select" ? 1 : 2,
		},
	);
}

/**
 * Create cached query procedure
 */
export function createCachedQueryProcedure<
	TInput extends Record<string, unknown>,
>(cacheOptions: {
	keyGenerator: (input: TInput, ctx: EnhancedTRPCContext) => string;
	ttl?: number;
	staleOnError?: boolean;
}) {
	return enhancedProtectedProcedure.use(createCachingMiddleware(cacheOptions));
}

// Export types
export type EnhancedAppRouter = ReturnType<typeof createTRPCRouter>;
export type { EnhancedTRPCContext as TRPCContext };

// Backward compatibility exports
export {
	enhancedProtectedProcedure as protectedProcedure,
	enhancedHouseholdProcedure as householdProcedure,
	enhancedOwnerProcedure as ownerProcedure,
};
