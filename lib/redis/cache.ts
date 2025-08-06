/**
 * Cache service abstraction with Redis backend
 * Provides type-safe caching with automatic serialization
 */

import { getRedisClient, RedisKeys } from "./client";

export interface CacheOptions {
	/** Time to live in seconds */
	ttl?: number;
	/** Cache key namespace */
	namespace?: string;
	/** Whether to use stale cache on error */
	staleOnError?: boolean;
}

const DEFAULT_TTL = 300; // 5 minutes
const STALE_TTL = 86400; // 24 hours for stale cache

/**
 * Cache key validation - ensures keys don't contain invalid characters
 */
function validateCacheKey(key: string): void {
	if (!key || key.trim().length === 0) {
		throw new Error("Cache key cannot be empty");
	}

	// Redis has some limitations on key names - check for problematic patterns
	if (key.includes("\r") || key.includes("\n") || key.includes("\0")) {
		throw new Error("Cache key contains invalid characters");
	}

	// Warn about very long keys (Redis recommends < 250 chars for performance)
	if (key.length > 250) {
		console.warn(
			`Cache key is very long (${key.length} chars): ${key.slice(0, 50)}...`,
		);
	}
}

/**
 * Cache value validation - checks for reasonable size limits
 */
function validateCacheValue(serialized: string, key: string): void {
	const sizeInBytes = Buffer.byteLength(serialized, "utf8");
	const sizeInMB = sizeInBytes / (1024 * 1024);

	// Warn about large values (> 1MB)
	if (sizeInMB > 1) {
		console.warn(
			`Cache value for key "${key}" is large (${sizeInMB.toFixed(2)}MB)`,
		);
	}

	// Error on extremely large values (> 10MB) - might cause performance issues
	if (sizeInMB > 10) {
		throw new Error(
			`Cache value for key "${key}" is too large (${sizeInMB.toFixed(2)}MB). Maximum allowed is 10MB.`,
		);
	}
}

/**
 * Generic cache service
 */
export class CacheService {
	private client = getRedisClient();

	/**
	 * Get a value from cache
	 */
	async get<T>(key: string, namespace = "cache"): Promise<T | null> {
		validateCacheKey(key);
		try {
			const fullKey = `${namespace}:${key}`;
			const value = await this.client.get(fullKey);

			if (!value) return null;

			// Handle string values directly
			if (typeof value === "string") {
				try {
					return JSON.parse(value) as T;
				} catch {
					return value as T;
				}
			}

			return value as T;
		} catch (error) {
			console.error(`Cache get error for ${key}:`, error);
			return null;
		}
	}

	/**
	 * Get a value from cache using a fully-qualified key (no additional namespacing)
	 */
	async getByFullKey<T>(fullKey: string): Promise<T | null> {
		try {
			const value = await this.client.get(fullKey);

			if (!value) return null;

			// Handle string values directly
			if (typeof value === "string") {
				try {
					return JSON.parse(value) as T;
				} catch {
					return value as T;
				}
			}

			return value as T;
		} catch (error) {
			console.error(`Cache get error for ${fullKey}:`, error);
			return null;
		}
	}

	/**
	 * Set a value in cache
	 */
	async set<T>(
		key: string,
		value: T,
		options: CacheOptions = {},
	): Promise<boolean> {
		validateCacheKey(key);
		const { ttl = DEFAULT_TTL, namespace = "cache" } = options;

		// Serialize the value
		const serialized = JSON.stringify(value);
		validateCacheValue(serialized, key);

		try {
			const fullKey = `${namespace}:${key}`;

			// Set with TTL
			if (ttl > 0) {
				await this.client.setex(fullKey, ttl, serialized);
			} else {
				await this.client.set(fullKey, serialized);
			}

			// Also set a stale version for error recovery
			if (options.staleOnError) {
				await this.client.setex(`${fullKey}:stale`, STALE_TTL, serialized);
			}

			return true;
		} catch (error) {
			console.error(`Cache set error for ${key}:`, error);
			return false;
		}
	}

	/**
	 * Set a value in cache using a fully-qualified key (no additional namespacing)
	 */
	async setByFullKey<T>(
		fullKey: string,
		value: T,
		options: { ttl?: number; staleOnError?: boolean } = {},
	): Promise<boolean> {
		const { ttl = DEFAULT_TTL } = options;

		// Serialize the value
		const serialized = JSON.stringify(value);
		validateCacheValue(serialized, fullKey);

		try {
			// Set with TTL
			if (ttl > 0) {
				await this.client.setex(fullKey, ttl, serialized);
			} else {
				await this.client.set(fullKey, serialized);
			}

			// Also set a stale version for error recovery
			if (options.staleOnError) {
				await this.client.setex(`${fullKey}:stale`, STALE_TTL, serialized);
			}

			return true;
		} catch (error) {
			console.error(`Cache set error for ${fullKey}:`, error);
			return false;
		}
	}

