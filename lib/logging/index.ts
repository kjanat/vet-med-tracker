/**
 * Structured Logging System for VetMed Tracker
 *
 * This module provides a comprehensive logging system with:
 * - Structured JSON logging with correlation IDs
 * - Request/response logging middleware
 * - tRPC integration with performance metrics
 * - Audit logging for compliance and security
 * - Sensitive data masking
 * - Serverless environment optimization
 *
 * @example Basic Usage
 * ```typescript
 * import { logger } from '@/lib/logging';
 *
 * // Simple logging
 * await logger.info('User logged in', { userId: '123' });
 * await logger.error('Database error', error, { operation: 'findUser' });
 *
 * // With correlation ID
 * const correlationId = await logger.extractCorrelationId();
 * await logger.info('Operation started', { step: 1 }, correlationId);
 * ```
 *
 * @example tRPC Integration
 * ```typescript
 * import { trpcAudit, trpcDb } from '@/lib/logging';
 *
 * // In tRPC procedure
 * await trpcAudit.logMedicationAdministration(
 *   ctx, animalId, regimenId, administrationId, isHighRisk
 * );
 *
 * await trpcDb.logOperation(
 *   ctx, 'create', 'administrations',
 *   () => db.insert(administrations).values(data)
 * );
 * ```
 *
 * @example Audit Logging
 * ```typescript
 * import { auditLog, AuditEventType } from '@/lib/logging';
 *
 * // Critical events
 * await auditLog.medicationGiven(
 *   userId, householdId, animalId, regimenId, administrationId, true
 * );
 *
 * // Security events
 * await auditLog.unauthorizedAccess(
 *   userId, householdId, ipAddress, userAgent
 * );
 * ```
 *
 * @example Performance Tracking
 * ```typescript
 * import { logger } from '@/lib/logging';
 *
 * // Track operation performance
 * await logger.trackOperation(
 *   'user.registration',
 *   async (context) => {
 *     // Your operation here
 *     return result;
 *   }
 * );
 *
 * // Manual performance tracking
 * const tracker = logger.startPerformanceTracking();
 * // ... do work ...
 * const metrics = tracker.getMetrics();
 * await logger.withPerformance(LogLevel.INFO, 'Operation completed', metrics);
 * ```
 */

import { auditLogger } from "./audit-logger";
// Import LogLevel, logger for use in this file
import { LogLevel, logger } from "./logger";

// Audit logging
export {
	type AuditConfig,
	type AuditEvent,
	AuditEventType,
	AuditLogger,
	AuditSeverity,
	auditLog,
	auditLogger,
} from "./audit-logger";
// Core logger
export {
	type ErrorContext,
	type LogEntry,
	Logger,
	type LoggerConfig,
	type LoggingContext,
	LogLevel,
	logger,
	type PerformanceMetrics,
} from "./logger";
// Request middleware
export {
	createRequestLoggingMiddleware,
	getRequestLoggingContext,
	logAPIRoute,
	type RequestLoggingConfig,
	requestLoggingMiddleware,
} from "./request-middleware";

// tRPC integration utilities
export {
	auditMiddleware,
	createRouterLoggingMiddleware,
	enhancedLoggingMiddleware,
	enhanceTRPCError,
	trpcAudit,
	trpcDb,
} from "./trpc-integration";
// tRPC middleware and integration
export {
	createTRPCLoggingMiddleware,
	type EnhancedTRPCContext,
	getTRPCLoggingContext,
	logDatabaseOperation,
	logExternalAPICall,
	type TRPCLoggingConfig,
	trpcLoggingMiddleware,
} from "./trpc-middleware";

/**
 * Quick start configuration for different environments
 */
