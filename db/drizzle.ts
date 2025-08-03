// Note: dotenv import removed to support Edge Runtime
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";
import type { ConnectionMetrics } from "@/lib/db-monitoring";
import * as schema from "./schema";

// Timeout configurations for different operation types
export const TIMEOUT_CONFIG = {
	// Standard CRUD operations
	READ: 3000, // 3 seconds
	WRITE: 5000, // 5 seconds
	// Special operations
	MIGRATION: 30000, // 30 seconds
	BATCH: 15000, // 15 seconds
	HEALTH_CHECK: 2000, // 2 seconds
	ANALYTICS: 10000, // 10 seconds
} as const;

// Create timeout error class
export class DatabaseTimeoutError extends Error {
	constructor(
		message: string,
		public timeoutMs: number,
		public operation?: string,
	) {
		super(message);
		this.name = "DatabaseTimeoutError";
	}
}

/**
 * Creates a timeout wrapper for Promise-based operations
 */
export function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	operation?: string,
): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(
					new DatabaseTimeoutError(
						`Operation timed out after ${timeoutMs}ms${
							operation ? ` (${operation})` : ""
						}`,
						timeoutMs,
						operation,
					),
				);
			}, timeoutMs);
		}),
	]);
}

/**
 * Creates a timeout wrapper using AbortSignal for fetch-based operations
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
	if (typeof AbortSignal.timeout === "function") {
		// Use native AbortSignal.timeout if available (Node.js 16.14+)
		return AbortSignal.timeout(timeoutMs);
	}

	// Fallback for older environments
	const controller = new AbortController();
	setTimeout(() => controller.abort(), timeoutMs);
	return controller.signal;
}

/**
 * Database operation wrapper with timeout and operation type detection
 */
export async function withDatabaseTimeout<T>(
	operation: () => Promise<T>,
	options: {
		timeoutMs?: number;
		operationType?: keyof typeof TIMEOUT_CONFIG;
		operationName?: string;
	} = {},
): Promise<T> {
	const {
		timeoutMs = TIMEOUT_CONFIG.READ,
		operationType,
		operationName,
	} = options;

	// Auto-detect timeout based on operation type if not explicitly provided
	const finalTimeoutMs = operationType
		? TIMEOUT_CONFIG[operationType]
		: timeoutMs;

	return withTimeout(operation(), finalTimeoutMs, operationName);
}

// Initialize monitoring lazy to avoid circular dependency
let monitor: {
	startMonitoring(
		interval: number,
		onAlert: (violations: string[], metrics: unknown) => void,
	): void;
	stopMonitoring(): void;
} | null = null;

// Connection URLs - use pooled for high-frequency operations, unpooled for long-running operations
const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;

// Configure Neon client with timeout settings
const neonConfig = {
	// Set default fetch timeout for all operations
	fetchConnectionCache: true,
	// Enable statement timeout at the client level
	...(typeof globalThis !== "undefined" && {
		fetchOptions: {
			// Default timeout for fetch operations
			signal: createTimeoutSignal(TIMEOUT_CONFIG.READ),
		},
	}),
};

// Primary pooled connection for API routes (short-lived queries)
// This is optimized for serverless environments with connection pooling
const sql = neon(DATABASE_URL, neonConfig);

// Drizzle instance with monitoring integration using pooled connection
export const db = drizzle(sql, {
	schema,
	logger: process.env.NODE_ENV === "development",
});

// Unpooled connection for migrations, batch operations, and long-running queries
// Use when you need dedicated connections or transactions
const sqlUnpooled = neon(DATABASE_URL_UNPOOLED, {
	...neonConfig,
	...(typeof globalThis !== "undefined" && {
		fetchOptions: {
			// Longer timeout for unpooled operations
			signal: createTimeoutSignal(TIMEOUT_CONFIG.MIGRATION),
		},
	}),
});
export const dbUnpooled = drizzle(sqlUnpooled, {
	schema,
	logger: process.env.NODE_ENV === "development",
});

// Connection pool for Node.js runtime environments (not Edge Runtime)
// Only initialize if running in Node.js environment
let _pool: Pool | null = null;
let _pooledDb: ReturnType<typeof drizzleServerless> | null = null;

if (
	typeof process?.versions?.node !== "undefined" &&
	process.env.NODE_ENV !== "test"
) {
	try {
		_pool = new Pool({
			connectionString: DATABASE_URL,
			// Optimized for Neon's connection limits and serverless patterns
			max: 5, // Max connections (conservative for Neon free tier)
			min: 0, // No minimum connections (serverless-friendly)
			idleTimeoutMillis: 30000, // 30 seconds idle timeout
			connectionTimeoutMillis: 10000, // 10 seconds connection timeout
			maxUses: 7500, // Recycle connections after this many queries
			allowExitOnIdle: true, // Allow process to exit when idle
			// Add statement timeout for pooled connections
			statement_timeout: TIMEOUT_CONFIG.READ, // 3 seconds default statement timeout
			query_timeout: TIMEOUT_CONFIG.WRITE, // 5 seconds query timeout
		});

		_pooledDb = drizzleServerless(_pool, {
			schema,
			logger: process.env.NODE_ENV === "development",
		});
	} catch (error) {
		console.warn(
			"Failed to initialize connection pool, falling back to HTTP client:",
			error,
		);
	}
}

// Export pooled database connection (if available) or fallback to HTTP client
// Cast to maintain type compatibility with the HTTP client
export const dbPooled = (_pooledDb || db) as typeof db;

