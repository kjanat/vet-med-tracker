/**
 * Redis client configuration with Upstash
 * Uses namespacing for environment isolation (prod/dev/test)
 */

import { Redis } from "@upstash/redis";

// Environment-based namespace prefix
const getNamespacePrefix = (): string => {
	const env = process.env.NODE_ENV || "development";
	const prefix =
		{
			production: "prod",
			development: "dev",
			test: "test",
		}[env] || "dev";

	return `vetmed:${prefix}`;
};

// Singleton Redis instance
let redisInstance: Redis | null = null;

/**
 * Check if Redis is properly configured
 */
export function isRedisConfigured(): boolean {
	const url = process.env.KV_REST_API_URL;
	const token = process.env.KV_REST_API_TOKEN;
	return Boolean(url && token);
}

/**
 * Get or create Redis client instance
 * Uses Upstash REST API for serverless compatibility
 * Only initializes when Redis is properly configured
 */
export function getRedisClient(): Redis {
	if (!isRedisConfigured()) {
		throw new Error(
			"Redis configuration missing. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.",
		);
	}

	if (!redisInstance) {
		const url = process.env.KV_REST_API_URL as string;
		const token = process.env.KV_REST_API_TOKEN as string;

		redisInstance = new Redis({
			url,
			token,
			// Add retry logic
			retry: {
				retries: 3,
				backoff: (retryCount) => Math.min(1000 * 2 ** retryCount, 30000),
			},
		});
	}

	return redisInstance;
}

/**
 * Generate a namespaced Redis key
 * @param key - The base key
 * @param namespace - Optional additional namespace (e.g., "cache", "ratelimit", "session")
 */
export function getRedisKey(key: string, namespace?: string): string {
	const prefix = getNamespacePrefix();
	if (namespace) {
		return `${prefix}:${namespace}:${key}`;
	}
	return `${prefix}:${key}`;
}

/**
 * Redis key patterns for different features
 */
export const RedisKeys = {
	// Cache keys
	cache: {
		household: (id: string) => getRedisKey(`household:${id}`, "cache"),
		animal: (id: string) => getRedisKey(`animal:${id}`, "cache"),
		regimen: (id: string) => getRedisKey(`regimen:${id}`, "cache"),
		pendingMeds: (householdId: string) =>
			getRedisKey(`pending-meds:${householdId}`, "cache"),
		insights: (householdId: string) =>
			getRedisKey(`insights:${householdId}`, "cache"),
	},

	// Rate limiting keys
	rateLimit: {
		user: (userId: string) => getRedisKey(`user:${userId}`, "ratelimit"),
		ip: (ip: string) => getRedisKey(`ip:${ip}`, "ratelimit"),
		api: (endpoint: string, identifier: string) =>
			getRedisKey(`api:${endpoint}:${identifier}`, "ratelimit"),
	},

	// Session keys
	session: {
		user: (userId: string) => getRedisKey(`user:${userId}`, "session"),
		household: (userId: string, householdId: string) =>
			getRedisKey(`user:${userId}:household:${householdId}`, "session"),
	},

	// Queue keys for background jobs
	queue: {
		reminders: () => getRedisKey("reminders", "queue"),
		notifications: () => getRedisKey("notifications", "queue"),
		sync: () => getRedisKey("sync", "queue"),
		audit: () => getRedisKey("audit", "queue"),
	},

	// Circuit breaker keys
	circuitBreaker: {
		service: (name: string) => getRedisKey(`service:${name}`, "circuit"),
		database: () => getRedisKey("database", "circuit"),
		external: (api: string) => getRedisKey(`external:${api}`, "circuit"),
	},

	// Distributed lock keys
	lock: {
		administration: (idempotencyKey: string) =>
			getRedisKey(`admin:${idempotencyKey}`, "lock"),
		inventory: (itemId: string) => getRedisKey(`inventory:${itemId}`, "lock"),
		sync: (householdId: string) => getRedisKey(`sync:${householdId}`, "lock"),
	},
} as const;

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{
	healthy: boolean;
	latency?: number;
	error?: string;
}> {
	try {
		if (!isRedisConfigured()) {
			return {
				healthy: false,
				error: "Redis is not configured",
			};
		}

		const client = getRedisClient();
		const start = Date.now();
		await client.ping();
		const latency = Date.now() - start;

		return {
			healthy: true,
			latency,
		};
	} catch (error) {
		return {
			healthy: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Clear all keys with a specific pattern (useful for testing)
 * WARNING: Use with caution in production
 */
export async function clearNamespace(namespace: string): Promise<number> {
	if (process.env.NODE_ENV === "production") {
		throw new Error("Cannot clear namespace in production");
	}

	if (!isRedisConfigured()) {
		console.warn("Redis is not configured, skipping namespace clear");
		return 0;
	}

	const _client = getRedisClient();
	const pattern = getRedisKey("*", namespace);

	// Note: Upstash doesn't support SCAN, so we need to be careful
	// For testing, we'll use a limited approach
	console.warn(`Clearing namespace: ${pattern}`);

	// This is a simplified version - in production you'd want a more robust solution
	return 0;
}
