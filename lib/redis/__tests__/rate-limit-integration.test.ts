/**
 * Integration tests for rate limiting with tRPC middleware
 * Tests the actual integration with the tRPC setup
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClerkContext } from "@/server/api/trpc/clerk-init";
import { createRateLimitMiddleware } from "../rate-limit";

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

// Mock @upstash/ratelimit
const mockRatelimitInstance = {
	limit: vi.fn(),
};

vi.mock("@upstash/ratelimit", () => ({
	Ratelimit: vi.fn().mockImplementation(() => mockRatelimitInstance),
}));

// Augment the mock with the static method after import
const { Ratelimit } = await import("@upstash/ratelimit");
(Ratelimit as unknown).slidingWindow = vi.fn().mockReturnValue({});

describe("Rate Limiting Integration Tests", () => {
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

	describe("tRPC Context Integration", () => {
		it("should work with Clerk context format", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: "household123",
				auth: { userId: "user123" },
				clerkUser: {
					id: "user123",
					emailAddresses: [{ emailAddress: "test@example.com" }],
				} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: "household123",
				currentMembership: {
					id: "membership123",
					userId: "user123",
					householdId: "household123",
					role: "OWNER",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				availableHouseholds: [
					{
						id: "household123",
						name: "Test Household",
						createdAt: new Date(),
						updatedAt: new Date(),
						membership: {
							id: "membership123",
							userId: "user123",
							householdId: "household123",
							role: "OWNER",
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					},
				],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "animals.list",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});

		it("should handle unauthenticated users", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: null,
				auth: null,
				clerkUser: null,
				dbUser: null,
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "public.health",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});

		it("should apply different rate limits based on user roles", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			// Test OWNER role
			const mockOwnerContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: "household123",
				auth: { userId: "owner123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "owner123",
					email: "owner@example.com",
					firstName: "Owner",
					lastName: "User",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: "household123",
				currentMembership: {
					id: "membership123",
					userId: "owner123",
					householdId: "household123",
					role: "OWNER",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockOwnerContext,
				next: mockNext,
				path: "admin.deleteHousehold",
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

			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn();

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: "household123",
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: "household123",
				currentMembership: null,
				availableHouseholds: [],
			};

			await expect(
				middleware({
					ctx: mockClerkContext,
					next: mockNext,
					path: "animals.create",
				}),
			).rejects.toThrow(TRPCError);

			expect(mockNext).not.toHaveBeenCalled();
		});

		it("should include proper error metadata in TRPCError", async () => {
			const rateLimitResult = {
				success: false,
				limit: 100,
				remaining: 0,
				reset: new Date(Date.now() + 60000),
			};

			mockRatelimitInstance.limit.mockResolvedValueOnce(rateLimitResult);

			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn();

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: "household123",
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: "household123",
				currentMembership: null,
				availableHouseholds: [],
			};

			let thrownError: TRPCError;
			try {
				await middleware({
					ctx: mockClerkContext,
					next: mockNext,
					path: "animals.create",
				});
			} catch (error) {
				thrownError = error as TRPCError;
			}

			expect(thrownError!.code).toBe("TOO_MANY_REQUESTS");
			expect(thrownError!.cause).toMatchObject({
				rateLimitResult: expect.objectContaining({
					success: false,
					limit: 100,
					remaining: 0,
				}),
				rateLimitHeaders: expect.any(Object),
				tier: expect.any(String),
				identifier: expect.any(String),
			});
		});
	});

	describe("System Operation Bypass", () => {
		it("should bypass rate limits for health checks", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: null,
				auth: null,
				clerkUser: null,
				dbUser: null,
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "health",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});

		it("should bypass rate limits for system operations", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: null,
				auth: { userId: "system" },
				clerkUser: null,
				dbUser: null,
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "system.sync",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});
	});

	describe("Household-based Rate Limiting", () => {
		it("should apply household-specific rate limits", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: "household123",
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: "household123",
				currentMembership: {
					id: "membership123",
					userId: "user123",
					householdId: "household123",
					role: "CAREGIVER",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "animals.list",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
			// Verify that rate limiting was called with household context
			expect(mockRatelimitInstance.limit).toHaveBeenCalled();
		});

		it("should handle missing household gracefully", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: null,
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "user.profile",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});
	});

	describe("Error Scenarios", () => {
		it("should handle Redis connection failures", async () => {
			mockRatelimitInstance.limit.mockRejectedValue(
				new Error("Redis connection failed"),
			);

			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn();

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "192.168.1.1",
				}),
				requestedHouseholdId: null,
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			await expect(
				middleware({
					ctx: mockClerkContext,
					next: mockNext,
					path: "animals.create",
				}),
			).rejects.toThrow("Redis connection failed");

			expect(mockNext).not.toHaveBeenCalled();
		});

		it("should handle malformed headers gracefully", async () => {
			const middleware = createRateLimitMiddleware<ClerkContext>();
			const mockNext = vi.fn().mockResolvedValue("success");

			const mockClerkContext: ClerkContext = {
				db: {} as unknown,
				headers: new Headers({
					"x-forwarded-for": "invalid-ip-format",
				}),
				requestedHouseholdId: null,
				auth: { userId: "user123" },
				clerkUser: {} as unknown,
				dbUser: {
					id: "user123",
					email: "test@example.com",
					firstName: "John",
					lastName: "Doe",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				currentHouseholdId: null,
				currentMembership: null,
				availableHouseholds: [],
			};

			const result = await middleware({
				ctx: mockClerkContext,
				next: mockNext,
				path: "animals.list",
			});

			expect(result).toBe("success");
			expect(mockNext).toHaveBeenCalledOnce();
		});
	});
});
