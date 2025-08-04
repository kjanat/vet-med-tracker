import { NextResponse } from "next/server";
import {
	analyticsCircuitBreaker,
	batchCircuitBreaker,
	type CircuitMetrics,
	CircuitState,
	criticalCircuitBreaker,
	databaseCircuitBreaker,
} from "@/lib/circuit-breaker";
import { getAllQueueStats, type QueueStats } from "@/lib/connection-queue";
import {
	type ConnectionMetrics,
	comprehensiveHealthCheck,
	DEFAULT_THRESHOLDS,
} from "@/lib/db-monitoring";

/**
 * Health check response interface
 */
interface HealthCheckResponse {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	uptime: number;
	version: string;
	environment: string;
	components: {
		database: ComponentHealth;
		queue: ComponentHealth;
		circuitBreakers: {
			database: ComponentHealth;
			critical: ComponentHealth;
			analytics: ComponentHealth;
			batch: ComponentHealth;
		};
		rateLimit: ComponentHealth;
		errors: ComponentHealth;
	};
	metrics: {
		database: ConnectionMetrics;
		queue: Record<string, QueueStats>;
		circuitBreakers: {
			database: CircuitMetrics;
			critical: CircuitMetrics;
			analytics: CircuitMetrics;
			batch: CircuitMetrics;
		};
		errors: unknown;
	};
	alerts?: string[];
	degradation?: {
		active: boolean;
		reason: string;
		since: string;
	};
}

/**
 * Component health status
 */
interface ComponentHealth {
	status: "healthy" | "degraded" | "unhealthy";
	message?: string;
	lastChecked: string;
	responseTime?: number;
	details?: ComponentHealthValue;
}

/**
 * Component health value types
 */
type ComponentHealthValue =
	| (ConnectionMetrics & { isHealthy: boolean; responseTime?: number })
	| (QueueStats & { queuedItems: number })
	| (CircuitMetrics & { state: string })
	| {
			recentCount: number;
			total: number;
			bySeverity: Record<string, number>;
			byType: Record<string, number>;
	  }
	| Record<string, unknown>;

/**
 * Application start time for uptime calculation
 */
const startTime = Date.now();

/**
 * Simple in-memory cache for health check results
 */
interface CachedHealthCheck {
	data: ConnectionMetrics;
	timestamp: number;
}

let healthCheckCache: CachedHealthCheck | null = null;
const CACHE_TTL = 10000; // 10 seconds cache TTL

/**
 * Simple rate limiting for health check endpoint
 */
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Periodically clean up old entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
	setInterval(() => {
		const now = Date.now();
		for (const [clientId, timestamps] of requestTimestamps.entries()) {
			const recentTimestamps = timestamps.filter(
				(timestamp) => now - timestamp < RATE_LIMIT_WINDOW,
			);
			if (recentTimestamps.length === 0) {
				requestTimestamps.delete(clientId);
			} else {
				requestTimestamps.set(clientId, recentTimestamps);
			}
		}
	}, CLEANUP_INTERVAL);
}

function isRateLimited(clientId: string): boolean {
	const now = Date.now();
	const timestamps = requestTimestamps.get(clientId) || [];

	// Clean up old timestamps
	const recentTimestamps = timestamps.filter(
		(timestamp) => now - timestamp < RATE_LIMIT_WINDOW,
	);

	// Check if rate limit exceeded
	if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
		requestTimestamps.set(clientId, recentTimestamps);
		return true;
	}

	// Add current timestamp
	recentTimestamps.push(now);
	requestTimestamps.set(clientId, recentTimestamps);

	return false;
}

/**
 * Health check endpoint
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Detailed health information
 */
