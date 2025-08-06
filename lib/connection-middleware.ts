import { TRPCError } from "@trpc/server";
import { type NextRequest, NextResponse } from "next/server";
import {
	type CircuitMetrics,
	CircuitState,
	checkDatabaseHealthWithCircuitBreaker,
	criticalCircuitBreaker,
	databaseCircuitBreaker,
	setupCircuitBreakerLogging,
	withCircuitBreaker,
} from "./circuit-breaker";
import {
	areAllQueuesHealthy,
	connectionQueues,
	getAllQueueStats,
	type OperationType,
	pauseAllQueues,
	QUEUE_PRIORITIES,
	type QueueStats,
	resumeAllQueues,
	withConnectionQueue,
} from "./connection-queue";
import {
	type ConnectionMetrics,
	comprehensiveHealthCheck,
} from "./db-monitoring";
import {
	applyRateLimit,
	extractClientIP,
	generateRateLimitHeaders,
} from "./redis/rate-limit";

/**
 * Connection middleware configuration
 */
export interface ConnectionMiddlewareConfig {
	enableRateLimit: boolean;
	enableQueue: boolean;
	enableCircuitBreaker: boolean;
	enableAdaptiveThrottling: boolean;
	healthCheckInterval: number;
}

/**
 * Connection middleware context
 */
export interface ConnectionContext {
	userId?: string;
	householdId?: string;
	operationType: OperationType;
	endpoint: string;
	priority: number;
}

/**
 * Connection middleware result
 */
export interface ConnectionMiddlewareResult {
	allowed: boolean;
	error?: string;
	headers?: Record<string, string>;
	waitTime?: number;
	degraded?: boolean;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
	// API routes - general
	api: { requests: 100, windowMs: 60000 }, // 100 requests per minute

	// Authentication routes
	auth: { requests: 5, windowMs: 900000 }, // 5 auth attempts per 15 minutes

	// Database heavy operations
	heavy: { requests: 10, windowMs: 60000 }, // 10 requests per minute

	// Medication recording (core feature)
	recording: { requests: 30, windowMs: 60000 }, // 30 recordings per minute

	// File uploads
	upload: { requests: 10, windowMs: 300000 }, // 10 uploads per 5 minutes

	// Reports and exports
	reports: { requests: 5, windowMs: 60000 }, // 5 reports per minute
} as const;

/**
 * Queue status interface (enhanced for multiple queues)
 */
export interface QueueStatusInfo {
	healthy: boolean;
	stats: Record<OperationType, QueueStats>;
	overallStats: {
		totalActive: number;
		totalQueued: number;
		totalProcessed: number;
		totalFailed: number;
	};
}

/**
 * Circuit breaker info interface
 */
export interface CircuitBreakerInfo {
	state: CircuitState;
	healthy: boolean;
	metrics: CircuitMetrics;
}

/**
 * System status interface
 */
export interface SystemStatus {
	healthy: boolean;
	rateLimiting: boolean;
	queueStatus: QueueStatusInfo;
	circuitBreakers: {
		database: CircuitBreakerInfo;
		critical: CircuitBreakerInfo;
	};
	degraded: boolean;
	message?: string;
}

/**
 * Emergency controls status interface
 */
export interface EmergencyStatus {
	paused: boolean;
	queueStats: QueueStats;
	circuitStates: {
		database: CircuitState;
		critical: CircuitState;
	};
}

/**
 * Global middleware configuration
 */
const middlewareConfig: ConnectionMiddlewareConfig = {
	enableRateLimit: true,
	enableQueue: true,
	enableCircuitBreaker: true,
	enableAdaptiveThrottling: false, // Disable to prevent health check query spam
	healthCheckInterval: 30000, // 30 seconds
};

/**
 * Connection health metrics cache
 */
let _lastHealthCheck: {
	timestamp: number;
	metrics: ConnectionMetrics;
} | null = null;

/**
 * Main connection middleware class
 */
export class ConnectionMiddleware {
	private config: ConnectionMiddlewareConfig;
	private healthCheckTimer?: NodeJS.Timeout;

	constructor(config: Partial<ConnectionMiddlewareConfig> = {}) {
		this.config = { ...middlewareConfig, ...config };

		if (this.config.enableAdaptiveThrottling) {
			this.startHealthMonitoring();
		}

		// Setup circuit breaker logging
		setupCircuitBreakerLogging();
	}

