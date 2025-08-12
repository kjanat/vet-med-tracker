import type { households, memberships, users } from "@/db/schema";
import { redis } from "@/lib/redis/client";

interface CachedUserContext {
	dbUser: typeof users.$inferSelect;
	availableHouseholds: Array<
		typeof households.$inferSelect & {
			membership: typeof memberships.$inferSelect;
		}
	>;
	timestamp: number;
	version: string;
}

const CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_VERSION = "v1";

export const userSessionCache = {
	/**
	 * Get cached user context from Redis
	 */
	async get(stackUserId: string): Promise<CachedUserContext | null> {
		try {
			const key = `user:${stackUserId}:context`;
			const cached = await redis.get(key);

			if (!cached) return null;

			const data = JSON.parse(cached) as CachedUserContext;

			// Check version and freshness
			if (data.version !== CACHE_VERSION) return null;
			if (Date.now() - data.timestamp > CACHE_TTL * 1000) return null;

			return data;
		} catch (error) {
			console.error("Failed to get cached user context:", error);
			return null;
		}
	},

	/**
	 * Set user context in Redis cache
	 */
	async set(
		stackUserId: string,
		dbUser: typeof users.$inferSelect,
		availableHouseholds: CachedUserContext["availableHouseholds"],
	): Promise<void> {
		try {
			const key = `user:${stackUserId}:context`;
			const data: CachedUserContext = {
				dbUser,
				availableHouseholds,
				timestamp: Date.now(),
				version: CACHE_VERSION,
			};

			await redis.setex(key, CACHE_TTL, JSON.stringify(data));
		} catch (error) {
			console.error("Failed to cache user context:", error);
			// Non-critical, continue without caching
		}
	},

	/**
	 * Invalidate user context cache
	 */
	async invalidate(stackUserId: string): Promise<void> {
		try {
			const key = `user:${stackUserId}:context`;
			await redis.del(key);
		} catch (error) {
			console.error("Failed to invalidate user cache:", error);
		}
	},

	/**
	 * Invalidate all user caches (for emergency use)
	 */
	async invalidateAll(): Promise<void> {
		try {
			const keys = await redis.keys("user:*:context");
			if (keys.length > 0) {
				await redis.del(...keys);
			}
		} catch (error) {
			console.error("Failed to invalidate all user caches:", error);
		}
	},
};