export async function GET(request: Request) {
	// Extract client identifier (IP or user agent for simplicity)
	const clientId =
		request.headers.get("x-forwarded-for") ||
		request.headers.get("x-real-ip") ||
		"anonymous";

	// Check rate limit
	if (isRateLimited(clientId)) {
		return NextResponse.json(
			{
				status: "rate_limited",
				message: "Too many requests. Please try again later.",
				retryAfter: 60,
			},
			{
				status: 429,
				headers: {
					"Retry-After": "60",
					"X-RateLimit-Limit": MAX_REQUESTS_PER_WINDOW.toString(),
					"X-RateLimit-Window": (RATE_LIMIT_WINDOW / 1000).toString(),
				},
			},
		);
	}

	const url = new URL(request.url);
	const detailed = url.searchParams.get("detailed") === "true";
	const checkStart = Date.now();

	try {
		// Basic health checks
		const [
			databaseHealth,
			queueStats,
			dbCircuitMetrics,
			criticalCircuitMetrics,
			analyticsCircuitMetrics,
			batchCircuitMetrics,
			errorStats,
		] = await Promise.allSettled([
			checkDatabaseHealthSafe(),
			getQueueStatsSafe(),
			getCircuitMetricsSafe(databaseCircuitBreaker),
			getCircuitMetricsSafe(criticalCircuitBreaker),
			getCircuitMetricsSafe(analyticsCircuitBreaker),
			getCircuitMetricsSafe(batchCircuitBreaker),
			getErrorStatsSafe(),
		]);

		const checkDuration = Date.now() - checkStart;

		// Build response
		const response: HealthCheckResponse = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: Date.now() - startTime,
			version: process.env.npm_package_version || "unknown",
			environment: process.env.NODE_ENV || "unknown",
			components: {
				database: buildComponentHealth(databaseHealth, "Database"),
				queue: buildComponentHealth(queueStats, "Connection Queue"),
				circuitBreakers: {
					database: buildComponentHealth(
						dbCircuitMetrics,
						"Database Circuit Breaker",
					),
					critical: buildComponentHealth(
						criticalCircuitMetrics,
						"Critical Circuit Breaker",
					),
					analytics: buildComponentHealth(
						analyticsCircuitMetrics,
						"Analytics Circuit Breaker",
					),
					batch: buildComponentHealth(
						batchCircuitMetrics,
						"Batch Circuit Breaker",
					),
				},
				rateLimit: {
					status: "healthy",
					message: "Rate limiting operational",
					lastChecked: new Date().toISOString(),
					responseTime: checkDuration,
				},
				errors: buildComponentHealth(errorStats, "Error Tracking"),
			},
			metrics: {
				database: getSettledValue(databaseHealth, {} as ConnectionMetrics),
				queue: getSettledValue(queueStats, {} as Record<string, QueueStats>),
				circuitBreakers: {
					database: getSettledValue(dbCircuitMetrics, {} as CircuitMetrics),
					critical: getSettledValue(
						criticalCircuitMetrics,
						{} as CircuitMetrics,
					),
					analytics: getSettledValue(
						analyticsCircuitMetrics,
						{} as CircuitMetrics,
					),
					batch: getSettledValue(batchCircuitMetrics, {} as CircuitMetrics),
				},
				errors: getSettledValue(errorStats, {
					total: 0,
					bySeverity: {},
					byType: {},
					recentCount: 0,
				}),
			},
		};

		// Determine overall status and alerts
		const { overallStatus, alerts, degradation } = analyzeHealth(response);
		response.status = overallStatus;
		response.alerts = alerts;
		response.degradation = degradation;

		// Set appropriate HTTP status
		let httpStatus = 200;
		if (overallStatus === "degraded") {
			httpStatus = 206; // Partial Content
		} else if (overallStatus === "unhealthy") {
			httpStatus = 503; // Service Unavailable
		}

		// Add cache headers
		const headers = {
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"Content-Type": "application/json",
			"X-Health-Check-Duration": checkDuration.toString(),
		};

		// Return detailed or basic response
		if (detailed) {
			return NextResponse.json(response, { status: httpStatus, headers });
		} else {
			// Basic response for load balancers
			return NextResponse.json(
				{
					status: response.status,
					timestamp: response.timestamp,
					uptime: response.uptime,
					database: response.components.database.status,
					queue: response.components.queue.status,
				},
				{ status: httpStatus, headers },
			);
		}
	} catch (error) {
		console.error("Health check failed:", error);

		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error: "Health check failed",
				uptime: Date.now() - startTime,
			},
			{
				status: 503,
				headers: {
					"Cache-Control": "no-cache, no-store, must-revalidate",
					"Content-Type": "application/json",
				},
			},
		);
	}
}

/**
 * Safe wrapper functions to handle errors gracefully
 */