	/**
	 * Check if request should be allowed through middleware
	 */
	async checkRequest(
		req: NextRequest,
		context: Partial<ConnectionContext> = {},
	): Promise<ConnectionMiddlewareResult> {
		const fullContext: ConnectionContext = {
			operationType: "read",
			endpoint: req.nextUrl.pathname,
			priority: QUEUE_PRIORITIES.NORMAL,
			...context,
		};

		const result: ConnectionMiddlewareResult = { allowed: true };
		const headers: Record<string, string> = {};

		// 1. Rate limiting check
		if (this.config.enableRateLimit) {
			const rateLimitResult = await this.checkRateLimit(req, fullContext);
			if (!rateLimitResult.allowed) {
				return rateLimitResult;
			}
			Object.assign(headers, rateLimitResult.headers || {});
		}

		// 2. Circuit breaker check
		if (this.config.enableCircuitBreaker) {
			const circuitResult = await this.checkCircuitBreaker(fullContext);
			if (!circuitResult.allowed) {
				return circuitResult;
			}
		}

		// 3. Queue capacity check
		if (this.config.enableQueue) {
			const queueResult = await this.checkQueueCapacity(fullContext);
			if (!queueResult.allowed) {
				return queueResult;
			}
		}

		// 4. Adaptive throttling
		if (this.config.enableAdaptiveThrottling) {
			const throttleResult = await this.checkAdaptiveThrottling(
				req,
				fullContext,
			);
			if (!throttleResult.allowed) {
				return throttleResult;
			}
			Object.assign(headers, throttleResult.headers || {});
		}

		result.headers = headers;
		return result;
	}

	/**
	 * Wrap database operation with all safeguards
	 */
	async withSafeguards<T>(
		operation: () => Promise<T>,
		context: Partial<ConnectionContext> = {},
	): Promise<T> {
		const fullContext: ConnectionContext = {
			operationType: "read",
			endpoint: "internal",
			priority: QUEUE_PRIORITIES.NORMAL,
			...context,
		};

		// Choose appropriate circuit breaker
		const circuitBreaker =
			fullContext.operationType === "critical"
				? criticalCircuitBreaker
				: databaseCircuitBreaker;

		// Wrap with queue and circuit breaker using the appropriate operation type
		return withConnectionQueue(
			() => withCircuitBreaker(operation, circuitBreaker),
			fullContext.priority,
			`${fullContext.operationType}_${Date.now()}`,
			fullContext.operationType,
		);
	}

	/**
	 * Get current system status
	 */
	async getSystemStatus(): Promise<SystemStatus> {
		const allQueueStats = getAllQueueStats();
		const dbCircuitMetrics = databaseCircuitBreaker.getMetrics();
		const criticalCircuitMetrics = criticalCircuitBreaker.getMetrics();

		// Calculate overall queue health and stats
		const queueHealthy = areAllQueuesHealthy();
		const overallStats = Object.values(allQueueStats).reduce(
			(acc, stats) => ({
				totalActive: acc.totalActive + stats.activeConnections,
				totalQueued: acc.totalQueued + stats.queuedItems,
				totalProcessed: acc.totalProcessed + stats.totalProcessed,
				totalFailed: acc.totalFailed + stats.totalFailed,
			}),
			{ totalActive: 0, totalQueued: 0, totalProcessed: 0, totalFailed: 0 },
		);

		const healthy =
			queueHealthy &&
			databaseCircuitBreaker.isHealthy() &&
			criticalCircuitBreaker.isHealthy();

		const degraded =
			dbCircuitMetrics.state !== CircuitState.CLOSED ||
			criticalCircuitMetrics.state !== CircuitState.CLOSED ||
			overallStats.totalQueued > 100; // Threshold for degraded state

		return {
			healthy,
			rateLimiting: this.config.enableRateLimit,
			queueStatus: {
				healthy: queueHealthy,
				stats: allQueueStats,
				overallStats,
			},
			circuitBreakers: {
				database: {
					state: dbCircuitMetrics.state,
					healthy: databaseCircuitBreaker.isHealthy(),
					metrics: dbCircuitMetrics,
				},
				critical: {
					state: criticalCircuitMetrics.state,
					healthy: criticalCircuitBreaker.isHealthy(),
					metrics: criticalCircuitMetrics,
				},
			},
			degraded,
			message: degraded ? "System running in degraded mode" : undefined,
		};
	}

