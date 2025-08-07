/**
 * Integration Example: How to integrate the logging system with existing tRPC setup
 *
 * This file shows how to modify the existing clerk-init.ts to include logging middleware
 * without breaking the current functionality.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";

// Existing imports
import { dbPooled as db } from "@/db/drizzle";
import type { households, memberships, users } from "@/db/schema";
import { createTRPCConnectionMiddleware } from "@/lib/infrastructure/connection-middleware";
import {
	createEnhancedError,
	setupGlobalErrorHandling,
	toUserFriendlyError,
} from "@/lib/infrastructure/error-handling";
// NEW: Import logging utilities
import { auditLog, Logger, logger } from "@/lib/logging";
import {
	determineCurrentHousehold,
	setupAuthenticatedUser,
} from "@/server/api/trpc/clerk-context-helpers";

// Enhanced ClerkContext with logging support
export interface EnhancedClerkContext {
	// Existing context properties
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

	// NEW: Logging context
	correlationId: string;
	startTime: number;
}

// Enhanced context creation with logging
export const createEnhancedClerkTRPCContext = async (
	opts: FetchCreateContextFnOptions,
): Promise<EnhancedClerkContext> => {
	// Generate or extract correlation ID
	const correlationId =
		opts.req.headers.get("x-correlation-id") || Logger.generateCorrelationId();
	const startTime = Date.now();

	// Extract householdId from headers (sent by the frontend)
	const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;

	// Get Clerk auth context
	const authResult = await auth();
	const clerkUser = await currentUser();

	// Initialize base context with logging
	const baseContext: EnhancedClerkContext = {
		db,
		headers: opts.req.headers,
		requestedHouseholdId,
		auth: authResult,
		clerkUser,
		dbUser: null,
		currentHouseholdId: null,
		currentMembership: null,
		availableHouseholds: [],
		correlationId,
		startTime,
	};

	// If user is not authenticated, return base context
	if (!authResult?.userId || !clerkUser) {
		return baseContext;
	}

	// Setup authenticated user context
	try {
		const userContext = await setupAuthenticatedUser(
			authResult.userId,
			clerkUser,
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

		const finalContext = {
			...baseContext,
			...userContext,
		};

		// NEW: Log successful context creation
		await logger.debug(
			"tRPC context created successfully",
			{
				userId: finalContext.dbUser?.id,
				householdId: finalContext.currentHouseholdId,
				membershipRole: finalContext.currentMembership?.role,
			},
			correlationId,
		);

		return finalContext;
	} catch (error) {
		// Enhanced error logging
		await logger.error(
			"Failed to create tRPC context",
			error instanceof Error ? error : new Error(String(error)),
			{
				clerkUserId: authResult.userId,
				email: clerkUser?.emailAddresses[0]?.emailAddress,
				requestedHouseholdId,
			},
			correlationId,
		);

		console.error("Error setting up user context:", error);
		console.error("Failed for Clerk user:", {
			userId: authResult.userId,
			email: clerkUser?.emailAddresses[0]?.emailAddress,
			name: clerkUser?.firstName,
		});

		// In production, we should throw an error to prevent silent failures
		if (process.env.NODE_ENV === "production") {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Failed to initialize user context. Please try refreshing the page or contact support.",
				cause: error,
			});
		}

		// Continue with base context if sync fails in development
		return baseContext;
	}
};

// Setup global error handling
setupGlobalErrorHandling();

// Initialize tRPC with enhanced error handling and logging
const t = initTRPC.context<EnhancedClerkContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error, path, ctx }) {
		// Create enhanced error for reporting
		const enhancedError = createEnhancedError(error, {
			endpoint: "trpc",
			operation: path || "unknown",
		});

		// NEW: Log error with correlation ID
		if (ctx?.correlationId) {
			// Convert EnhancedError to Error for logger compatibility
			const errorForLogging = new Error(enhancedError.technicalMessage);
			errorForLogging.name = enhancedError.type || "TRPCError";

			logger
				.error(
					`tRPC error in ${path || "unknown"}`,
					errorForLogging,
					{
						userId: ctx.dbUser?.id,
						householdId: ctx.currentHouseholdId,
						path,
						duration: ctx.startTime ? Date.now() - ctx.startTime : undefined,
						errorContext: enhancedError.context,
						severity: enhancedError.severity,
					},
					ctx.correlationId,
				)
				.catch(console.error); // Don't block error response
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
				correlationId: ctx?.correlationId, // NEW: Include correlation ID in error response
			},
		};
	},
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Connection middleware for tRPC procedures
const connectionMiddleware = createTRPCConnectionMiddleware();

// NEW: Logging middleware for tRPC
const loggingMiddleware = t.middleware(
	async ({ ctx, next, path, type, input }) => {
		const startTime = Date.now();
		// Log request
		await logger.debug(
			`tRPC ${type}: ${path}`,
			{
				type,
				path,
				userId: ctx.dbUser?.id,
				householdId: ctx.currentHouseholdId,
				// Don't log full input to avoid sensitive data, just presence
				hasInput: input !== undefined && input !== null,
			},
			ctx.correlationId,
		);

		const result = await next();

		// Log successful completion
		const duration = Date.now() - startTime;
		await logger.info(
			`tRPC ${type} completed: ${path}`,
			{
				type,
				path,
				duration,
				userId: ctx.dbUser?.id,
				householdId: ctx.currentHouseholdId,
			},
			ctx.correlationId,
		);

		return result;
	},
);

// Base procedures with enhanced logging
export const publicProcedure = t.procedure
	.use(connectionMiddleware)
	.use(loggingMiddleware);

// Protected procedure - requires Clerk authentication
export const protectedProcedure = t.procedure
	.use(connectionMiddleware)
	.use(loggingMiddleware)
	.use(async ({ ctx, next }) => {
		if (!ctx.auth?.userId || !ctx.dbUser) {
			// Log unauthorized access attempt
			await logger.warn(
				"Unauthorized access attempt to protected procedure",
				{
					hasAuth: !!ctx.auth,
					hasDbUser: !!ctx.dbUser,
					requestedHouseholdId: ctx.requestedHouseholdId,
				},
				ctx.correlationId,
			);

			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "You must be logged in to perform this action",
			});
		}

		if (!ctx.clerkUser) {
			await logger.error(
				"Missing Clerk user data in protected procedure",
				undefined,
				{
					userId: ctx.dbUser.id,
					authUserId: ctx.auth.userId,
				},
				ctx.correlationId,
			);

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

// Household-scoped procedure - requires household membership
export const householdProcedure = protectedProcedure.use(
	async ({ ctx, next, input }) => {
		// Get householdId from input, context, or headers
		const householdId =
			(input as { householdId?: string })?.householdId ||
			ctx.currentHouseholdId ||
			ctx.requestedHouseholdId;

		if (!householdId) {
			await logger.warn(
				"Missing householdId in household procedure",
				{
					userId: ctx.dbUser.id,
					hasCurrentHouseholdId: !!ctx.currentHouseholdId,
					hasRequestedHouseholdId: !!ctx.requestedHouseholdId,
					hasInputHouseholdId:
						typeof input === "object" &&
						input !== null &&
						"householdId" in input,
				},
				ctx.correlationId,
			);

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
				// Log unauthorized household access
				await auditLog.unauthorizedAccess(
					ctx.dbUser.id,
					householdId,
					ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
						"unknown",
					ctx.headers.get("user-agent") || "unknown",
					{ attemptedHouseholdId: householdId },
					ctx.correlationId,
				);

				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a member of this household",
				});
			}

			membership = householdMembership.membership;
		}

		if (!membership) {
			await logger.warn(
				"Missing membership for household access",
				{
					userId: ctx.dbUser.id,
					householdId,
					availableHouseholdsCount: ctx.availableHouseholds.length,
				},
				ctx.correlationId,
			);

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
	},
);

// Owner-only procedure - requires OWNER role in household
export const ownerProcedure = householdProcedure.use(async ({ ctx, next }) => {
	if (ctx.membership.role !== "OWNER") {
		// Log permission denied
		await auditLog.permissionDenied(
			ctx.dbUser.id,
			ctx.householdId,
			"household_management",
			"owner_required",
			ctx.correlationId,
		);

		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a household owner to perform this action",
		});
	}

	return next({ ctx });
});

// Export types
export type EnhancedClerkAppRouter = ReturnType<typeof createTRPCRouter>;

/**
 * Helper utilities for tRPC procedures with logging
 */