async function checkDatabaseHealthSafe(): Promise<ConnectionMetrics> {
	// Check if we have a valid cached result
	if (healthCheckCache && Date.now() - healthCheckCache.timestamp < CACHE_TTL) {
		// Return cached data with updated lastChecked time
		return {
			...healthCheckCache.data,
			lastChecked: new Date(),
		};
	}

	try {
		const result = await comprehensiveHealthCheck();

		// Cache the successful result
		healthCheckCache = {
			data: result,
			timestamp: Date.now(),
		};

		return result;
	} catch (error) {
		return {
			isHealthy: false,
			responseTime: 0,
			lastChecked: new Date(),
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function getQueueStatsSafe(): Promise<Record<string, QueueStats>> {
	try {
		return getAllQueueStats();
	} catch {
		return {
			read: {
				activeConnections: 0,
				queuedItems: 0,
				totalProcessed: 0,
				totalFailed: 0,
				averageWaitTime: 0,
				averageExecutionTime: 0,
			},
			write: {
				activeConnections: 0,
				queuedItems: 0,
				totalProcessed: 0,
				totalFailed: 0,
				averageWaitTime: 0,
				averageExecutionTime: 0,
			},
			batch: {
				activeConnections: 0,
				queuedItems: 0,
				totalProcessed: 0,
				totalFailed: 0,
				averageWaitTime: 0,
				averageExecutionTime: 0,
			},
			critical: {
				activeConnections: 0,
				queuedItems: 0,
				totalProcessed: 0,
				totalFailed: 0,
				averageWaitTime: 0,
				averageExecutionTime: 0,
			},
		};
	}
}

async function getCircuitMetricsSafe(circuitBreaker: {
	getMetrics(): CircuitMetrics;
}): Promise<CircuitMetrics> {
	try {
		return circuitBreaker.getMetrics();
	} catch {
		return {
			state: CircuitState.CLOSED,
			failureCount: 0,
			successCount: 0,
			totalRequests: 0,
			uptime: 0,
			failureRate: 0,
		};
	}
}

async function getErrorStatsSafe(): Promise<{
	total: number;
	bySeverity: Record<string, number>;
	byType: Record<string, number>;
	recentCount: number;
}> {
	// Return empty stats since ErrorReporter is not implemented
	return {
		total: 0,
		bySeverity: {},
		byType: {},
		recentCount: 0,
	};
}

/**
 * Helper functions
 */
function getSettledValue<T>(
	result: PromiseSettledResult<T>,
	defaultValue: T,
): T {
	return result.status === "fulfilled" ? result.value : defaultValue;
}

/**
 * Check database health status
 */
function checkDatabaseHealth(
	value: ComponentHealthValue,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } | null {
	if ("isHealthy" in value && value.isHealthy !== undefined) {
		const status = value.isHealthy ? "healthy" : "unhealthy";
		const message = value.isHealthy
			? `${componentName} responding normally`
			: `${componentName} health issues detected`;
		return { status, message };
	}
	return null;
}

/**
 * Get the maximum queue size for a specific queue type
 */
function getMaxQueueSize(queueType: string): number {
	switch (queueType) {
		case "read":
			return 300;
		case "write":
			return 150;
		case "batch":
			return 50;
		default: // critical
			return 20;
	}
}

/**
 * Check individual queue status and add problems to the array
 */
function checkIndividualQueue(
	queueType: string,
	stats: { queuedItems: number; activeConnections: number },
	problems: string[],
): number {
	const maxQueueSize = getMaxQueueSize(queueType);
	const utilization = stats.queuedItems / maxQueueSize;

	if (utilization > 0.9) {
		problems.push(
			`${queueType} queue overloaded (${stats.queuedItems}/${maxQueueSize})`,
		);
	} else if (utilization > 0.7) {
		problems.push(
			`${queueType} queue high load (${stats.queuedItems}/${maxQueueSize})`,
		);
	}

	return stats.queuedItems;
}

/**
 * Determine queue health status based on problems and total queue count
 */
function determineQueueStatus(
	problems: string[],
	totalQueued: number,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } {
	if (problems.some((p) => p.includes("overloaded"))) {
		return {
			status: "unhealthy",
			message: `${componentName}: ${problems.join(", ")}`,
		};
	}
	if (problems.length > 0) {
		return {
			status: "degraded",
			message: `${componentName}: ${problems.join(", ")}`,
		};
	}
	if (totalQueued > 200) {
		return {
			status: "degraded",
			message: `${componentName} total queue load high: ${totalQueued} items`,
		};
	}
	return {
		status: "healthy",
		message: `${componentName} all queues operational`,
	};
}

/**
 * Check multiple queue format health
 */
function checkMultipleQueues(
	queueStats: Record<
		string,
		{ queuedItems: number; activeConnections: number }
	>,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } {
	let totalQueued = 0;
	const problems: string[] = [];

	for (const [queueType, stats] of Object.entries(queueStats)) {
		totalQueued += checkIndividualQueue(queueType, stats, problems);
	}

	return determineQueueStatus(problems, totalQueued, componentName);
}

/**
 * Check legacy single queue format health
 */
function checkLegacyQueue(
	queueValue: { queuedItems: number },
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } {
	if (queueValue.queuedItems > 100) {
		return { status: "unhealthy", message: `${componentName} overloaded` };
	}
	if (queueValue.queuedItems > 50) {
		return {
			status: "degraded",
			message: `${componentName} experiencing high load`,
		};
	}
	return { status: "healthy", message: `${componentName} operational` };
}

/**
 * Check queue health status (supports both single queue and multiple queues)
 */
function checkQueueHealth(
	value: ComponentHealthValue,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } | null {
	// Handle new multiple queue format
	if (typeof value === "object" && value !== null && "read" in value) {
		const queueStats = value as Record<
			string,
			{ queuedItems: number; activeConnections: number }
		>;
		return checkMultipleQueues(queueStats, componentName);
	}

	// Handle legacy single queue format
	if (
		"queuedItems" in value &&
		value.queuedItems !== undefined &&
		value.queuedItems !== null
	) {
		const queueValue = value as { queuedItems: number };
		return checkLegacyQueue(queueValue, componentName);
	}
	return null;
}

/**
 * Check circuit breaker health status
 */
function checkCircuitBreakerHealth(
	value: ComponentHealthValue,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } | null {
	if ("state" in value && value.state !== undefined) {
		switch (value.state) {
			case "CLOSED":
				return {
					status: "healthy",
					message: `${componentName} closed (normal operation)`,
				};
			case "HALF_OPEN":
				return {
					status: "degraded",
					message: `${componentName} half-open (testing recovery)`,
				};
			case "OPEN":
				return {
					status: "unhealthy",
					message: `${componentName} open (failing)`,
				};
		}
	}
	return null;
}

/**
 * Check error stats health status
 */
function checkErrorStatsHealth(
	value: ComponentHealthValue,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } | null {
	if (
		"recentCount" in value &&
		value.recentCount !== undefined &&
		value.recentCount !== null
	) {
		const errorValue = value as { recentCount: number };
		if (errorValue.recentCount > 50) {
			return {
				status: "unhealthy",
				message: `Critical error rate: ${errorValue.recentCount} errors in last hour`,
			};
		}
		if (errorValue.recentCount > 10) {
			return {
				status: "degraded",
				message: `High error rate: ${errorValue.recentCount} errors in last hour`,
			};
		}
		return {
			status: "healthy",
			message: `${componentName} error rate normal`,
		};
	}
	return null;
}

/**
 * Determine component health status based on value type
 */
function determineComponentStatus(
	value: ComponentHealthValue,
	componentName: string,
): { status: "healthy" | "degraded" | "unhealthy"; message: string } {
	// Check each health type in order of severity
	const checks = [
		checkDatabaseHealth,
		checkQueueHealth,
		checkCircuitBreakerHealth,
		checkErrorStatsHealth,
	];

	for (const check of checks) {
		const result = check(value, componentName);
		if (result) {
			return result;
		}
	}

	// Default healthy status
	return { status: "healthy", message: `${componentName} operational` };
}

function buildComponentHealth(
	result: PromiseSettledResult<unknown>,
	componentName: string,
): ComponentHealth {
	const now = new Date().toISOString();

	if (result.status === "rejected") {
		return {
			status: "unhealthy",
			message: `${componentName} check failed: ${result.reason}`,
			lastChecked: now,
		};
	}

	const value = result.value as ComponentHealthValue;

	// Determine status based on component type
	const { status, message } = determineComponentStatus(value, componentName);

	return {
		status,
		message,
		lastChecked: now,
		responseTime:
			"responseTime" in value
				? (value as { responseTime: number }).responseTime
				: undefined,
		details: value,
	};
}

/**
 * Check component health status and collect alerts
 */
function checkComponentHealth(response: HealthCheckResponse): {
	alerts: string[];
	unhealthyCount: number;
	degradedCount: number;
} {
	const alerts: string[] = [];
	let unhealthyCount = 0;
	let degradedCount = 0;

	const allComponents = [
		response.components.database,
		response.components.queue,
		response.components.rateLimit,
		response.components.errors,
		...Object.values(response.components.circuitBreakers),
	];

	for (const component of allComponents) {
		if (component.status === "unhealthy") {
			unhealthyCount++;
			alerts.push(component.message || "Component unhealthy");
		} else if (component.status === "degraded") {
			degradedCount++;
			alerts.push(component.message || "Component degraded");
		}
	}

	return { alerts, unhealthyCount, degradedCount };
}

/**
 * Check database metrics thresholds and add alerts
 */
function checkDatabaseMetrics(
	dbMetrics: ConnectionMetrics,
	alerts: string[],
): void {
	if (dbMetrics.responseTime > DEFAULT_THRESHOLDS.maxResponseTime) {
		alerts.push(`Database response time high: ${dbMetrics.responseTime}ms`);
	}

	if (
		dbMetrics.usagePercentage &&
		dbMetrics.usagePercentage > DEFAULT_THRESHOLDS.maxUsagePercentage
	) {
		alerts.push(`Database usage high: ${dbMetrics.usagePercentage}%`);
	}
}

/**
 * Check individual queue metrics and add alerts
 */
function checkIndividualQueueMetrics(
	queueType: string,
	stats: { queuedItems: number },
	alerts: string[],
): number {
	const maxQueueSize = getMaxQueueSize(queueType);
	const utilization = stats.queuedItems / maxQueueSize;

	if (utilization > 0.8) {
		alerts.push(
			`${queueType} queue backing up: ${stats.queuedItems}/${maxQueueSize} items`,
		);
	}

	return stats.queuedItems;
}

/**
 * Check multiple queue metrics format
 */
function checkMultipleQueueMetrics(
	queueMetrics: Record<string, QueueStats>,
	alerts: string[],
): void {
	let totalQueued = 0;
	for (const [queueType, stats] of Object.entries(queueMetrics)) {
		totalQueued += checkIndividualQueueMetrics(queueType, stats, alerts);
	}
	if (totalQueued > 100) {
		alerts.push(
			`Total queue load high: ${totalQueued} items across all queues`,
		);
	}
}

/**
 * Type guard to check if value has queuedItems property
 */
function hasQueuedItems(value: unknown): value is { queuedItems: number } {
	return (
		typeof value === "object" &&
		value !== null &&
		"queuedItems" in value &&
		typeof (value as { queuedItems: unknown }).queuedItems === "number"
	);
}

/**
 * Check legacy single queue metrics format
 */
function checkLegacyQueueMetrics(
	queueMetrics: Record<string, QueueStats>,
	alerts: string[],
): void {
	if (hasQueuedItems(queueMetrics)) {
		const legacyQueue = queueMetrics as unknown as QueueStats;
		if (legacyQueue.queuedItems > 50) {
			alerts.push(
				`Connection queue backing up: ${legacyQueue.queuedItems} items`,
			);
		}
	}
}

/**
 * Check queue metrics thresholds and add alerts
 */
function checkQueueMetrics(
	queueMetrics: Record<string, QueueStats>,
	alerts: string[],
): void {
	if (typeof queueMetrics === "object" && "read" in queueMetrics) {
		// New multiple queue format
		checkMultipleQueueMetrics(queueMetrics, alerts);
	} else {
		// Legacy single queue format
		checkLegacyQueueMetrics(queueMetrics, alerts);
	}
}

/**
 * Check metrics thresholds and collect alerts
 */
function checkMetricsThresholds(response: HealthCheckResponse): string[] {
	const alerts: string[] = [];

	// Check database metrics
	checkDatabaseMetrics(response.metrics.database, alerts);

	// Check queue metrics (support multiple queues)
	checkQueueMetrics(response.metrics.queue, alerts);

	return alerts;
}

/**
 * Determine overall system status
 */
function determineOverallStatus(
	unhealthyCount: number,
	degradedCount: number,
	alertCount: number,
): "healthy" | "degraded" | "unhealthy" {
	if (unhealthyCount > 0) {
		return "unhealthy";
	} else if (degradedCount > 0 || alertCount > 0) {
		return "degraded";
	} else {
		return "healthy";
	}
}

function analyzeHealth(response: HealthCheckResponse): {
	overallStatus: "healthy" | "degraded" | "unhealthy";
	alerts: string[];
	degradation?: {
		active: boolean;
		reason: string;
		since: string;
	};
} {
	// Check component health
	const {
		alerts: componentAlerts,
		unhealthyCount,
		degradedCount,
	} = checkComponentHealth(response);

	// Check metrics thresholds
	const metricsAlerts = checkMetricsThresholds(response);

	// Combine all alerts
	const alerts = [...componentAlerts, ...metricsAlerts];

	// Determine overall status
	const overallStatus = determineOverallStatus(
		unhealthyCount,
		degradedCount,
		alerts.length,
	);

	// Degradation info
	let degradation:
		| {
				active: boolean;
				reason: string;
				since: string;
		  }
		| undefined;
	if (overallStatus !== "healthy") {
		degradation = {
			active: true,
			reason: alerts[0] || "System performance degraded",
			since: new Date().toISOString(), // TODO: Track actual degradation start time
		};
	}

	return {
		overallStatus,
		alerts,
		degradation,
	};
}

/**
 * Options for pre-flight requests
 */
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
