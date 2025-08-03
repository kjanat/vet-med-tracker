import type { NextRequest } from "next/server";

// Rate limiting configuration
export interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	skipSuccessfulRequests?: boolean; // Don't count successful requests
	skipFailedRequests?: boolean; // Don't count failed requests
	keyGenerator?: (req: NextRequest) => string; // Custom key generation
	onLimitReached?: (key: string, limit: number) => void; // Callback when limit reached
}

// Rate limit store interface
interface RateLimitStore {
	hits: number;
	resetTime: number;
}

// In-memory store for rate limiting (consider Redis for production scaling)
const rateLimitStore = new Map<string, RateLimitStore>();

// Clean up expired entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, store] of rateLimitStore.entries()) {
		if (store.resetTime < now) {
			rateLimitStore.delete(key);
		}
	}
}, 60000); // Clean up every minute

/**
 * Rate limiting utility function
 * Returns information about current rate limit status
 */
export function checkRateLimit(
	key: string,
	config: RateLimitConfig,
): {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetTime: number;
	retryAfter?: number;
} {
	const now = Date.now();
	const windowStart = now;
	const windowEnd = windowStart + config.windowMs;

	let store = rateLimitStore.get(key);

	// Initialize or reset if window expired
	if (!store || store.resetTime <= now) {
		store = {
			hits: 0,
			resetTime: windowEnd,
		};
		rateLimitStore.set(key, store);
	}

	// Check if request is allowed
	const allowed = store.hits < config.maxRequests;

	if (allowed) {
		store.hits++;
	} else if (config.onLimitReached) {
		config.onLimitReached(key, config.maxRequests);
	}

	const remaining = Math.max(0, config.maxRequests - store.hits);
	const retryAfter = allowed
		? undefined
		: Math.ceil((store.resetTime - now) / 1000);

	return {
		allowed,
		limit: config.maxRequests,
		remaining,
		resetTime: store.resetTime,
		retryAfter,
	};
}

/**
 * Generate rate limit key from request
 */
export function generateRateLimitKey(
	req: NextRequest,
	prefix: string = "rate_limit",
): string {
	// Try to get user identifier from various sources
	const userId = req.headers.get("x-user-id");
	const forwarded = req.headers.get("x-forwarded-for");
	const realIp = req.headers.get("x-real-ip");
	const ip =
		forwarded?.split(",")[0] ||
		realIp ||
		(req as { ip?: string }).ip ||
		"unknown";

	// Prefer user ID if available, fallback to IP
	const identifier = userId || ip;

	return `${prefix}:${identifier}`;
}

/**
 * Rate limiting configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
	// API routes - general
	api: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100, // 100 requests per minute
	} as RateLimitConfig,

	// Authentication routes
	auth: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5, // 5 auth attempts per 15 minutes
	} as RateLimitConfig,

	// Database heavy operations
	heavy: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10, // 10 requests per minute
	} as RateLimitConfig,

	// Medication recording (core feature)
	recording: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 30, // 30 recordings per minute
	} as RateLimitConfig,

	// File uploads
	upload: {
		windowMs: 5 * 60 * 1000, // 5 minutes
		maxRequests: 10, // 10 uploads per 5 minutes
	} as RateLimitConfig,

	// Reports and exports
	reports: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5, // 5 reports per minute
	} as RateLimitConfig,
} as const;

/**
 * Sliding window rate limiter for more precise control
 */
export class SlidingWindowRateLimiter {
	private windows = new Map<string, number[]>();

	constructor(
		private windowSizeMs: number,
		private maxRequests: number,
	) {}

	checkLimit(key: string): {
		allowed: boolean;
		count: number;
		resetTime: number;
	} {
		const now = Date.now();
		const windowStart = now - this.windowSizeMs;

		// Get or create window for this key
		let window = this.windows.get(key) || [];

		// Remove old timestamps outside the window
		window = window.filter((timestamp) => timestamp > windowStart);

		// Check if request is allowed
		const allowed = window.length < this.maxRequests;

		if (allowed) {
			window.push(now);
		}

		// Update the window
		this.windows.set(key, window);

		return {
			allowed,
			count: window.length,
			resetTime: Math.min(...window) + this.windowSizeMs,
		};
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, window] of this.windows.entries()) {
			const filtered = window.filter(
				(timestamp) => timestamp > now - this.windowSizeMs,
			);
			if (filtered.length === 0) {
				this.windows.delete(key);
			} else {
				this.windows.set(key, filtered);
			}
		}
	}
}

/**
 * Rate limit response headers
 */
export function getRateLimitHeaders(
	result: ReturnType<typeof checkRateLimit>,
): Record<string, string> {
	return {
		"X-RateLimit-Limit": result.limit.toString(),
		"X-RateLimit-Remaining": result.remaining.toString(),
		"X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
		...(result.retryAfter && {
			"Retry-After": result.retryAfter.toString(),
		}),
	};
}

/**
 * Create rate limit middleware function
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
	return (req: NextRequest) => {
		const key = config.keyGenerator
			? config.keyGenerator(req)
			: generateRateLimitKey(req);

		const result = checkRateLimit(key, config);

		return {
			...result,
			headers: getRateLimitHeaders(result),
		};
	};
}

/**
 * Adaptive rate limiting based on system load
 */
export class AdaptiveRateLimiter {
	private baseConfig: RateLimitConfig;
	private currentMultiplier: number = 1;

	constructor(baseConfig: RateLimitConfig) {
		this.baseConfig = baseConfig;
	}

	/**
	 * Adjust rate limits based on system metrics
	 */
	adjustLimits(metrics: {
		connectionUsage: number; // 0-100
		responseTime: number; // ms
		errorRate: number; // 0-100
	}): void {
		let multiplier = 1;

		// Reduce limits if connection usage is high
		if (metrics.connectionUsage > 80) {
			multiplier *= 0.5; // 50% of normal rate
		} else if (metrics.connectionUsage > 60) {
			multiplier *= 0.7; // 70% of normal rate
		}

		// Reduce limits if response time is high
		if (metrics.responseTime > 5000) {
			multiplier *= 0.4; // 40% of normal rate
		} else if (metrics.responseTime > 2000) {
			multiplier *= 0.6; // 60% of normal rate
		}

		// Reduce limits if error rate is high
		if (metrics.errorRate > 10) {
			multiplier *= 0.3; // 30% of normal rate
		} else if (metrics.errorRate > 5) {
			multiplier *= 0.5; // 50% of normal rate
		}

		this.currentMultiplier = Math.max(0.1, multiplier); // Never go below 10%
	}

	/**
	 * Get current rate limit configuration
	 */
	getCurrentConfig(): RateLimitConfig {
		return {
			...this.baseConfig,
			maxRequests: Math.floor(
				this.baseConfig.maxRequests * this.currentMultiplier,
			),
		};
	}

	/**
	 * Check rate limit with current adaptive settings
	 */
	checkLimit(key: string): ReturnType<typeof checkRateLimit> {
		return checkRateLimit(key, this.getCurrentConfig());
	}
}