export const tRPCLogUtils = {
	/**
	 * Log database operations within tRPC procedures
	 */
	async logDbOperation<T>(
		ctx: EnhancedClerkContext,
		operation: string,
		tableName: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const startTime = Date.now();

		try {
			const result = await fn();
			const duration = Date.now() - startTime;

			await logger.debug(
				`Database ${operation} completed: ${tableName}`,
				{
					operation,
					table: tableName,
					duration,
					userId: ctx.dbUser?.id,
					householdId: ctx.currentHouseholdId,
					hasResult: result !== null && result !== undefined,
				},
				ctx.correlationId,
			);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			await logger.error(
				`Database ${operation} failed: ${tableName}`,
				error instanceof Error ? error : new Error(String(error)),
				{
					operation,
					table: tableName,
					duration,
					userId: ctx.dbUser?.id,
					householdId: ctx.currentHouseholdId,
				},
				ctx.correlationId,
			);

			throw error;
		}
	},

	/**
	 * Log audit events from tRPC context
	 */
	async auditMedicationEvent(
		ctx: EnhancedClerkContext,
		eventType: "administered" | "missed" | "corrected" | "deleted",
		animalId: string,
		regimenId: string,
		administrationId: string,
		metadata?: Record<string, unknown>,
	): Promise<void> {
		if (!ctx.dbUser?.id || !ctx.currentHouseholdId) {
			return; // Can't audit without proper context
		}

		const _auditFunction = {
			administered: auditLog.medicationGiven,
			missed: () => {}, // Would need to implement missed medication audit
			corrected: () => {}, // Would need to implement correction audit
			deleted: () => {}, // Would need to implement deletion audit
		}[eventType];

		if (eventType === "administered") {
			await auditLog.medicationGiven(
				ctx.dbUser.id,
				ctx.currentHouseholdId,
				animalId,
				regimenId,
				administrationId,
				false, // isHighRisk would be determined by medication
				metadata,
				ctx.correlationId,
			);
		}
	},
};
