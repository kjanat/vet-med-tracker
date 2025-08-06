/**
 * Comprehensive Health Check Library
 *
 * Provides lightweight and fast health checks for all system components
 * including database, Redis, circuit breakers, and external services.
 * Designed for use in monitoring, load balancers, and debugging.
 */

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
	checkDatabaseHealth,
	comprehensiveHealthCheck,
	testRawConnection,
} from "@/lib/db-monitoring";
import {
	type CircuitBreakerStats,
	checkAllCircuitBreakers,
} from "@/lib/redis/circuit-breaker";
import { checkRedisHealth } from "@/lib/redis/client";

/**
 * Health check severity levels
 */
export enum HealthSeverity {
	HEALTHY = "healthy",
	DEGRADED = "degraded",
	UNHEALTHY = "unhealthy",
	CRITICAL = "critical",
}

/**
 * Individual component health status
 */
export interface ComponentHealth {
	status: HealthSeverity;
	message: string;
	lastChecked: Date;
	responseTime?: number;
	details?: Record<string, unknown>;
	metadata?: {
		version?: string;
		endpoint?: string;
		dependencies?: string[];
	};
}

/**
 * Comprehensive health report
 */
export interface HealthReport {
	overall: HealthSeverity;
	timestamp: Date;
	uptime: number;
	version: string;
	environment: string;
	components: {
		liveness: ComponentHealth;
		readiness: ComponentHealth;
		database: ComponentHealth;
		redis: ComponentHealth;
		circuitBreakers: {
			database: ComponentHealth;
			critical: ComponentHealth;
			analytics: ComponentHealth;
			batch: ComponentHealth;
			redis: ComponentHealth;
		};
		connectionQueue: ComponentHealth;
		externalServices: ComponentHealth;
	};
	metrics: {
		database: ConnectionMetrics;
		redis: {
			healthy: boolean;
			latency?: number;
			error?: string;
		};
		circuitBreakers: {
			local: {
				database: CircuitMetrics;
				critical: CircuitMetrics;
				analytics: CircuitMetrics;
				batch: CircuitMetrics;
			};
			redis: Record<string, CircuitBreakerStats>;
		};
		queue: Record<string, QueueStats>;
		responseTime: number;
	};
	alerts: Alert[];
	degradation?: {
		active: boolean;
		reason: string;
		since: Date;
		components: string[];
	};
}

/**
 * Alert information
 */
export interface Alert {
	severity: HealthSeverity;
	component: string;
	message: string;
	timestamp: Date;
	code?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
	includeMetrics: boolean;
	includeDependencies: boolean;
	timeoutMs: number;
	cacheMs: number;
	thresholds: {
		database: {
			maxResponseTime: number;
			maxUsagePercentage: number;
		};
		redis: {
			maxLatency: number;
		};
		queue: {
			maxQueuedItems: number;
			maxTotalQueued: number;
		};
		circuitBreaker: {
			alertOnHalfOpen: boolean;
			alertOnOpen: boolean;
		};
	};
}

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
	includeMetrics: true,
	includeDependencies: true,
	timeoutMs: 5000,
	cacheMs: 10000,
	thresholds: {
		database: {
			maxResponseTime: 3000,
			maxUsagePercentage: 80,
		},
		redis: {
			maxLatency: 1000,
		},
		queue: {
			maxQueuedItems: 50,
			maxTotalQueued: 200,
		},
		circuitBreaker: {
			alertOnHalfOpen: true,
			alertOnOpen: true,
		},
	},
};

/**
 * Application start time for uptime calculation
 */
const APP_START_TIME = Date.now();

/**
 * Simple cache for health check results
 */
interface HealthCheckCache {
	data: Partial<HealthReport>;
	timestamp: number;
}

let healthCache: HealthCheckCache | null = null;

/**
 * Basic liveness check - indicates the application is running
 * This should be the fastest possible check for load balancers
 */