	/**
	 * Private methods
	 */

	private async checkRateLimit(
		req: NextRequest,
		context: ConnectionContext,
	): Promise<ConnectionMiddlewareResult> {
		// Extract IP and determine tier/identifier
		const clientIP = extractClientIP(req.headers);
		const userId = context.userId;
		const householdId = context.householdId;

		// Determine rate limit tier based on context
		let tier: "user" | "household" | "ip" | "authenticated" | "anonymous" =
			"ip";
		let identifier = clientIP;

		if (userId) {
			tier = "user";
			identifier = userId;
		} else if (householdId) {
			tier = "household";
			identifier = householdId;
		} else if (clientIP !== "unknown") {
			tier = "ip";
			identifier = clientIP;
		} else {
			tier = "anonymous";
			identifier = "anonymous";
		}

		// Apply rate limiting
		const result = await applyRateLimit(tier, identifier, {
			// System operations and health checks bypass rate limiting
			bypassReason:
				context.endpoint === "health" || context.endpoint.includes("system")
					? "health-check"
					: undefined,
		});

		if (!result.success) {
			return {
				allowed: false,
				error: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
				headers: generateRateLimitHeaders(result) as Record<string, string>,
			};
		}

		return {
			allowed: true,
			headers: generateRateLimitHeaders(result) as Record<string, string>,
		};
	}

	private async checkCircuitBreaker(
		context: ConnectionContext,
	): Promise<ConnectionMiddlewareResult> {
		const circuitBreaker =
			context.operationType === "critical"
				? criticalCircuitBreaker
				: databaseCircuitBreaker;

		const metrics = circuitBreaker.getMetrics();

		if (metrics.state === CircuitState.OPEN) {
			return {
				allowed: false,
				error:
					"Database service is temporarily unavailable. Please try again later.",
				degraded: true,
			};
		}

		if (metrics.state === CircuitState.HALF_OPEN) {
			return {
				allowed: true,
				degraded: true,
			};
		}

		return { allowed: true };
	}

	private async checkQueueCapacity(
		context: ConnectionContext,
	): Promise<ConnectionMiddlewareResult> {
		// Get stats for the specific queue that would handle this operation
		const queue = connectionQueues[context.operationType];
		const stats = queue.getStats();

		// Calculate queue utilization based on the specific queue's max size
		const maxQueueSize =
			context.operationType === "read"
				? 300
				: context.operationType === "write"
					? 150
					: context.operationType === "batch"
						? 50
						: 20; // critical
		const queueUtilization = stats.queuedItems / maxQueueSize;

		if (queueUtilization > 0.9) {
			return {
				allowed: false,
				error: `${context.operationType} operations are at capacity. Please try again in a few moments.`,
				waitTime: stats.averageWaitTime,
			};
		}

		if (queueUtilization > 0.7) {
			return {
				allowed: true,
				degraded: true,
				waitTime: stats.averageWaitTime,
			};
		}

		return { allowed: true };
	}

	private async checkAdaptiveThrottling(
		req: NextRequest,
		_context: ConnectionContext,
	): Promise<ConnectionMiddlewareResult> {
		// Extract IP for adaptive throttling
		const clientIP = extractClientIP(req.headers);

		// Apply adaptive rate limiting with stricter limits based on system load
		const result = await applyRateLimit("ip", clientIP, {
			bypassReason: undefined, // No bypass for adaptive throttling
		});

		if (!result.success) {
			return {
				allowed: false,
				error: "System load is high. Request throttled for system stability.",
				headers: generateRateLimitHeaders(result) as Record<string, string>,
			};
		}

		return {
			allowed: true,
			headers: generateRateLimitHeaders(result) as Record<string, string>,
		};
	}

	private startHealthMonitoring(): void {
		this.healthCheckTimer = setInterval(async () => {
			try {
				const healthResult = await checkDatabaseHealthWithCircuitBreaker();
				if (healthResult.healthy) {
					const metrics = await comprehensiveHealthCheck();
					_lastHealthCheck = {
						timestamp: Date.now(),
						metrics,
					};
				}
			} catch (error) {
				console.error("Health check failed:", error);
			}
		}, this.config.healthCheckInterval);
	}

	stop(): void {
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
		}
	}
}

/**
 * Global connection middleware instance
 */