export const LoggingConfig = {
	/**
	 * Development environment configuration
	 */
	development: {
		logger: {
			service: "vet-med-tracker-dev",
			minLevel: LogLevel.DEBUG,
			enableConsole: true,
			enableStructured: false,
			maskSensitiveData: false,
		},
		audit: {
			enableDataChangeTracking: true,
			trackPreviousValues: true,
			criticalEventsOnly: false,
		},
		trpc: {
			logRequests: true,
			logResponses: true,
			logErrors: true,
			logPerformance: true,
		},
		request: {
			logRequests: true,
			logResponses: true,
			logHeaders: false,
			excludeStaticAssets: true,
		},
	},

	/**
	 * Production environment configuration
	 */
	production: {
		logger: {
			service: "vet-med-tracker",
			minLevel: LogLevel.INFO,
			enableConsole: false,
			enableStructured: true,
			maskSensitiveData: true,
		},
		audit: {
			enableDataChangeTracking: true,
			trackPreviousValues: true,
			criticalEventsOnly: false,
		},
		trpc: {
			logRequests: true,
			logResponses: false,
			logErrors: true,
			logPerformance: true,
		},
		request: {
			logRequests: true,
			logResponses: true,
			logHeaders: false,
			excludeStaticAssets: true,
		},
	},

	/**
	 * Testing environment configuration
	 */
	testing: {
		logger: {
			service: "vet-med-tracker-test",
			minLevel: LogLevel.WARN,
			enableConsole: false,
			enableStructured: true,
			maskSensitiveData: true,
		},
		audit: {
			enableDataChangeTracking: false,
			trackPreviousValues: false,
			criticalEventsOnly: true,
		},
		trpc: {
			logRequests: false,
			logResponses: false,
			logErrors: true,
			logPerformance: false,
		},
		request: {
			logRequests: false,
			logResponses: false,
			logHeaders: false,
			excludeStaticAssets: true,
		},
	},
};

/**
 * Utility to get environment-specific configuration
 */
export function getEnvironmentConfig() {
	const env: string = process.env.NODE_ENV || "development";

	if (env === "production") {
		return LoggingConfig.production;
	}
	if (env === "test" || env === "testing") {
		return LoggingConfig.testing;
	}
	return LoggingConfig.development;
}

/**
 * Initialize logging system with environment-specific configuration
 */
export function initializeLogging() {
	const config = getEnvironmentConfig();

	// The logger is already initialized as a singleton
	// This function is here for any future initialization needs

	return {
		logger,
		auditLogger,
		config,
	};
}

/**
 * Common logging patterns for VetMed Tracker
 */
export const VetMedLogging = {
	/**
	 * Log user actions with household context
	 */
	async userAction(
		action: string,
		userId: string,
		householdId?: string,
		metadata?: Record<string, unknown>,
		correlationId?: string,
	): Promise<void> {
		await logger.info(
			`User action: ${action}`,
			{
				userId,
				householdId,
				action,
				...metadata,
			},
			correlationId,
		);
	},

	/**
	 * Log medication-related events with animal context
	 */
	async medicationEvent(
		event: string,
		userId: string,
		householdId: string,
		animalId: string,
		medicationInfo: Record<string, unknown>,
		correlationId?: string,
	): Promise<void> {
		await logger.info(
			`Medication event: ${event}`,
			{
				userId,
				householdId,
				animalId,
				event,
				medication: medicationInfo,
			},
			correlationId,
		);
	},

	/**
	 * Log system health and performance metrics
	 */
	async systemHealth(
		component: string,
		status: "healthy" | "degraded" | "unhealthy",
		metrics?: Record<string, unknown>,
		correlationId?: string,
	): Promise<void> {
		const _level =
			status === "healthy"
				? LogLevel.INFO
				: status === "degraded"
					? LogLevel.WARN
					: LogLevel.ERROR;

		await logger.info(
			`System health: ${component} is ${status}`,
			{
				component,
				status,
				...metrics,
			},
			correlationId,
		);
	},

	/**
	 * Log business logic errors with context
	 */
	async businessError(
		operation: string,
		error: Error,
		userId?: string,
		householdId?: string,
		metadata?: Record<string, unknown>,
		correlationId?: string,
	): Promise<void> {
		await logger.error(
			`Business logic error in ${operation}`,
			error,
			{
				operation,
				userId,
				householdId,
				...metadata,
			},
			correlationId,
		);
	},
};
