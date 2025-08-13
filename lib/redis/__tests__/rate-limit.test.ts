/**
 * Comprehensive tests for rate limiting functionality
 * Tests different tiers, bypass mechanisms, tRPC middleware integration, and edge cases
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRateLimit,
  bulkClearRateLimits,
  clearRateLimit,
  createRateLimitMiddleware,
  extractClientIP,
  generateRateLimitHeaders,
  getRateLimitAnalytics,
  type RateLimitResult,
  type RateLimitTier,
  rateLimitCriticalOperation,
} from "../rate-limit";

// Mock Redis client
const mockRedisClient = {
  del: vi.fn(),
  ping: vi.fn(),
};

vi.mock("../client", () => ({
  getRedisClient: () => mockRedisClient,
  RedisKeys: {
    rateLimit: {
      user: (userId: string) => `test:ratelimit:user:${userId}`,
      ip: (ip: string) => `test:ratelimit:ip:${ip}`,
      api: (endpoint: string, identifier: string) =>
        `test:ratelimit:api:${endpoint}:${identifier}`,
    },
  },
}));

// Mock @upstash/ratelimit with simpler approach
const mockRatelimitInstance = {
  limit: vi.fn(),
};

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn().mockImplementation(() => mockRatelimitInstance),
}));

// Augment the mock with the static method after import
import("@upstash/ratelimit").then(({ Ratelimit }) => {
  (Ratelimit as any).slidingWindow = vi.fn().mockReturnValue({});
});

// Helper to create mock rate limit result
const createMockResult = (
  overrides: Partial<RateLimitResult> = {},
): RateLimitResult => ({
  success: true,
  limit: 100,
  remaining: 99,
  reset: new Date(Date.now() + 60000),
  ...overrides,
});

describe("Rate Limiting Implementation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behavior
    mockRatelimitInstance.limit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: new Date(Date.now() + 60000),
    });
    mockRedisClient.del.mockResolvedValue(1);
  });

  describe("Rate Limit Tiers", () => {
    const tiers: RateLimitTier[] = [
      "user",
      "household",
      "ip",
      "admin",
      "authenticated",
      "anonymous",
    ];

    it.each(tiers)("should apply rate limits for %s tier", async (tier) => {
      const result = await applyRateLimit(tier, "test-identifier");

      expect(result.success).toBe(true);
      expect(result.limit).toBeGreaterThan(0);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.reset).toBeInstanceOf(Date);
      expect(mockRatelimitInstance.limit).toHaveBeenCalledWith(
        expect.stringContaining("test-identifier"),
      );
    });

    it("should handle rate limit exceeded scenario", async () => {
      mockRatelimitInstance.limit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      });

      const result = await applyRateLimit("user", "test-user");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("Bypass Mechanisms", () => {
    it("should bypass rate limits for admin users on bypassAdmins=true tiers", async () => {
      const result = await applyRateLimit("user", "admin-user", {
        isAdmin: true,
      });

      expect(result.success).toBe(true);
      expect(result.bypassedReason).toBe("admin");
      expect(mockRatelimitInstance.limit).not.toHaveBeenCalled();
    });

    it("should NOT bypass rate limits for admin users on bypassAdmins=false tiers", async () => {
      await applyRateLimit("ip", "admin-user", {
        isAdmin: true,
      });

      expect(mockRatelimitInstance.limit).toHaveBeenCalled(); // Should still apply rate limit
    });

    it("should bypass rate limits with custom system reason", async () => {
      const result = await applyRateLimit("user", "system-user", {
        bypassReason: "health-check",
      });

      expect(result.success).toBe(true);
      expect(result.bypassedReason).toBe("system:health-check");
      expect(mockRatelimitInstance.limit).not.toHaveBeenCalled();
    });

    it("should handle multiple bypass conditions correctly", async () => {
      // System bypass should take precedence over admin bypass
      const result = await applyRateLimit("user", "admin-user", {
        isAdmin: true,
        bypassReason: "maintenance",
      });

      expect(result.bypassedReason).toBe("system:maintenance");
    });
  });

  describe("Critical Operations Rate Limiting", () => {
    const criticalOps = [
      "administration",
      "inventory",
      "user-creation",
      "password-reset",
    ] as const;

    it.each(criticalOps)(
      "should handle %s critical operation",
      async (operation) => {
        const result = await rateLimitCriticalOperation(operation, "user123");

        expect(result.success).toBe(true);
        expect(result.limit).toBeGreaterThan(0);
        expect(mockRatelimitInstance.limit).toHaveBeenCalled();
      },
    );

    it("should handle rate limit exceeded for critical operations", async () => {
      mockRatelimitInstance.limit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      });

      const result = await rateLimitCriticalOperation(
        "administration",
        "user123",
      );

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should generate proper rate limit headers", () => {
      const result = createMockResult({
        limit: 100,
        remaining: 50,
        reset: new Date(1700000000000), // Fixed timestamp
      });

      const headers = generateRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("100");
      expect(headers["X-RateLimit-Remaining"]).toBe("50");
      expect(headers["X-RateLimit-Reset"]).toBe("1700000000");
      expect(headers["X-RateLimit-Policy"]).toBe("sliding-window");
      expect(headers["X-RateLimit-Retry-After"]).toBeUndefined();
    });

    it("should include retry-after header when rate limited", () => {
      const result = createMockResult({
        success: false,
        remaining: 0,
        retryAfter: 60,
      });

      const headers = generateRateLimitHeaders(result);

      expect(headers["X-RateLimit-Retry-After"]).toBe("60");
    });
  });

  describe("Client IP Extraction", () => {
    it("should extract IP from X-Forwarded-For header", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1",
      });

      const ip = extractClientIP(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should handle single IP in X-Forwarded-For", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.1",
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

    it("should handle X-Client-IP header", () => {
      const headers = new Headers({
        "x-client-ip": "192.168.1.1",
      });

      const ip = extractClientIP(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return unknown for missing headers", () => {
      const headers = new Headers();

      const ip = extractClientIP(headers);
      expect(ip).toBe("unknown");
    });

    it("should handle header priority correctly", () => {
      const headers = new Headers({
        "x-forwarded-for": "priority1.1.1.1",
        "x-real-ip": "priority2.2.2.2",
        "cf-connecting-ip": "priority3.3.3.3",
        "x-client-ip": "priority4.4.4.4",
      });

      const ip = extractClientIP(headers);
      expect(ip).toBe("priority1.1.1.1"); // X-Forwarded-For takes priority
    });
  });

  describe("Rate Limit Analytics", () => {
    it("should return analytics for rate limit tier", async () => {
      const analytics = await getRateLimitAnalytics("user", "user123");

      expect(analytics).toMatchObject({
        tier: "user",
        identifier: "user123",
        current: expect.objectContaining({
          success: true,
          bypassedReason: "system:analytics",
        }),
      });
    });
  });

  describe("Rate Limit Clearing", () => {
    it("should clear rate limit for specific tier and identifier", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await clearRateLimit("user", "user123");

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        expect.stringContaining("user123"),
      );
    });

    it("should handle Redis error when clearing rate limit", async () => {
      mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

      const result = await clearRateLimit("user", "user123");

      expect(result).toBe(false);
    });

    it("should bulk clear multiple rate limits", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const operations = [
        { tier: "user" as const, identifier: "user1" },
        { tier: "user" as const, identifier: "user2" },
        { tier: "ip" as const, identifier: "192.168.1.1" },
      ];

      const result = await bulkClearRateLimits(operations);

      expect(result).toEqual({ success: 3, failed: 0 });
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
    });

    it("should handle mixed success/failure in bulk clear", async () => {
      mockRedisClient.del
        .mockResolvedValueOnce(1) // success
        .mockRejectedValueOnce(new Error("Redis error")) // failure
        .mockResolvedValueOnce(1); // success

      const operations = [
        { tier: "user" as const, identifier: "user1" },
        { tier: "user" as const, identifier: "user2" },
        { tier: "ip" as const, identifier: "192.168.1.1" },
      ];

      const result = await bulkClearRateLimits(operations);

      expect(result).toEqual({ success: 2, failed: 1 });
    });
  });

  describe("tRPC Middleware Integration", () => {
    it("should apply multiple rate limits for authenticated user", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
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

    it("should handle anonymous users with restrictive limits", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
        auth: null,
        dbUser: null,
      };

      const result = await middleware({
        ctx: mockContext,
        next: mockNext,
        path: "public.procedure",
      });

      expect(result).toBe("success");
    });

    it("should bypass system operations", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
        auth: { userId: "user123" },
        dbUser: { id: "user123", role: "USER" },
      };

      const result = await middleware({
        ctx: mockContext,
        next: mockNext,
        path: "health",
      });

      expect(result).toBe("success");
      expect(mockNext).toHaveBeenCalledOnce();
    });

    it("should throw TRPCError when rate limited", async () => {
      mockRatelimitInstance.limit.mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      });

      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn();
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
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

    it("should handle OWNER role as admin", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
        auth: { userId: "owner123" },
        dbUser: { id: "owner123", role: "OWNER" },
      };

      const result = await middleware({
        ctx: mockContext,
        next: mockNext,
        path: "admin.procedure",
      });

      expect(result).toBe("success");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle Redis connection errors gracefully", async () => {
      mockRatelimitInstance.limit.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      await expect(applyRateLimit("user", "user123")).rejects.toThrow(
        "Redis connection failed",
      );
    });

    it("should handle empty identifiers", async () => {
      const result = await applyRateLimit("user", "");

      expect(result.success).toBe(true);
      expect(mockRatelimitInstance.limit).toHaveBeenCalledWith(
        expect.stringContaining(""),
      );
    });

    it("should handle special characters in identifiers", async () => {
      const specialId = "user@domain.com#123!";
      const result = await applyRateLimit("user", specialId);

      expect(result.success).toBe(true);
      expect(mockRatelimitInstance.limit).toHaveBeenCalledWith(
        expect.stringContaining(specialId),
      );
    });

    it("should handle very long identifiers", async () => {
      const longId = "a".repeat(1000);
      const result = await applyRateLimit("user", longId);

      expect(result.success).toBe(true);
      expect(mockRatelimitInstance.limit).toHaveBeenCalledWith(
        expect.stringContaining(longId),
      );
    });
  });

  describe("Context Integration", () => {
    it("should handle missing household ID gracefully", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
        auth: { userId: "user123" },
        dbUser: { id: "user123", role: "USER" },
        householdId: null, // No household
      };

      const result = await middleware({
        ctx: mockContext,
        next: mockNext,
        path: "test.procedure",
      });

      expect(result).toBe("success");
    });

    it("should use requestedHouseholdId when householdId is null", async () => {
      const middleware = createRateLimitMiddleware();
      const mockNext = vi.fn().mockResolvedValue("success");
      const mockContext = {
        headers: new Headers({
          "x-forwarded-for": "192.168.1.1",
        }),
        auth: { userId: "user123" },
        dbUser: { id: "user123", role: "USER" },
        householdId: null,
        requestedHouseholdId: "requested-household123",
      };

      const result = await middleware({
        ctx: mockContext,
        next: mockNext,
        path: "test.procedure",
      });

      expect(result).toBe("success");
    });
  });
});
