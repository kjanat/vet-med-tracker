/**
 * Tests for rate limiting functionality
 * These tests demonstrate the rate limiting behavior and can be used for validation
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyRateLimit,
	clearRateLimit,
	createRateLimitMiddleware,
	extractClientIP,
	generateRateLimitHeaders,
	type RateLimitResult,
	rateLimitCriticalOperation,
} from "./rate-limit";

// Mock Redis client
vi.mock("./client", () => ({
	getRedisClient: () => ({
		// Mock implementation that always allows requests initially
		// In real tests, you'd use a test Redis instance
	}),
	RedisKeys: {
		rateLimit: {
			user: (userId: string) => `test:ratelimit:user:${userId}`,
			ip: (ip: string) => `test:ratelimit:ip:${ip}`,
			api: (endpoint: string, identifier: string) =>
				`test:ratelimit:api:${endpoint}:${identifier}`,
		},
	},
}));

// Mock @upstash/ratelimit
vi.mock("@upstash/ratelimit", () => ({
	Ratelimit: {
		slidingWindow: () => ({}),
		prototype: {
			limit: vi.fn().mockResolvedValue({
				success: true,
				limit: 100,
				remaining: 99,
				reset: new Date(Date.now() + 60000),
			}),
		},
	},
}));

describe("Rate Limiting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("applyRateLimit", () => {
		it("should allow requests within rate limit", async () => {
			const result = await applyRateLimit("user", "user123");

			expect(result.success).toBe(true);
			expect(result.remaining).toBeLessThan(result.limit);
			expect(result.reset).toBeInstanceOf(Date);
		});

		it("should bypass rate limits for admins when configured", async () => {
			const result = await applyRateLimit("user", "admin123", {
				isAdmin: true,
			});

			expect(result.success).toBe(true);
			expect(result.bypassedReason).toBe("admin");
		});

		it("should bypass rate limits with custom reason", async () => {
			const result = await applyRateLimit("user", "system123", {
				bypassReason: "health-check",
			});

			expect(result.success).toBe(true);
			expect(result.bypassedReason).toBe("system:health-check");
		});

		it("should apply IP-based rate limits to all users", async () => {
			const result = await applyRateLimit("ip", "192.168.1.1", {
				isAdmin: true, // IP limits don't bypass for admins
			});

			expect(result.success).toBe(true);
			expect(result.bypassedReason).toBeUndefined();
		});
	});

	describe("rateLimitCriticalOperation", () => {
		it("should apply stricter limits for critical operations", async () => {
			const result = await rateLimitCriticalOperation(
				"administration",
				"user123",
			);

			expect(result.success).toBe(true);
			expect(result.limit).toBeLessThanOrEqual(10); // Critical ops have low limits
		});

		it("should handle different operation types", async () => {
			const operations = [
				"administration",
				"inventory",
				"user-creation",
				"password-reset",
			] as const;

			for (const op of operations) {
				const result = await rateLimitCriticalOperation(op, "user123");
				expect(result.success).toBe(true);
			}
		});
	});

	describe("generateRateLimitHeaders", () => {
		it("should generate proper rate limit headers", () => {
			const result: RateLimitResult = {
				success: true,
				limit: 100,
				remaining: 50,
				reset: new Date(Date.now() + 60000),
			};

			const headers = generateRateLimitHeaders(result);

			expect(headers["X-RateLimit-Limit"]).toBe("100");
			expect(headers["X-RateLimit-Remaining"]).toBe("50");
			expect(headers["X-RateLimit-Reset"]).toBeDefined();
			expect(headers["X-RateLimit-Policy"]).toBe("sliding-window");
		});

		it("should include retry-after header when rate limited", () => {
			const result: RateLimitResult = {
				success: false,
				limit: 100,
				remaining: 0,
				reset: new Date(Date.now() + 60000),
				retryAfter: 60,
			};

			const headers = generateRateLimitHeaders(result);

			expect(headers["X-RateLimit-Retry-After"]).toBe("60");
		});
	});

	describe("extractClientIP", () => {
		it("should extract IP from X-Forwarded-For header", () => {
			const headers = new Headers({
				"x-forwarded-for": "192.168.1.1, 10.0.0.1",
			});

			const ip = extractClientIP(headers);
			expect(ip).toBe("192.168.1.1");
		});

		it("should fallback to X-Real-IP header", () => {
			const headers = new Headers({
				"x-real-ip": "192.168.1.1",
			});

			const ip = extractClientIP(headers);
			expect(ip).toBe("192.168.1.1");
		});

		it("should handle Cloudflare headers", () => {
			const headers = new Headers({
				"cf-connecting-ip": "192.168.1.1",
			});

			const ip = extractClientIP(headers);
			expect(ip).toBe("192.168.1.1");
		});

		it("should return unknown for missing headers", () => {
			const headers = new Headers();

			const ip = extractClientIP(headers);
			expect(ip).toBe("unknown");
		});
	});

	describe("tRPC middleware", () => {
		it("should create middleware that applies multiple rate limits", async () => {
			const middleware = createRateLimitMiddleware();

			const mockNext = vi.fn().mockResolvedValue("success");
			const mockContext = {
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
					"user-agent": "test-agent",
				}),
				auth: { userId: "user123" },
				dbUser: { id: "user123", role: "USER" },
				householdId: "household123",
			};

			const result = await middleware({
				ctx: mockContext,
				next: mockNext,
				path: "test.procedure",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});

		it("should throw TRPCError when rate limited", async () => {
			// Mock a failed rate limit
			vi.mocked(applyRateLimit as any).mockResolvedValueOnce({
				success: false,
				limit: 100,
				remaining: 0,
				reset: new Date(),
				retryAfter: 60,
			});

			const middleware = createRateLimitMiddleware();
			const mockNext = vi.fn();
			const mockContext = {
				headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
				auth: { userId: "user123" },
				dbUser: { id: "user123", role: "USER" },
			};

			await expect(
				middleware({
					ctx: mockContext,
					next: mockNext,
					path: "test.procedure",
				}),
			).rejects.toThrow(TRPCError);

			expect(mockNext).not.toHaveBeenCalled();
		});

		it("should bypass system operations", async () => {
			const middleware = createRateLimitMiddleware();
			const mockNext = vi.fn().mockResolvedValue("success");
			const mockContext = {
				headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
				auth: { userId: "user123" },
				dbUser: { id: "user123", role: "USER" },
			};

			const result = await middleware({
				ctx: mockContext,
				next: mockNext,
				path: "health", // System path
			});

			expect(result).toBe("success");
		});

		it("should handle anonymous users", async () => {
			const middleware = createRateLimitMiddleware();
			const mockNext = vi.fn().mockResolvedValue("success");
			const mockContext = {
				headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
				auth: null, // Anonymous
				dbUser: null,
			};

			const result = await middleware({
				ctx: mockContext,
				next: mockNext,
				path: "public.procedure",
			});

			expect(result).toBe("success");
		});

		it("should apply admin rate limits for admin operations", async () => {
			const middleware = createRateLimitMiddleware();
			const mockNext = vi.fn().mockResolvedValue("success");
			const mockContext = {
				headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
				auth: { userId: "admin123" },
				dbUser: { id: "admin123", role: "ADMIN" },
			};

			const result = await middleware({
				ctx: mockContext,
				next: mockNext,
				path: "admin.deleteUser", // Admin path
			});

			expect(result).toBe("success");
		});
	});

	describe("clearRateLimit", () => {
		it("should clear rate limit for a user", async () => {
			const result = await clearRateLimit("user", "user123");
			expect(result).toBe(true);
		});
	});
});