export const connectionMiddleware = new ConnectionMiddleware();

/**
 * Next.js middleware integration
 */
export async function withConnectionMiddleware(
	req: NextRequest,
	context: Partial<ConnectionContext> = {},
): Promise<NextResponse | null> {
	const result = await connectionMiddleware.checkRequest(req, context);

	if (!result.allowed) {
		const response = NextResponse.json(
			{
				error: result.error,
				degraded: result.degraded,
				waitTime: result.waitTime,
			},
			{ status: result.degraded ? 503 : 429 },
		);

		// Add headers
		if (result.headers) {
			Object.entries(result.headers).forEach(([key, value]) => {
				response.headers.set(key, value);
			});
		}

		return response;
	}

	// Add headers to successful requests
	if (result.headers) {
		const response = NextResponse.next();
		Object.entries(result.headers).forEach(([key, value]) => {
			response.headers.set(key, value);
		});
		return response;
	}

	return null; // Continue with normal processing
}

/**
 * tRPC middleware integration
 */
export function createTRPCConnectionMiddleware() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return async function connectionMiddleware({ ctx, next }: any) {
		const context: ConnectionContext = {
			userId: ctx.auth?.userId || ctx.dbUser?.id,
			householdId: ctx.currentHouseholdId || undefined,
			operationType: "read", // Default, can be overridden
			endpoint: "trpc",
			priority: QUEUE_PRIORITIES.NORMAL,
		};

		// Check if operation is allowed
		const mockRequest = {
			nextUrl: { pathname: "/api/trpc" },
			headers: ctx.headers || new Headers(),
			ip: "unknown",
		} as unknown as NextRequest;

		const globalMiddleware = new ConnectionMiddleware();
		const result = await globalMiddleware.checkRequest(mockRequest, context);

		if (!result.allowed) {
			throw new TRPCError({
				code: result.degraded ? "SERVICE_UNAVAILABLE" : "TOO_MANY_REQUESTS",
				message: result.error || "Request not allowed",
			});
		}

		return next();
	};
}

/**
 * Database operation wrapper with full safeguards
 */
export async function withDatabaseSafeguards<T>(
	operation: () => Promise<T>,
	context: Partial<ConnectionContext> = {},
): Promise<T> {
	return connectionMiddleware.withSafeguards(operation, context);
}

/**
 * Emergency circuit breaker controls
 */
export const emergencyControls = {
	/**
	 * Pause all operations (emergency stop)
	 */
	pauseAll(): void {
		pauseAllQueues();
		databaseCircuitBreaker.forceOpen();
		criticalCircuitBreaker.forceOpen();
		console.log("🚨 Emergency stop activated - all operations paused");
	},

	/**
	 * Resume operations
	 */
	resumeAll(): void {
		resumeAllQueues();
		databaseCircuitBreaker.reset();
		criticalCircuitBreaker.reset();
		console.log("✅ Operations resumed");
	},

	/**
	 * Get emergency status
	 */
	getStatus(): EmergencyStatus {
		const allStats = getAllQueueStats();
		const overallStats = Object.values(allStats).reduce(
			(acc, stats) => ({
				activeConnections: acc.activeConnections + stats.activeConnections,
				queuedItems: acc.queuedItems + stats.queuedItems,
				totalProcessed: acc.totalProcessed + stats.totalProcessed,
				totalFailed: acc.totalFailed + stats.totalFailed,
				averageWaitTime: (acc.averageWaitTime + stats.averageWaitTime) / 2,
				averageExecutionTime:
					(acc.averageExecutionTime + stats.averageExecutionTime) / 2,
			}),
			{
				activeConnections: 0,
				queuedItems: 0,
				totalProcessed: 0,
				totalFailed: 0,
				averageWaitTime: 0,
				averageExecutionTime: 0,
			},
		);

		return {
			paused: !areAllQueuesHealthy(),
			queueStats: overallStats,
			circuitStates: {
				database: databaseCircuitBreaker.getMetrics().state,
				critical: criticalCircuitBreaker.getMetrics().state,
			},
		};
	},
};

/**
 * Graceful shutdown
 */
export function shutdown(): void {
	connectionMiddleware.stop();
	// Clear all queues for graceful shutdown
	Object.values(connectionQueues).forEach((queue) => queue.clear());
	console.log("Connection middleware shut down gracefully");
}
