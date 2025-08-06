/**
 * Integration test to verify connection middleware uses the improved rate limiting
 */

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionMiddleware } from "../../connection-middleware";

// Mock the improved rate limiting module
vi.mock("../rate-limit", () => ({
	applyRateLimit: vi.fn(),
	extractClientIP: vi.fn(),
	generateRateLimitHeaders: vi.fn(),
}));

// Mock other dependencies
vi.mock("../../circuit-breaker", () => ({
	CircuitState: { CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" },
	checkDatabaseHealthWithCircuitBreaker: vi.fn(),
	criticalCircuitBreaker: {
		isHealthy: () => true,
		getMetrics: () => ({ state: "CLOSED" }),
	},
	databaseCircuitBreaker: {
		isHealthy: () => true,
		getMetrics: () => ({ state: "CLOSED" }),
	},
	setupCircuitBreakerLogging: vi.fn(),
}));

vi.mock("../../connection-queue", () => ({
	areAllQueuesHealthy: () => true,
	connectionQueues: {
		read: { getStats: () => ({ queuedItems: 5, activeConnections: 2 }) },
	},
	getAllQueueStats: () => ({
		read: {
			activeConnections: 2,
			queuedItems: 5,
			totalProcessed: 100,
			totalFailed: 1,
		},
	}),
	pauseAllQueues: vi.fn(),
	QUEUE_PRIORITIES: { NORMAL: 1 },
	resumeAllQueues: vi.fn(),
	withConnectionQueue: vi.fn(),
}));

vi.mock("../../db-monitoring", () => ({
	comprehensiveHealthCheck: vi.fn(),
}));

describe("Connection Middleware Integration with Improved Rate Limiting", () => {
	let connectionMiddleware: ConnectionMiddleware;
	let mockApplyRateLimit: ReturnType<typeof vi.fn>;
	let mockExtractClientIP: ReturnType<typeof vi.fn>;
	let mockGenerateRateLimitHeaders: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		connectionMiddleware = new ConnectionMiddleware();

		// Import mocked functions
		const rateLimit = await import("../rate-limit");
		mockApplyRateLimit = vi.mocked(rateLimit.applyRateLimit);
		mockExtractClientIP = vi.mocked(rateLimit.extractClientIP);
		mockGenerateRateLimitHeaders = vi.mocked(
			rateLimit.generateRateLimitHeaders,
		);

		// Setup default mocks
		mockExtractClientIP.mockReturnValue("192.168.1.1");
		mockApplyRateLimit.mockResolvedValue({
			success: true,
			limit: 100,
			remaining: 99,
			reset: new Date(Date.now() + 60000),
			retryAfter: 0,
		});
		mockGenerateRateLimitHeaders.mockReturnValue({
			"X-RateLimit-Limit": "100",
			"X-RateLimit-Remaining": "99",
			"X-RateLimit-Reset": "1234567890",
		});
	});

	it("should use improved rate limiting for user tier", async () => {
		const mockRequest = {
			nextUrl: { pathname: "/api/test" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			userId: "user123",
			operationType: "read",
			endpoint: "/api/test",
			priority: 1,
		});

		expect(result.allowed).toBe(true);
		expect(mockApplyRateLimit).toHaveBeenCalledWith("user", "user123", {
			bypassReason: undefined,
		});
		expect(mockExtractClientIP).toHaveBeenCalledWith(expect.any(Headers));
		expect(mockGenerateRateLimitHeaders).toHaveBeenCalled();
	});

	it("should use improved rate limiting for household tier", async () => {
		const mockRequest = {
			nextUrl: { pathname: "/api/test" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			householdId: "household123",
			operationType: "read",
			endpoint: "/api/test",
			priority: 1,
		});

		expect(result.allowed).toBe(true);
		expect(mockApplyRateLimit).toHaveBeenCalledWith(
			"household",
			"household123",
			{
				bypassReason: undefined,
			},
		);
	});

	it("should use improved rate limiting for IP tier when no user/household", async () => {
		const mockRequest = {
			nextUrl: { pathname: "/api/test" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			operationType: "read",
			endpoint: "/api/test",
			priority: 1,
		});

		expect(result.allowed).toBe(true);
		expect(mockApplyRateLimit).toHaveBeenCalledWith("ip", "192.168.1.1", {
			bypassReason: undefined,
		});
	});

	it("should bypass rate limiting for health checks", async () => {
		const mockRequest = {
			nextUrl: { pathname: "/health" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			operationType: "read",
			endpoint: "health",
			priority: 1,
		});

		expect(result.allowed).toBe(true);
		expect(mockApplyRateLimit).toHaveBeenCalledWith("ip", "192.168.1.1", {
			bypassReason: "health-check",
		});
	});

	it("should handle rate limit exceeded correctly", async () => {
		mockApplyRateLimit.mockResolvedValue({
			success: false,
			limit: 100,
			remaining: 0,
			reset: new Date(Date.now() + 60000),
			retryAfter: 60,
		});

		const mockRequest = {
			nextUrl: { pathname: "/api/test" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			userId: "user123",
			operationType: "read",
			endpoint: "/api/test",
			priority: 1,
		});

		expect(result.allowed).toBe(false);
		expect(result.error).toContain("Rate limit exceeded");
		expect(result.headers).toBeDefined();
	});

	it("should prioritize user tier over household tier", async () => {
		const mockRequest = {
			nextUrl: { pathname: "/api/test" },
			headers: new Headers({ "x-forwarded-for": "192.168.1.1" }),
		} as NextRequest;

		const result = await connectionMiddleware.checkRequest(mockRequest, {
			userId: "user123",
			householdId: "household123",
			operationType: "read",
			endpoint: "/api/test",
			priority: 1,
		});

		expect(result.allowed).toBe(true);
		// Should use user tier, not household
		expect(mockApplyRateLimit).toHaveBeenCalledWith("user", "user123", {
			bypassReason: undefined,
		});
	});
});
