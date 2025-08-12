import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Initialize Redis client
const redis = new Redis({
	url: process.env.KV_REST_API_URL!,
	token: process.env.KV_REST_API_TOKEN!,
});

// Create different rate limiters for different operations
export const authRateLimiter = {
	// Sign in attempts: 5 attempts per 15 minutes per IP
	signIn: new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(5, "15 m"),
		prefix: "auth:signin",
		analytics: true,
	}),

	// Sign up attempts: 3 attempts per hour per IP
	signUp: new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(3, "1 h"),
		prefix: "auth:signup",
		analytics: true,
	}),

	// Password reset: 3 attempts per hour per email
	passwordReset: new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(3, "1 h"),
		prefix: "auth:reset",
		analytics: true,
	}),

	// General API calls: 100 requests per minute per user
	api: new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(100, "1 m"),
		prefix: "api:general",
		analytics: true,
	}),
};

/**
 * Get the client's IP address from headers
 */
export async function getClientIp(): Promise<string> {
	const headersList = await headers();

	// Check various headers for the real IP
	const forwardedFor = headersList.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0].trim();
	}

	const realIp = headersList.get("x-real-ip");
	if (realIp) {
		return realIp.trim();
	}

	const cfConnectingIp = headersList.get("cf-connecting-ip");
	if (cfConnectingIp) {
		return cfConnectingIp.trim();
	}

	// Fallback to a default for local development
	return "127.0.0.1";
}

/**
 * Check if an identifier is rate limited
 */
export async function isRateLimited(
	limiter: Ratelimit,
	identifier: string,
): Promise<{
	limited: boolean;
	remaining: number;
	reset: number;
	retryAfter?: number;
}> {
	const result = await limiter.limit(identifier);

	return {
		limited: !result.success,
		remaining: result.remaining,
		reset: result.reset,
		retryAfter: result.success
			? undefined
			: Math.floor((result.reset - Date.now()) / 1000),
	};
}

/**
 * Handle rate limit response
 */
export function createRateLimitResponse(retryAfter: number) {
	return new Response(
		JSON.stringify({
			error: "rate_limit",
			message: "Too many requests. Please try again later.",
			retryAfter,
		}),
		{
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Retry-After": retryAfter.toString(),
				"X-RateLimit-Limit": "5",
				"X-RateLimit-Remaining": "0",
				"X-RateLimit-Reset": new Date(
					Date.now() + retryAfter * 1000,
				).toISOString(),
			},
		},
	);
}

/**
 * Middleware helper to check rate limits
 */
export async function checkRateLimit(
	type: keyof typeof authRateLimiter,
	identifier?: string,
) {
	const id = identifier || (await getClientIp());
	const limiter = authRateLimiter[type];
	const result = await isRateLimited(limiter, id);

	if (result.limited) {
		return {
			limited: true,
			response: createRateLimitResponse(result.retryAfter || 900), // Default 15 minutes
		};
	}

	return {
		limited: false,
		remaining: result.remaining,
		reset: result.reset,
	};
}

/**
 * Clear rate limit for a specific identifier (useful for testing or admin override)
 */
export async function clearRateLimit(
	type: keyof typeof authRateLimiter,
	identifier: string,
) {
	const prefix = authRateLimiter[type].prefix;
	const key = `${prefix}:${identifier}`;
	await redis.del(key);
}

/**
 * Get current rate limit status without consuming a request
 */
export async function getRateLimitStatus(
	type: keyof typeof authRateLimiter,
	identifier?: string,
) {
	const id = identifier || (await getClientIp());
	const prefix = authRateLimiter[type].prefix;
	const key = `${prefix}:${identifier}`;

	// This is a simplified check - actual implementation would need
	// to match the Upstash ratelimit internal structure
	const data = await redis.get(key);

	return {
		identifier: id,
		type,
		data,
	};
}