export async function livenessCheck(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		// Minimal check - just verify the process is responsive
		const memory = process.memoryUsage();
		const responseTime = Date.now() - start;

		return {
			status: HealthSeverity.HEALTHY,
			message: "Application is alive and responsive",
			lastChecked: new Date(),
			responseTime,
			details: {
				uptime: Date.now() - APP_START_TIME,
				memoryUsage: {
					rss: Math.round(memory.rss / 1024 / 1024),
					heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
					heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
				},
				nodeVersion: process.version,
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Liveness check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Readiness check - indicates the application can serve traffic
 * Checks essential dependencies without detailed metrics
 */
export async function readinessCheck(
	config: Partial<HealthCheckConfig> = {},
): Promise<ComponentHealth> {
	const start = Date.now();
	const _mergedConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };

	try {
		// Quick parallel checks of essential services
		const [dbCheck, redisCheck, circuitCheck] = await Promise.allSettled([
			checkDatabaseHealthQuick(),
			checkRedisHealthQuick(),
			checkCriticalCircuitBreakers(),
		]);

		const responseTime = Date.now() - start;

		// Check if any critical service failed
		const failures: string[] = [];

		if (
			dbCheck.status === "rejected" ||
			(dbCheck.status === "fulfilled" && !dbCheck.value.isHealthy)
		) {
			failures.push("database");
		}

		if (
			redisCheck.status === "rejected" ||
			(redisCheck.status === "fulfilled" && !redisCheck.value.healthy)
		) {
			failures.push("redis");
		}

		if (
			circuitCheck.status === "rejected" ||
			(circuitCheck.status === "fulfilled" && !circuitCheck.value.healthy)
		) {
			failures.push("circuit-breakers");
		}

		if (failures.length > 0) {
			return {
				status: HealthSeverity.UNHEALTHY,
				message: `Readiness check failed: ${failures.join(", ")} not ready`,
				lastChecked: new Date(),
				responseTime,
				details: {
					failedComponents: failures,
					totalChecks: 3,
				},
			};
		}

		return {
			status: HealthSeverity.HEALTHY,
			message: "Application is ready to serve traffic",
			lastChecked: new Date(),
			responseTime,
			details: {
				checkedComponents: ["database", "redis", "circuit-breakers"],
				totalChecks: 3,
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Readiness check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Database health check with circuit breaker integration
 */
export async function checkDatabaseHealthWithMetrics(
	config: Partial<HealthCheckConfig> = {},
): Promise<ComponentHealth> {
	const start = Date.now();
	const mergedConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };

	try {
		const dbHealth = await comprehensiveHealthCheck({
			maxResponseTime: mergedConfig.thresholds.database.maxResponseTime,
			maxUsagePercentage: mergedConfig.thresholds.database.maxUsagePercentage,
		});

		const responseTime = Date.now() - start;

		// Determine severity based on health status and thresholds
		let status = HealthSeverity.HEALTHY;
		let message = "Database is healthy";

		if (!dbHealth.isHealthy) {
			status = HealthSeverity.UNHEALTHY;
			message = `Database health issues: ${dbHealth.error || "Unknown error"}`;
		} else if (
			dbHealth.responseTime > mergedConfig.thresholds.database.maxResponseTime
		) {
			status = HealthSeverity.DEGRADED;
			message = `Database response time high: ${dbHealth.responseTime}ms`;
		} else if (
			dbHealth.usagePercentage &&
			dbHealth.usagePercentage >
				mergedConfig.thresholds.database.maxUsagePercentage
		) {
			status = HealthSeverity.DEGRADED;
			message = `Database usage high: ${dbHealth.usagePercentage}%`;
		}

		return {
			status,
			message,
			lastChecked: new Date(),
			responseTime,
			details: {
				connectionCount: dbHealth.connectionCount,
				usagePercentage: dbHealth.usagePercentage,
				dbResponseTime: dbHealth.responseTime,
				rawConnection: await testRawConnection(),
			},
			metadata: {
				version: "postgresql",
				endpoint: "neon-database",
				dependencies: ["neon", "drizzle"],
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Database check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Redis health check with latency monitoring
 */
export async function checkRedisHealthWithMetrics(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		const redisHealth = await checkRedisHealth();
		const responseTime = Date.now() - start;

		let status = HealthSeverity.HEALTHY;
		let message = "Redis is healthy";

		if (!redisHealth.healthy) {
			status = HealthSeverity.UNHEALTHY;
			message = `Redis health issues: ${redisHealth.error || "Unknown error"}`;
		} else if (
			redisHealth.latency &&
			redisHealth.latency > DEFAULT_HEALTH_CONFIG.thresholds.redis.maxLatency
		) {
			status = HealthSeverity.DEGRADED;
			message = `Redis latency high: ${redisHealth.latency}ms`;
		}

		return {
			status,
			message,
			lastChecked: new Date(),
			responseTime,
			details: {
				latency: redisHealth.latency,
				healthy: redisHealth.healthy,
				error: redisHealth.error,
			},
			metadata: {
				version: "upstash-redis",
				endpoint: "upstash-rest-api",
				dependencies: ["@upstash/redis"],
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Redis check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Local circuit breakers health check
 */
export async function checkLocalCircuitBreakers(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		const breakers = {
			database: databaseCircuitBreaker,
			critical: criticalCircuitBreaker,
			analytics: analyticsCircuitBreaker,
			batch: batchCircuitBreaker,
		};

		const metrics: Record<string, CircuitMetrics> = {};
		const issues: string[] = [];

		for (const [name, breaker] of Object.entries(breakers)) {
			const metric = breaker.getMetrics();
			metrics[name] = metric;

			if (metric.state === CircuitState.OPEN) {
				issues.push(`${name} circuit breaker is OPEN (failing)`);
			} else if (metric.state === CircuitState.HALF_OPEN) {
				issues.push(`${name} circuit breaker is HALF_OPEN (testing recovery)`);
			}
		}

		const responseTime = Date.now() - start;

		let status = HealthSeverity.HEALTHY;
		let message = "All local circuit breakers are healthy";

		if (issues.length > 0) {
			const openCount = issues.filter((i) => i.includes("OPEN")).length;
			status =
				openCount > 0 ? HealthSeverity.UNHEALTHY : HealthSeverity.DEGRADED;
			message = issues.join("; ");
		}

		return {
			status,
			message,
			lastChecked: new Date(),
			responseTime,
			details: metrics,
			metadata: {
				version: "local-circuit-breaker",
				dependencies: ["event-emitter"],
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Circuit breaker check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Redis-based circuit breakers health check
 */
export async function checkRedisCircuitBreakers(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		const circuitHealth = await checkAllCircuitBreakers();
		const responseTime = Date.now() - start;

		let status = HealthSeverity.HEALTHY;
		let message = "All Redis circuit breakers are healthy";

		if (!circuitHealth.healthy) {
			status = HealthSeverity.UNHEALTHY;
			message = `Unhealthy circuit breakers: ${circuitHealth.unhealthy.join(", ")}`;
		}

		return {
			status,
			message,
			lastChecked: new Date(),
			responseTime,
			details: {
				healthy: circuitHealth.healthy,
				stats: circuitHealth.stats,
				unhealthy: circuitHealth.unhealthy,
			},
			metadata: {
				version: "redis-circuit-breaker",
				endpoint: "upstash-redis",
				dependencies: ["@upstash/redis"],
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Redis circuit breaker check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Connection queue health check
 */
export async function checkConnectionQueueHealth(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		const queueStats = getAllQueueStats();
		const responseTime = Date.now() - start;

		let totalQueued = 0;
		const issues: string[] = [];
		const thresholds = DEFAULT_HEALTH_CONFIG.thresholds.queue;

		for (const [queueType, stats] of Object.entries(queueStats)) {
			totalQueued += stats.queuedItems;

			if (stats.queuedItems > thresholds.maxQueuedItems) {
				issues.push(
					`${queueType} queue overloaded: ${stats.queuedItems} items`,
				);
			}
		}

		if (totalQueued > thresholds.maxTotalQueued) {
			issues.push(`Total queue load high: ${totalQueued} items`);
		}

		let status = HealthSeverity.HEALTHY;
		let message = "Connection queues are healthy";

		if (issues.length > 0) {
			status = issues.some((i) => i.includes("overloaded"))
				? HealthSeverity.UNHEALTHY
				: HealthSeverity.DEGRADED;
			message = issues.join("; ");
		}

		return {
			status,
			message,
			lastChecked: new Date(),
			responseTime,
			details: {
				queues: queueStats,
				totalQueued,
				queueTypes: Object.keys(queueStats).length,
			},
			metadata: {
				version: "connection-queue",
				dependencies: ["event-emitter"],
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `Queue check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * External services health check (placeholder for future extensions)
 */
export async function checkExternalServices(): Promise<ComponentHealth> {
	const start = Date.now();

	try {
		// Placeholder for external service checks
		// Future: Clerk, push notification services, etc.
		const responseTime = Date.now() - start;

		return {
			status: HealthSeverity.HEALTHY,
			message: "No external services configured",
			lastChecked: new Date(),
			responseTime,
			details: {
				services: [],
				configured: false,
			},
			metadata: {
				version: "external-services",
			},
		};
	} catch (error) {
		return {
			status: HealthSeverity.CRITICAL,
			message: `External services check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			lastChecked: new Date(),
			responseTime: Date.now() - start,
		};
	}
}

/**
 * Comprehensive health check with all components
 */
/**
 * Helper function to run all health checks in parallel
 */
async function runHealthChecks(mergedConfig: HealthCheckConfig) {
	return Promise.allSettled([
		livenessCheck(),
		readinessCheck(mergedConfig),
		checkDatabaseHealthWithMetrics(mergedConfig),
		checkRedisHealthWithMetrics(),
		checkLocalCircuitBreakers(),
		checkRedisCircuitBreakers(),
		checkConnectionQueueHealth(),
		checkExternalServices(),
	]);
}

/**
 * Helper function to gather detailed metrics
 */
async function gatherDetailedMetrics() {
	const [dbMetrics, redisMetrics, queueMetrics, circuitMetrics] =
		await Promise.allSettled([
			comprehensiveHealthCheck(),
			checkRedisHealth(),
			getAllQueueStats(),
			Promise.all([
				databaseCircuitBreaker.getMetrics(),
				criticalCircuitBreaker.getMetrics(),
				analyticsCircuitBreaker.getMetrics(),
				batchCircuitBreaker.getMetrics(),
			]),
		]);

	return {
		database: dbMetrics.status === "fulfilled" ? dbMetrics.value : {},
		redis:
			redisMetrics.status === "fulfilled"
				? redisMetrics.value
				: { healthy: false, error: "Failed to fetch" },
		queue: queueMetrics.status === "fulfilled" ? queueMetrics.value : {},
		circuitBreakers: {
			local:
				circuitMetrics.status === "fulfilled"
					? {
							database: circuitMetrics.value[0],
							critical: circuitMetrics.value[1],
							analytics: circuitMetrics.value[2],
							batch: circuitMetrics.value[3],
						}
					: {
							database: {} as CircuitMetrics,
							critical: {} as CircuitMetrics,
							analytics: {} as CircuitMetrics,
							batch: {} as CircuitMetrics,
						},
			redis: {},
		},
	};
}

/**
 * Helper function to build health report components
 */
function buildHealthComponents(
	healthCheckResults: PromiseSettledResult<unknown>[],
) {
	// Ensure we have the expected number of results
	if (healthCheckResults.length < 8) {
		throw new Error(
			`Expected 8 health check results, got ${healthCheckResults.length}`,
		);
	}

	const [
		liveness,
		readiness,
		database,
		redis,
		localCircuitBreakers,
		redisCircuitBreakers,
		connectionQueue,
		externalServices,
	] = healthCheckResults;

	return {
		liveness: getSettledComponentHealth(
			liveness ?? {
				status: "rejected",
				reason: new Error("Liveness check undefined"),
			},
			createUnhealthyComponent("Liveness check failed"),
		),
		readiness: getSettledComponentHealth(
			readiness ?? {
				status: "rejected",
				reason: new Error("Readiness check undefined"),
			},
			createUnhealthyComponent("Readiness check failed"),
		),
		database: getSettledComponentHealth(
			database ?? {
				status: "rejected",
				reason: new Error("Database check undefined"),
			},
			createUnhealthyComponent("Database check failed"),
		),
		redis: getSettledComponentHealth(
			redis ?? {
				status: "rejected",
				reason: new Error("Redis check undefined"),
			},
			createUnhealthyComponent("Redis check failed"),
		),
		circuitBreakers: {
			database: getSettledComponentHealth(
				localCircuitBreakers ?? {
					status: "rejected",
					reason: new Error("Local circuit breakers undefined"),
				},
				createUnhealthyComponent("Database circuit breaker check failed"),
			),
			critical: getSettledComponentHealth(
				localCircuitBreakers ?? {
					status: "rejected",
					reason: new Error("Local circuit breakers undefined"),
				},
				createUnhealthyComponent("Critical circuit breaker check failed"),
			),
			analytics: getSettledComponentHealth(
				localCircuitBreakers ?? {
					status: "rejected",
					reason: new Error("Local circuit breakers undefined"),
				},
				createUnhealthyComponent("Analytics circuit breaker check failed"),
			),
			batch: getSettledComponentHealth(
				localCircuitBreakers ?? {
					status: "rejected",
					reason: new Error("Local circuit breakers undefined"),
				},
				createUnhealthyComponent("Batch circuit breaker check failed"),
			),
			redis: getSettledComponentHealth(
				redisCircuitBreakers ?? {
					status: "rejected",
					reason: new Error("Redis circuit breakers undefined"),
				},
				createUnhealthyComponent("Redis circuit breaker check failed"),
			),
		},
		connectionQueue: getSettledComponentHealth(
			connectionQueue ?? {
				status: "rejected",
				reason: new Error("Connection queue check undefined"),
			},
			createUnhealthyComponent("Connection queue check failed"),
		),
		externalServices: getSettledComponentHealth(
			externalServices ?? {
				status: "rejected",
				reason: new Error("External services check undefined"),
			},
			createUnhealthyComponent("External services check failed"),
		),
	};
}

/**
 * Helper function to create error report
 */
function createErrorHealthReport(error: unknown, start: number): HealthReport {
	return {
		overall: HealthSeverity.CRITICAL,
		timestamp: new Date(),
		uptime: Date.now() - APP_START_TIME,
		version: process.env.npm_package_version || "unknown",
		environment: process.env.NODE_ENV || "development",
		components: {
			liveness: createUnhealthyComponent("Health check system failure"),
			readiness: createUnhealthyComponent("Health check system failure"),
			database: createUnhealthyComponent("Health check system failure"),
			redis: createUnhealthyComponent("Health check system failure"),
			circuitBreakers: {
				database: createUnhealthyComponent("Health check system failure"),
				critical: createUnhealthyComponent("Health check system failure"),
				analytics: createUnhealthyComponent("Health check system failure"),
				batch: createUnhealthyComponent("Health check system failure"),
				redis: createUnhealthyComponent("Health check system failure"),
			},
			connectionQueue: createUnhealthyComponent("Health check system failure"),
			externalServices: createUnhealthyComponent("Health check system failure"),
		},
		metrics: {
			database: {} as ConnectionMetrics,
			redis: { healthy: false, error: "Health check system failure" },
			circuitBreakers: {
				local: {
					database: {} as CircuitMetrics,
					critical: {} as CircuitMetrics,
					analytics: {} as CircuitMetrics,
					batch: {} as CircuitMetrics,
				},
				redis: {},
			},
			queue: {},
			responseTime: Date.now() - start,
		},
		alerts: [
			{
				severity: HealthSeverity.CRITICAL,
				component: "health-check-system",
				message: `Health check system failure: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
			},
		],
	};
}

export async function comprehensiveHealthReport(
	config: Partial<HealthCheckConfig> = {},
): Promise<HealthReport> {
	const start = Date.now();
	const mergedConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };

	// Check cache first
	if (
		healthCache &&
		Date.now() - healthCache.timestamp < mergedConfig.cacheMs
	) {
		const cachedReport = healthCache.data as HealthReport;
		// Update timestamp but use cached data
		return {
			...cachedReport,
			timestamp: new Date(),
			metrics: {
				...cachedReport.metrics,
				responseTime: Date.now() - start,
			},
		};
	}

	try {
		// Run all health checks in parallel
		const healthCheckResults = await runHealthChecks(mergedConfig);

		// Gather detailed metrics if requested
		let detailedMetrics = {};
		if (mergedConfig.includeMetrics) {
			detailedMetrics = await gatherDetailedMetrics();
		}

		// Build the health report components
		const components = buildHealthComponents(healthCheckResults);

		// Analyze overall health and generate alerts
		const { overallStatus, alerts, degradation } =
			analyzeOverallHealth(components);

		const report: HealthReport = {
			overall: overallStatus,
			timestamp: new Date(),
			uptime: Date.now() - APP_START_TIME,
			version: process.env.npm_package_version || "unknown",
			environment: process.env.NODE_ENV || "development",
			components,
			metrics: {
				...(detailedMetrics as HealthReport["metrics"]),
				responseTime: Date.now() - start,
			},
			alerts,
			degradation,
		};

		// Cache the result
		healthCache = {
			data: report,
			timestamp: Date.now(),
		};

		return report;
	} catch (error) {
		// Return minimal error report
		return createErrorHealthReport(error, start);
	}
}

/**
 * Helper functions
 */

async function checkDatabaseHealthQuick(): Promise<{
	isHealthy: boolean;
	responseTime: number;
}> {
	const start = Date.now();
	try {
		const result = await checkDatabaseHealth();
		return {
			isHealthy: result.isHealthy,
			responseTime: Date.now() - start,
		};
	} catch {
		return {
			isHealthy: false,
			responseTime: Date.now() - start,
		};
	}
}

async function checkRedisHealthQuick(): Promise<{
	healthy: boolean;
	latency?: number;
}> {
	try {
		return await checkRedisHealth();
	} catch {
		return { healthy: false };
	}
}

async function checkCriticalCircuitBreakers(): Promise<{ healthy: boolean }> {
	try {
		const metrics = criticalCircuitBreaker.getMetrics();
		return { healthy: metrics.state === CircuitState.CLOSED };
	} catch {
		return { healthy: false };
	}
}

// Generic helper function for getting settled values (currently unused but kept for utility)
function _getSettledValue<T>(
	result: PromiseSettledResult<T>,
	defaultValue: T,
): T {
	return result.status === "fulfilled" ? result.value : defaultValue;
}

// Type-safe wrapper for component health checks
function getSettledComponentHealth(
	result: PromiseSettledResult<unknown>,
	defaultValue: ComponentHealth,
): ComponentHealth {
	return result.status === "fulfilled" &&
		typeof result.value === "object" &&
		result.value !== null &&
		"status" in result.value
		? (result.value as ComponentHealth)
		: defaultValue;
}

function createUnhealthyComponent(message: string): ComponentHealth {
	return {
		status: HealthSeverity.UNHEALTHY,
		message,
		lastChecked: new Date(),
	};
}

function analyzeOverallHealth(components: HealthReport["components"]): {
	overallStatus: HealthSeverity;
	alerts: Alert[];
	degradation?: HealthReport["degradation"];
} {
	const alerts: Alert[] = [];
	const criticalComponents: string[] = [];
	const unhealthyComponents: string[] = [];
	const degradedComponents: string[] = [];

	// Flatten all components for analysis
	const allComponents = [
		{ name: "liveness", health: components.liveness },
		{ name: "readiness", health: components.readiness },
		{ name: "database", health: components.database },
		{ name: "redis", health: components.redis },
		{
			name: "database-circuit-breaker",
			health: components.circuitBreakers.database,
		},
		{
			name: "critical-circuit-breaker",
			health: components.circuitBreakers.critical,
		},
		{
			name: "analytics-circuit-breaker",
			health: components.circuitBreakers.analytics,
		},
		{ name: "batch-circuit-breaker", health: components.circuitBreakers.batch },
		{ name: "redis-circuit-breaker", health: components.circuitBreakers.redis },
		{ name: "connection-queue", health: components.connectionQueue },
		{ name: "external-services", health: components.externalServices },
	];

	for (const { name, health } of allComponents) {
		if (health.status === HealthSeverity.CRITICAL) {
			criticalComponents.push(name);
			alerts.push({
				severity: HealthSeverity.CRITICAL,
				component: name,
				message: health.message,
				timestamp: new Date(),
			});
		} else if (health.status === HealthSeverity.UNHEALTHY) {
			unhealthyComponents.push(name);
			alerts.push({
				severity: HealthSeverity.UNHEALTHY,
				component: name,
				message: health.message,
				timestamp: new Date(),
			});
		} else if (health.status === HealthSeverity.DEGRADED) {
			degradedComponents.push(name);
			alerts.push({
				severity: HealthSeverity.DEGRADED,
				component: name,
				message: health.message,
				timestamp: new Date(),
			});
		}
	}

	// Determine overall status
	let overallStatus = HealthSeverity.HEALTHY;
	let degradation: HealthReport["degradation"] | undefined;

	if (criticalComponents.length > 0) {
		overallStatus = HealthSeverity.CRITICAL;
		degradation = {
			active: true,
			reason: `Critical failures in: ${criticalComponents.join(", ")}`,
			since: new Date(),
			components: criticalComponents,
		};
	} else if (unhealthyComponents.length > 0) {
		overallStatus = HealthSeverity.UNHEALTHY;
		degradation = {
			active: true,
			reason: `Unhealthy components: ${unhealthyComponents.join(", ")}`,
			since: new Date(),
			components: unhealthyComponents,
		};
	} else if (degradedComponents.length > 0) {
		overallStatus = HealthSeverity.DEGRADED;
		degradation = {
			active: true,
			reason: `Degraded performance in: ${degradedComponents.join(", ")}`,
			since: new Date(),
			components: degradedComponents,
		};
	}

	return {
		overallStatus,
		alerts,
		degradation,
	};
}

/**
 * Clear health check cache (useful for testing or forced refresh)
 */
export function clearHealthCache(): void {
	healthCache = null;
}

/**
 * Get current health check cache status
 */
export function getHealthCacheStatus(): {
	cached: boolean;
	age?: number;
	timestamp?: Date;
} {
	if (!healthCache) {
		return { cached: false };
	}

	return {
		cached: true,
		age: Date.now() - healthCache.timestamp,
		timestamp: new Date(healthCache.timestamp),
	};
}

/**
 * Simple health check for load balancers
 * Returns only essential status without detailed metrics
 */
export async function simpleHealthCheck(): Promise<{
	status: "healthy" | "unhealthy";
	timestamp: Date;
	uptime: number;
	checks: {
		database: boolean;
		redis: boolean;
		application: boolean;
	};
}> {
	const _start = Date.now();

	try {
		const [liveness, db, redis] = await Promise.allSettled([
			livenessCheck(),
			checkDatabaseHealthQuick(),
			checkRedisHealthQuick(),
		]);

		const checks = {
			application:
				liveness.status === "fulfilled" &&
				liveness.value.status === HealthSeverity.HEALTHY,
			database: db.status === "fulfilled" && db.value.isHealthy,
			redis: redis.status === "fulfilled" && redis.value.healthy,
		};

		const allHealthy = Object.values(checks).every(Boolean);

		return {
			status: allHealthy ? "healthy" : "unhealthy",
			timestamp: new Date(),
			uptime: Date.now() - APP_START_TIME,
			checks,
		};
	} catch {
		return {
			status: "unhealthy",
			timestamp: new Date(),
			uptime: Date.now() - APP_START_TIME,
			checks: {
				application: false,
				database: false,
				redis: false,
			},
		};
	}
}
