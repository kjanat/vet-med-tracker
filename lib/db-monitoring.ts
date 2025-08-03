import { neon } from "@neondatabase/serverless";
import { dbPooled as db } from "@/db/drizzle";

// Connection health metrics interface
export interface ConnectionMetrics {
	isHealthy: boolean;
	responseTime: number;
	connectionCount?: number;
	usagePercentage?: number;
	lastChecked: Date;
	error?: string;
}

// Alert thresholds configuration
export interface AlertThresholds {
	maxResponseTime: number; // milliseconds
	maxUsagePercentage: number; // percentage
	maxConnectionCount?: number;
}

// Default alert thresholds
export const DEFAULT_THRESHOLDS: AlertThresholds = {
	maxResponseTime: 5000, // 5 seconds
	maxUsagePercentage: 80, // 80%
	maxConnectionCount: 10, // Max connections for free tier
};

/**
 * Performs a basic database health check
 * Tests connectivity and measures response time
 */
export async function checkDatabaseHealth(
	thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
): Promise<ConnectionMetrics> {
	const startTime = Date.now();
	const lastChecked = new Date();

	try {
		// Simple connectivity test
		const testQuery = "SELECT 1 as healthy, NOW() as timestamp";
		const result = await db.execute(testQuery);

		const responseTime = Date.now() - startTime;
		const isHealthy = responseTime <= thresholds.maxResponseTime;

		return {
			isHealthy,
			responseTime,
			lastChecked,
			...(result && { connectionCount: 1 }), // Basic connection count
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;

		return {
			isHealthy: false,
			responseTime,
			lastChecked,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Gets detailed connection metrics from PostgreSQL
 * Includes active connections and usage statistics
 */
export async function getConnectionMetrics(): Promise<
	Partial<ConnectionMetrics>
> {
	try {
		// Query to get connection statistics
		const connectionQuery = `
			WITH connection_stats AS (
				SELECT count(*) as active_connections
				FROM pg_stat_activity
				WHERE state = 'active'
			),
			max_conn_setting AS (
				SELECT setting::int as max_connections
				FROM pg_settings 
				WHERE name = 'max_connections'
			)
			SELECT 
				cs.active_connections,
				mcs.max_connections,
				ROUND((cs.active_connections * 100.0 / mcs.max_connections), 2) as usage_percentage
			FROM connection_stats cs, max_conn_setting mcs
		`;

		const result = await db.execute(connectionQuery);

		// Handle empty result or ensure we have data
		if (!result || !Array.isArray(result) || result.length === 0) {
			return {};
		}

		const metrics = result[0] as {
			active_connections: number;
			max_connections: number;
			usage_percentage: number;
		};

		return {
			connectionCount: Number(metrics.active_connections) || 0,
			usagePercentage: Number(metrics.usage_percentage) || 0,
		};
	} catch (error) {
		console.warn("Could not fetch detailed connection metrics:", error);
		return {};
	}
}

/**
 * Comprehensive health check including detailed metrics
 * Combines basic health check with connection statistics
 */
export async function comprehensiveHealthCheck(
	thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
): Promise<ConnectionMetrics> {
	const basicHealth = await checkDatabaseHealth(thresholds);
	const detailedMetrics = await getConnectionMetrics();

	const combined: ConnectionMetrics = {
		...basicHealth,
		...detailedMetrics,
	};

	// Update health status based on usage thresholds
	if (
		combined.usagePercentage &&
		combined.usagePercentage > thresholds.maxUsagePercentage
	) {
		combined.isHealthy = false;
		combined.error = combined.error
			? `${combined.error}; High usage: ${combined.usagePercentage}%`
			: `High usage: ${combined.usagePercentage}%`;
	}

	return combined;
}

/**
 * Calculates usage percentage based on current connections
 * Uses Neon's connection limits (typically 1000 for paid, 100 for free)
 */
export function calculateUsagePercentage(
	activeConnections: number,
	maxConnections: number = 100, // Default to free tier limit
): number {
	return Math.round((activeConnections / maxConnections) * 100);
}

/**
 * Checks if metrics exceed alert thresholds
 * Returns array of threshold violations
 */
export function checkAlertThresholds(
	metrics: ConnectionMetrics,
	thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
): string[] {
	const violations: string[] = [];

	if (metrics.responseTime > thresholds.maxResponseTime) {
		violations.push(
			`Response time ${metrics.responseTime}ms exceeds threshold ${thresholds.maxResponseTime}ms`,
		);
	}

	if (
		metrics.usagePercentage &&
		metrics.usagePercentage > thresholds.maxUsagePercentage
	) {
		violations.push(
			`Usage ${metrics.usagePercentage}% exceeds threshold ${thresholds.maxUsagePercentage}%`,
		);
	}

	if (
		thresholds.maxConnectionCount &&
		metrics.connectionCount &&
		metrics.connectionCount > thresholds.maxConnectionCount
	) {
		violations.push(
			`Connection count ${metrics.connectionCount} exceeds threshold ${thresholds.maxConnectionCount}`,
		);
	}

	return violations;
}

/**
 * Simple connection test using raw Neon client
 * Useful for testing without Drizzle overhead
 */
export async function testRawConnection(): Promise<{
	success: boolean;
	responseTime: number;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is not set");
		}
		const sql = neon(databaseUrl);
		await sql`SELECT 1`;

		return {
			success: true,
			responseTime: Date.now() - startTime,
		};
	} catch (error) {
		return {
			success: false,
			responseTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Connection monitoring utility class
 * Provides continuous monitoring capabilities
 */
export class DatabaseMonitor {
	private thresholds: AlertThresholds;
	private monitoringInterval?: NodeJS.Timeout;

	constructor(thresholds: AlertThresholds = DEFAULT_THRESHOLDS) {
		this.thresholds = thresholds;
	}

	/**
	 * Start continuous monitoring
	 */
	startMonitoring(
		intervalMs: number = 30000, // 30 seconds
		onAlert?: (violations: string[], metrics: ConnectionMetrics) => void,
	): void {
		this.monitoringInterval = setInterval(async () => {
			try {
				const metrics = await comprehensiveHealthCheck(this.thresholds);
				const violations = checkAlertThresholds(metrics, this.thresholds);

				if (violations.length > 0 && onAlert) {
					onAlert(violations, metrics);
				}
			} catch (error) {
				console.error("Monitoring check failed:", error);
			}
		}, intervalMs);
	}

	/**
	 * Stop continuous monitoring
	 */
	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
		}
	}

	/**
	 * Update monitoring thresholds
	 */
	updateThresholds(thresholds: Partial<AlertThresholds>): void {
		this.thresholds = { ...this.thresholds, ...thresholds };
	}
}