// Global monitoring instance for external access (lazy loaded)
export const dbMonitor = monitor || {
	startMonitoring: () => {},
	stopMonitoring: () => {},
	checkHealth: () => Promise.resolve({ isHealthy: true }),
};

// Connection lifecycle management
export async function closeConnections(): Promise<void> {
	try {
		if (_pool) {
			console.log("Closing database connection pool...");
			await _pool.end();
			_pool = null;
			_pooledDb = null;
		}
		if (monitor?.stopMonitoring) {
			monitor.stopMonitoring();
		}
		console.log("Database connections closed successfully");
	} catch (error) {
		console.error("Error closing database connections:", error);
	}
}

// Helper for tenant-scoped queries with proper isolation and timeout support
export async function tenantDb<T>(
	householdId: string,
	callback: (tx: typeof db) => T | Promise<T>,
	options: {
		timeoutMs?: number;
		operationType?: keyof typeof TIMEOUT_CONFIG;
		operationName?: string;
	} = {},
): Promise<T> {
	if (!householdId) {
		throw new Error("householdId is required for tenant-scoped queries");
	}

	// Use the most appropriate connection based on operation
	// For high-frequency operations, use the pooled connection if available
	// Cast to maintain type compatibility
	const database = (_pooledDb || db) as typeof db;

	const operation = async () => {
		try {
			const result = await callback(database);
			return result;
		} catch (error) {
			console.error(`Tenant query error for household ${householdId}:`, error);
			throw error;
		}
	};

	// Apply timeout wrapper if specified
	if (options.timeoutMs || options.operationType || options.operationName) {
		return withDatabaseTimeout(operation, options);
	}

	return operation();
}

// Utility to get the best available connection for different use cases
export function getOptimalConnection(
	useCase: "api" | "migration" | "batch" | "transaction" = "api",
): typeof db {
	switch (useCase) {
		case "migration":
		case "batch":
			// Use unpooled for long-running operations
			return dbUnpooled;
		case "transaction":
			// Use pooled connection with WebSocket support if available
			return (_pooledDb || dbUnpooled) as typeof db;
		default:
			// Use pooled connection for API routes
			return dbPooled;
	}
}

/**
 * Execute a database operation with automatic timeout based on operation type
 */
export async function executeWithTimeout<T>(
	operation: () => Promise<T>,
	operationType: keyof typeof TIMEOUT_CONFIG,
	operationName?: string,
): Promise<T> {
	return withDatabaseTimeout(operation, { operationType, operationName });
}

/**
 * Create a database operation wrapper with built-in timeout and circuit breaker
 */
export function createTimedDatabaseOperation<TArgs extends unknown[], TResult>(
	operationType: keyof typeof TIMEOUT_CONFIG,
	operationName: string,
) {
	return (
		operation: (...args: TArgs) => Promise<TResult>,
	): ((...args: TArgs) => Promise<TResult>) => {
		return async (...args: TArgs): Promise<TResult> => {
			return executeWithTimeout(
				() => operation(...args),
				operationType,
				operationName,
			);
		};
	};
}

/**
 * Utility functions for common database operations with appropriate timeouts
 */
export const timedOperations = {
	/**
	 * Execute a read operation with read timeout
	 */
	read: <T>(operation: () => Promise<T>, operationName?: string): Promise<T> =>
		executeWithTimeout(operation, "READ", operationName),

	/**
	 * Execute a write operation with write timeout
	 */
	write: <T>(operation: () => Promise<T>, operationName?: string): Promise<T> =>
		executeWithTimeout(operation, "WRITE", operationName),

	/**
	 * Execute a health check with health check timeout
	 */
	healthCheck: <T>(
		operation: () => Promise<T>,
		operationName?: string,
	): Promise<T> => executeWithTimeout(operation, "HEALTH_CHECK", operationName),

	/**
	 * Execute analytics operation with analytics timeout
	 */
	analytics: <T>(
		operation: () => Promise<T>,
		operationName?: string,
	): Promise<T> => executeWithTimeout(operation, "ANALYTICS", operationName),

	/**
	 * Execute batch operation with batch timeout
	 */
	batch: <T>(operation: () => Promise<T>, operationName?: string): Promise<T> =>
		executeWithTimeout(operation, "BATCH", operationName),
};

// Initialize monitoring in production - only in Node.js runtime, not Edge Runtime
if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
	// Lazy load DatabaseMonitor to avoid circular dependency
	import("@/lib/db-monitoring").then(({ DatabaseMonitor }) => {
		monitor = new DatabaseMonitor();
		monitor.startMonitoring(60000, (violations: string[], metrics: unknown) => {
			const metricsTyped = metrics as ConnectionMetrics;
			console.error("Database health alert:", {
				violations,
				metrics: {
					responseTime: metricsTyped.responseTime,
					usagePercentage: metricsTyped.usagePercentage,
					connectionCount: metricsTyped.connectionCount,
					isHealthy: metricsTyped.isHealthy,
				},
			});
		});
	});
}

// Graceful shutdown handling - only in Node.js runtime, not Edge Runtime
if (typeof process !== "undefined" && process.on) {
	process.on("SIGTERM", async () => {
		console.log("Shutting down database connections...");
		await closeConnections();
	});

	process.on("SIGINT", async () => {
		console.log("Shutting down database connections...");
		await closeConnections();
	});

	// Handle unhandled rejections and uncaught exceptions
	process.on("unhandledRejection", async (reason, promise) => {
		console.error("Unhandled Rejection at:", promise, "reason:", reason);
		// Gracefully close connections on critical errors
		await closeConnections();
	});
}

// Export all schemas for easy access
export * from "./schema";