	/**
	 * Delete a value from cache
	 */
	async delete(key: string, namespace = "cache"): Promise<boolean> {
		validateCacheKey(key);
		try {
			const fullKey = `${namespace}:${key}`;
			const result = await this.client.del(fullKey, `${fullKey}:stale`);
			return result > 0;
		} catch (error) {
			console.error(`Cache delete error for ${key}:`, error);
			return false;
		}
	}

	/**
	 * Delete a value from cache using a fully-qualified key (no additional namespacing)
	 */
	async deleteByFullKey(fullKey: string): Promise<boolean> {
		try {
			const result = await this.client.del(fullKey, `${fullKey}:stale`);
			return result > 0;
		} catch (error) {
			console.error(`Cache delete error for ${fullKey}:`, error);
			return false;
		}
	}

	/**
	 * Clear all cache entries in a namespace
	 */
	async clear(namespace = "cache"): Promise<void> {
		// This is complex with Upstash as it doesn't support pattern-based deletion
		// We'll implement this using a tracking set
		console.warn(`Cache clear requested for namespace: ${namespace}`);
	}

	/**
	 * Get or set a value with a factory function
	 */
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		options: CacheOptions = {},
	): Promise<T> {
		validateCacheKey(key);
		// Try to get from cache first
		const cached = await this.get<T>(key, options.namespace);
		if (cached !== null) {
			return cached;
		}

		try {
			// Generate new value
			const value = await factory();

			// Store in cache
			await this.set(key, value, options);

			return value;
		} catch (error) {
			// If factory fails and staleOnError is enabled, try stale cache
			if (options.staleOnError) {
				const staleKey = `${options.namespace || "cache"}:${key}:stale`;
				const stale = await this.client.get(staleKey);
				if (stale) {
					console.warn(`Using stale cache for ${key} due to error`);
					return typeof stale === "string"
						? (JSON.parse(stale) as T)
						: (stale as T);
				}
			}
			throw error;
		}
	}

	/**
	 * Get or set a value with a factory function using a fully-qualified key
	 */
	async getOrSetByFullKey<T>(
		fullKey: string,
		factory: () => Promise<T>,
		options: { ttl?: number; staleOnError?: boolean } = {},
	): Promise<T> {
		// Try to get from cache first
		const cached = await this.getByFullKey<T>(fullKey);
		if (cached !== null) {
			return cached;
		}

		try {
			// Generate new value
			const value = await factory();

			// Store in cache
			await this.setByFullKey(fullKey, value, options);

			return value;
		} catch (error) {
			// If factory fails and staleOnError is enabled, try stale cache
			if (options.staleOnError) {
				const stale = await this.client.get(`${fullKey}:stale`);
				if (stale) {
					console.warn(`Using stale cache for ${fullKey} due to error`);
					return typeof stale === "string"
						? (JSON.parse(stale) as T)
						: (stale as T);
				}
			}
			throw error;
		}
	}

	/**
	 * Invalidate multiple cache keys
	 */
	async invalidateMany(keys: string[], namespace = "cache"): Promise<number> {
		if (keys.length === 0) return 0;

		try {
			const fullKeys = keys.flatMap((key) => [
				`${namespace}:${key}`,
				`${namespace}:${key}:stale`,
			]);

			return await this.client.del(...fullKeys);
		} catch (error) {
			console.error("Cache invalidation error:", error);
			return 0;
		}
	}
}

/**
 * Specialized cache services for different domains
 */
export class HouseholdCache extends CacheService {
	async getHousehold(id: string) {
		return this.getByFullKey(RedisKeys.cache.household(id));
	}

	async setHousehold(id: string, data: unknown, ttl = 600) {
		return this.setByFullKey(RedisKeys.cache.household(id), data, { ttl });
	}

	async invalidateHousehold(id: string) {
		return this.deleteByFullKey(RedisKeys.cache.household(id));
	}
}

export class AnimalCache extends CacheService {
	async getAnimal(id: string) {
		return this.getByFullKey(RedisKeys.cache.animal(id));
	}

	async setAnimal(id: string, data: unknown, ttl = 600) {
		return this.setByFullKey(RedisKeys.cache.animal(id), data, { ttl });
	}

	async invalidateAnimal(id: string) {
		return this.deleteByFullKey(RedisKeys.cache.animal(id));
	}
}

export class PendingMedsCache extends CacheService {
	async getPendingMeds(householdId: string) {
		return this.getByFullKey(RedisKeys.cache.pendingMeds(householdId));
	}

	async setPendingMeds(householdId: string, data: unknown, ttl = 60) {
		// Short TTL for pending meds as they change frequently
		return this.setByFullKey(RedisKeys.cache.pendingMeds(householdId), data, {
			ttl,
		});
	}

	async invalidatePendingMeds(householdId: string) {
		return this.deleteByFullKey(RedisKeys.cache.pendingMeds(householdId));
	}
}

// Export singleton instances
export const cache = new CacheService();
export const householdCache = new HouseholdCache();
export const animalCache = new AnimalCache();
export const pendingMedsCache = new PendingMedsCache();
