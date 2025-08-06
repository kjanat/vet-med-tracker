/**
 * Comprehensive tests for Redis cache service
 * Tests functionality including TTL, stale-on-error, and namespace isolation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the client module with a factory function
vi.mock("../client", () => {
	const mockClient = {
		get: vi.fn(),
		set: vi.fn(),
		setex: vi.fn(),
		del: vi.fn(),
		ping: vi.fn(),
	};

	return {
		getRedisClient: () => mockClient,
		RedisKeys: {
			cache: {
				household: (id: string) => `test:cache:household:${id}`,
				animal: (id: string) => `test:cache:animal:${id}`,
				pendingMeds: (householdId: string) =>
					`test:cache:pending-meds:${householdId}`,
			},
		},
	};
});

// Import after mocking
import {
	animalCache,
	type CacheOptions,
	CacheService,
	cache,
	householdCache,
	pendingMedsCache,
} from "../cache";
import { getRedisClient } from "../client";

// Get reference to mock client for test setup
interface MockRedisClient {
	get: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
	setex: ReturnType<typeof vi.fn>;
	del: ReturnType<typeof vi.fn>;
	ping: ReturnType<typeof vi.fn>;
}

const mockRedisClient = getRedisClient() as unknown as MockRedisClient;

describe("CacheService", () => {
	let cacheService: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		cacheService = new CacheService();

		// Default mock implementations
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.set.mockResolvedValue("OK");
		mockRedisClient.setex.mockResolvedValue("OK");
		mockRedisClient.del.mockResolvedValue(1);
		mockRedisClient.ping.mockResolvedValue("PONG");
	});

	describe("get method", () => {
		it("should retrieve a value from cache with default namespace", async () => {
			const testValue = { id: "123", name: "test" };
			mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));

			const result = await cacheService.get("test-key");

			expect(mockRedisClient.get).toHaveBeenCalledWith("cache:test-key");
			expect(result).toEqual(testValue);
		});

		it("should retrieve a value from cache with custom namespace", async () => {
			const testValue = "test-string";
			mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));

			const result = await cacheService.get("test-key", "custom");

			expect(mockRedisClient.get).toHaveBeenCalledWith("custom:test-key");
			expect(result).toBe(testValue);
		});

		it("should return null when key does not exist", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const result = await cacheService.get("nonexistent-key");

			expect(result).toBeNull();
		});

		it("should handle string values that are not JSON", async () => {
			const stringValue = "plain-string-value";
			mockRedisClient.get.mockResolvedValue(stringValue);

			const result = await cacheService.get<string>("test-key");

			expect(result).toBe(stringValue);
		});

		it("should handle non-string Redis values", async () => {
			const objectValue = { direct: "object" };
			mockRedisClient.get.mockResolvedValue(objectValue);

			const result = await cacheService.get("test-key");

			expect(result).toEqual(objectValue);
		});

		it("should return null and log error when Redis fails", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockRedisClient.get.mockRejectedValue(
				new Error("Redis connection failed"),
			);

			const result = await cacheService.get("test-key");

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Cache get error for test-key:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		it("should handle invalid JSON gracefully", async () => {
			mockRedisClient.get.mockResolvedValue("{invalid json");

			const result = await cacheService.get("test-key");

			expect(result).toBe("{invalid json");
		});
	});

	describe("set method", () => {
		it("should set a value with default TTL", async () => {
			const testValue = { id: "123", data: "test" };

			const result = await cacheService.set("test-key", testValue);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"cache:test-key",
				300, // Default TTL
				JSON.stringify(testValue),
			);
			expect(result).toBe(true);
		});

		it("should set a value with custom TTL and namespace", async () => {
			const testValue = "test-data";
			const options: CacheOptions = {
				ttl: 600,
				namespace: "custom",
			};

			const result = await cacheService.set("test-key", testValue, options);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"custom:test-key",
				600,
				JSON.stringify(testValue),
			);
			expect(result).toBe(true);
		});

		it("should use regular set when TTL is 0", async () => {
			const testValue = "permanent-data";

			const result = await cacheService.set("test-key", testValue, { ttl: 0 });

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				"cache:test-key",
				JSON.stringify(testValue),
			);
			expect(mockRedisClient.setex).not.toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it("should set stale version when staleOnError is enabled", async () => {
			const testValue = { id: "123", data: "test" };
			const options: CacheOptions = {
				ttl: 300,
				staleOnError: true,
			};

			await cacheService.set("test-key", testValue, options);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"cache:test-key",
				300,
				JSON.stringify(testValue),
			);
			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"cache:test-key:stale",
				86400, // STALE_TTL
				JSON.stringify(testValue),
			);
		});

		it("should return false and log error when Redis fails", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockRedisClient.setex.mockRejectedValue(new Error("Redis write failed"));

			const result = await cacheService.set("test-key", "test-value");

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Cache set error for test-key:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("delete method", () => {
		it("should delete a key with default namespace", async () => {
			mockRedisClient.del.mockResolvedValue(2); // Deleted main + stale

			const result = await cacheService.delete("test-key");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"cache:test-key",
				"cache:test-key:stale",
			);
			expect(result).toBe(true);
		});

		it("should delete a key with custom namespace", async () => {
			mockRedisClient.del.mockResolvedValue(1);

			const result = await cacheService.delete("test-key", "custom");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"custom:test-key",
				"custom:test-key:stale",
			);
			expect(result).toBe(true);
		});

		it("should return false when no keys were deleted", async () => {
			mockRedisClient.del.mockResolvedValue(0);

			const result = await cacheService.delete("nonexistent-key");

			expect(result).toBe(false);
		});

		it("should return false and log error when Redis fails", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockRedisClient.del.mockRejectedValue(new Error("Redis delete failed"));

			const result = await cacheService.delete("test-key");

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Cache delete error for test-key:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("clear method", () => {
		it("should log warning for namespace clear request", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			await cacheService.clear("test-namespace");

			expect(consoleSpy).toHaveBeenCalledWith(
				"Cache clear requested for namespace: test-namespace",
			);

			consoleSpy.mockRestore();
		});
	});

	describe("getOrSet method", () => {
		it("should return cached value when available", async () => {
			const cachedValue = { id: "cached", data: "from-cache" };
			mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

			const factory = vi.fn();
			const result = await cacheService.getOrSet("test-key", factory);

			expect(result).toEqual(cachedValue);
			expect(factory).not.toHaveBeenCalled();
			expect(mockRedisClient.get).toHaveBeenCalledWith("cache:test-key");
		});

		it("should call factory and cache result when not in cache", async () => {
			const newValue = { id: "new", data: "from-factory" };
			mockRedisClient.get.mockResolvedValue(null);
			const factory = vi.fn().mockResolvedValue(newValue);

			const result = await cacheService.getOrSet("test-key", factory, {
				ttl: 600,
			});

			expect(result).toEqual(newValue);
			expect(factory).toHaveBeenCalledOnce();
			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"cache:test-key",
				600,
				JSON.stringify(newValue),
			);
		});

		it("should use stale cache when factory fails and staleOnError is enabled", async () => {
			const staleValue = { id: "stale", data: "from-stale" };
			const consoleWarnSpy = vi
				.spyOn(console, "warn")
				.mockImplementation(() => {});

			// First call returns null (not in main cache)
			// Second call returns stale data
			mockRedisClient.get
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(JSON.stringify(staleValue));

			const factory = vi.fn().mockRejectedValue(new Error("Factory failed"));

			const result = await cacheService.getOrSet("test-key", factory, {
				namespace: "test",
				staleOnError: true,
			});

			expect(result).toEqual(staleValue);
			expect(factory).toHaveBeenCalledOnce();
			expect(mockRedisClient.get).toHaveBeenCalledWith("test:test-key");
			expect(mockRedisClient.get).toHaveBeenCalledWith("test:test-key:stale");
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"Using stale cache for test-key due to error",
			);

			consoleWarnSpy.mockRestore();
		});

		it("should throw error when factory fails and no stale cache available", async () => {
			mockRedisClient.get.mockResolvedValue(null);
			const factoryError = new Error("Factory failed");
			const factory = vi.fn().mockRejectedValue(factoryError);

			await expect(
				cacheService.getOrSet("test-key", factory, {
					staleOnError: true,
				}),
			).rejects.toThrow("Factory failed");

			expect(factory).toHaveBeenCalledOnce();
		});

		it("should use custom namespace for stale cache lookup", async () => {
			const consoleWarnSpy = vi
				.spyOn(console, "warn")
				.mockImplementation(() => {});
			mockRedisClient.get
				.mockResolvedValueOnce(null) // Main cache miss
				.mockResolvedValueOnce('"stale-string"'); // Stale cache hit

			const factory = vi.fn().mockRejectedValue(new Error("Factory failed"));

			const result = await cacheService.getOrSet("test-key", factory, {
				namespace: "custom",
				staleOnError: true,
			});

			expect(result).toBe("stale-string");
			expect(mockRedisClient.get).toHaveBeenCalledWith("custom:test-key:stale");

			consoleWarnSpy.mockRestore();
		});
	});

	describe("invalidateMany method", () => {
		it("should invalidate multiple keys", async () => {
			mockRedisClient.del.mockResolvedValue(6); // 3 keys * 2 (main + stale)

			const result = await cacheService.invalidateMany([
				"key1",
				"key2",
				"key3",
			]);

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"cache:key1",
				"cache:key1:stale",
				"cache:key2",
				"cache:key2:stale",
				"cache:key3",
				"cache:key3:stale",
			);
			expect(result).toBe(6);
		});

		it("should handle empty key array", async () => {
			const result = await cacheService.invalidateMany([]);

			expect(mockRedisClient.del).not.toHaveBeenCalled();
			expect(result).toBe(0);
		});

		it("should use custom namespace", async () => {
			mockRedisClient.del.mockResolvedValue(2);

			const result = await cacheService.invalidateMany(["key1"], "custom");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"custom:key1",
				"custom:key1:stale",
			);
			expect(result).toBe(2);
		});

		it("should return 0 and log error when Redis fails", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mockRedisClient.del.mockRejectedValue(new Error("Redis delete failed"));

			const result = await cacheService.invalidateMany(["key1"]);

			expect(result).toBe(0);
			expect(consoleSpy).toHaveBeenCalledWith(
				"Cache invalidation error:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});
});

describe("Specialized Cache Services", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setex.mockResolvedValue("OK");
		mockRedisClient.del.mockResolvedValue(1);
	});

	describe("HouseholdCache", () => {
		it("should get household data", async () => {
			const householdData = { id: "household123", name: "Test Household" };
			mockRedisClient.get.mockResolvedValue(JSON.stringify(householdData));

			const result = await householdCache.getHousehold("household123");

			expect(mockRedisClient.get).toHaveBeenCalledWith(
				"test:cache:household:household123",
			);
			expect(result).toEqual(householdData);
		});

		it("should set household data with custom TTL", async () => {
			const householdData = { id: "household123", name: "Test Household" };

			const result = await householdCache.setHousehold(
				"household123",
				householdData,
				1200,
			);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"test:cache:household:household123",
				1200,
				JSON.stringify(householdData),
			);
			expect(result).toBe(true);
		});

		it("should set household data with default TTL", async () => {
			const householdData = { id: "household123", name: "Test Household" };

			await householdCache.setHousehold("household123", householdData);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"test:cache:household:household123",
				600, // Default TTL for household cache
				JSON.stringify(householdData),
			);
		});

		it("should invalidate household data", async () => {
			const result = await householdCache.invalidateHousehold("household123");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"test:cache:household:household123",
				"test:cache:household:household123:stale",
			);
			expect(result).toBe(true);
		});
	});

	describe("AnimalCache", () => {
		it("should get animal data", async () => {
			const animalData = { id: "animal123", name: "Fluffy", species: "Cat" };
			mockRedisClient.get.mockResolvedValue(JSON.stringify(animalData));

			const result = await animalCache.getAnimal("animal123");

			expect(mockRedisClient.get).toHaveBeenCalledWith(
				"test:cache:animal:animal123",
			);
			expect(result).toEqual(animalData);
		});

		it("should set animal data", async () => {
			const animalData = { id: "animal123", name: "Fluffy", species: "Cat" };

			const result = await animalCache.setAnimal("animal123", animalData);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"test:cache:animal:animal123",
				600, // Default TTL for animal cache
				JSON.stringify(animalData),
			);
			expect(result).toBe(true);
		});

		it("should invalidate animal data", async () => {
			const result = await animalCache.invalidateAnimal("animal123");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"test:cache:animal:animal123",
				"test:cache:animal:animal123:stale",
			);
			expect(result).toBe(true);
		});
	});

	describe("PendingMedsCache", () => {
		it("should get pending medications data", async () => {
			const pendingMeds = [
				{ id: "med1", dueAt: "2024-01-01T12:00:00Z" },
				{ id: "med2", dueAt: "2024-01-01T13:00:00Z" },
			];
			mockRedisClient.get.mockResolvedValue(JSON.stringify(pendingMeds));

			const result = await pendingMedsCache.getPendingMeds("household123");

			expect(mockRedisClient.get).toHaveBeenCalledWith(
				"test:cache:pending-meds:household123",
			);
			expect(result).toEqual(pendingMeds);
		});

		it("should set pending medications data with short TTL", async () => {
			const pendingMeds = [{ id: "med1", dueAt: "2024-01-01T12:00:00Z" }];

			const result = await pendingMedsCache.setPendingMeds(
				"household123",
				pendingMeds,
			);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"test:cache:pending-meds:household123",
				60, // Short TTL for pending meds
				JSON.stringify(pendingMeds),
			);
			expect(result).toBe(true);
		});

		it("should set pending medications data with custom TTL", async () => {
			const pendingMeds = [{ id: "med1", dueAt: "2024-01-01T12:00:00Z" }];

			await pendingMedsCache.setPendingMeds("household123", pendingMeds, 120);

			expect(mockRedisClient.setex).toHaveBeenCalledWith(
				"test:cache:pending-meds:household123",
				120,
				JSON.stringify(pendingMeds),
			);
		});

		it("should invalidate pending medications data", async () => {
			const result =
				await pendingMedsCache.invalidatePendingMeds("household123");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"test:cache:pending-meds:household123",
				"test:cache:pending-meds:household123:stale",
			);
			expect(result).toBe(true);
		});
	});
});

describe("Singleton Cache Instances", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setex.mockResolvedValue("OK");
	});

	it("should export singleton instances", () => {
		expect(cache).toBeInstanceOf(CacheService);
		expect(householdCache).toBeInstanceOf(CacheService);
		expect(animalCache).toBeInstanceOf(CacheService);
		expect(pendingMedsCache).toBeInstanceOf(CacheService);
	});

	it("should work with exported cache singleton", async () => {
		const testData = { test: "data" };

		await cache.set("singleton-test", testData);

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:singleton-test",
			300, // Default TTL
			JSON.stringify(testData),
		);
	});
});

describe("Namespace Isolation", () => {
	let service1: CacheService;
	let service2: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service1 = new CacheService();
		service2 = new CacheService();
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setex.mockResolvedValue("OK");
	});

	it("should isolate keys by namespace", async () => {
		const testData1 = { namespace: "one" };
		const testData2 = { namespace: "two" };

		await service1.set("same-key", testData1, { namespace: "ns1" });
		await service2.set("same-key", testData2, { namespace: "ns2" });

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"ns1:same-key",
			300,
			JSON.stringify(testData1),
		);
		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"ns2:same-key",
			300,
			JSON.stringify(testData2),
		);
	});

	it("should use default namespace when not specified", async () => {
		await service1.set("default-key", "test-value");

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:default-key",
			300,
			'"test-value"',
		);
	});
});

describe("TTL Behavior", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
		mockRedisClient.setex.mockResolvedValue("OK");
		mockRedisClient.set.mockResolvedValue("OK");
	});

	it("should use default TTL when not specified", async () => {
		await service.set("ttl-test", "data");

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:ttl-test",
			300, // Default TTL
			'"data"',
		);
	});

	it("should use custom TTL when specified", async () => {
		await service.set("ttl-test", "data", { ttl: 1800 });

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:ttl-test",
			1800,
			'"data"',
		);
	});

	it("should use regular set for permanent cache (TTL = 0)", async () => {
		await service.set("permanent", "data", { ttl: 0 });

		expect(mockRedisClient.set).toHaveBeenCalledWith(
			"cache:permanent",
			'"data"',
		);
		expect(mockRedisClient.setex).not.toHaveBeenCalled();
	});

	it("should set stale cache with extended TTL", async () => {
		await service.set("stale-test", "data", {
			ttl: 300,
			staleOnError: true,
		});

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:stale-test",
			300,
			'"data"',
		);
		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"cache:stale-test:stale",
			86400, // 24 hours stale TTL
			'"data"',
		);
	});
});

describe("Error Recovery and Stale Cache", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
	});

	it("should gracefully handle Redis failures", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));
		mockRedisClient.setex.mockRejectedValue(
			new Error("Redis connection failed"),
		);
		mockRedisClient.del.mockRejectedValue(new Error("Redis connection failed"));

		// All operations should handle errors gracefully
		const getResult = await service.get("error-key");
		const setResult = await service.set("error-key", "data");
		const deleteResult = await service.delete("error-key");

		expect(getResult).toBeNull();
		expect(setResult).toBe(false);
		expect(deleteResult).toBe(false);
		expect(consoleSpy).toHaveBeenCalledTimes(3);

		consoleSpy.mockRestore();
	});

	it("should fall back to stale cache when factory function fails", async () => {
		const staleData = { stale: true };
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		mockRedisClient.get
			.mockResolvedValueOnce(null) // Main cache miss
			.mockResolvedValueOnce(JSON.stringify(staleData)); // Stale cache hit

		const factory = vi.fn().mockRejectedValue(new Error("Service unavailable"));

		const result = await service.getOrSet("failing-key", factory, {
			staleOnError: true,
		});

		expect(result).toEqual(staleData);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Using stale cache for failing-key due to error",
		);

		consoleWarnSpy.mockRestore();
	});

	it("should handle non-string stale cache values", async () => {
		const staleObject = { direct: "object" };
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		mockRedisClient.get
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(staleObject); // Non-string stale value

		const factory = vi.fn().mockRejectedValue(new Error("Factory error"));

		const result = await service.getOrSet("test-key", factory, {
			staleOnError: true,
		});

		expect(result).toEqual(staleObject);
		consoleWarnSpy.mockRestore();
	});
});

describe("Full Key Methods", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setex.mockResolvedValue("OK");
		mockRedisClient.del.mockResolvedValue(1);
	});

	it("should get value by full key without additional namespacing", async () => {
		const testData = { test: "data" };
		mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

		const result = await service.getByFullKey("custom:namespace:key");

		expect(mockRedisClient.get).toHaveBeenCalledWith("custom:namespace:key");
		expect(result).toEqual(testData);
	});

	it("should set value by full key without additional namespacing", async () => {
		const testData = { test: "data" };

		const result = await service.setByFullKey(
			"custom:namespace:key",
			testData,
			{ ttl: 300 },
		);

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"custom:namespace:key",
			300,
			JSON.stringify(testData),
		);
		expect(result).toBe(true);
	});

	it("should set value by full key with stale cache", async () => {
		const testData = { test: "data" };

		await service.setByFullKey("custom:namespace:key", testData, {
			ttl: 300,
			staleOnError: true,
		});

		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"custom:namespace:key",
			300,
			JSON.stringify(testData),
		);
		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"custom:namespace:key:stale",
			86400,
			JSON.stringify(testData),
		);
	});

	it("should set value by full key without TTL", async () => {
		const testData = { test: "data" };

		await service.setByFullKey("custom:namespace:key", testData, { ttl: 0 });

		expect(mockRedisClient.set).toHaveBeenCalledWith(
			"custom:namespace:key",
			JSON.stringify(testData),
		);
		expect(mockRedisClient.setex).not.toHaveBeenCalled();
	});

	it("should delete value by full key without additional namespacing", async () => {
		const result = await service.deleteByFullKey("custom:namespace:key");

		expect(mockRedisClient.del).toHaveBeenCalledWith(
			"custom:namespace:key",
			"custom:namespace:key:stale",
		);
		expect(result).toBe(true);
	});

	it("should handle errors in full key methods", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const error = new Error("Redis error");

		mockRedisClient.get.mockRejectedValue(error);
		mockRedisClient.setex.mockRejectedValue(error);
		mockRedisClient.del.mockRejectedValue(error);

		const getResult = await service.getByFullKey("error:key");
		const setResult = await service.setByFullKey("error:key", "data");
		const deleteResult = await service.deleteByFullKey("error:key");

		expect(getResult).toBeNull();
		expect(setResult).toBe(false);
		expect(deleteResult).toBe(false);
		expect(consoleSpy).toHaveBeenCalledTimes(3);

		consoleSpy.mockRestore();
	});

	it("should work with getOrSetByFullKey", async () => {
		// Cache miss - should call factory
		mockRedisClient.get.mockResolvedValueOnce(null);
		const factory = vi.fn().mockResolvedValue({ factory: "data" });

		const result1 = await service.getOrSetByFullKey(
			"custom:namespace:key",
			factory,
			{ ttl: 300 },
		);

		expect(mockRedisClient.get).toHaveBeenCalledWith("custom:namespace:key");
		expect(factory).toHaveBeenCalledOnce();
		expect(result1).toEqual({ factory: "data" });
		expect(mockRedisClient.setex).toHaveBeenCalledWith(
			"custom:namespace:key",
			300,
			JSON.stringify({ factory: "data" }),
		);

		// Cache hit - should not call factory
		mockRedisClient.get.mockResolvedValueOnce(
			JSON.stringify({ cached: "data" }),
		);
		const factory2 = vi.fn();

		const result2 = await service.getOrSetByFullKey(
			"custom:namespace:key2",
			factory2,
		);

		expect(factory2).not.toHaveBeenCalled();
		expect(result2).toEqual({ cached: "data" });
	});

	it("should use stale cache in getOrSetByFullKey when factory fails", async () => {
		const staleData = { stale: "data" };
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		mockRedisClient.get
			.mockResolvedValueOnce(null) // Main cache miss
			.mockResolvedValueOnce(JSON.stringify(staleData)); // Stale cache hit

		const factory = vi.fn().mockRejectedValue(new Error("Factory error"));

		const result = await service.getOrSetByFullKey(
			"custom:namespace:key",
			factory,
			{
				staleOnError: true,
			},
		);

		expect(result).toEqual(staleData);
		expect(mockRedisClient.get).toHaveBeenCalledWith("custom:namespace:key");
		expect(mockRedisClient.get).toHaveBeenCalledWith(
			"custom:namespace:key:stale",
		);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Using stale cache for custom:namespace:key due to error",
		);

		consoleWarnSpy.mockRestore();
	});
});

describe("Cache Performance", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
		mockRedisClient.get.mockResolvedValue(null);
		mockRedisClient.setex.mockResolvedValue("OK");
	});

	it("should handle large objects", async () => {
		const largeObject = {
			data: Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				name: `item-${i}`,
			})),
			metadata: { size: 1000, generated: new Date() },
		};

		const setResult = await service.set("large-object", largeObject);
		expect(setResult).toBe(true);

		const serializedData = mockRedisClient.setex.mock.calls[0]?.[2];
		expect(serializedData).toBe(JSON.stringify(largeObject));
	});

	it("should handle special characters in keys", async () => {
		const specialKeys = [
			"key:with:colons",
			"key-with-dashes",
			"key_with_underscores",
			"key.with.dots",
			"key/with/slashes",
		];

		for (const key of specialKeys) {
			await service.set(key, "test-data");
		}

		expect(mockRedisClient.setex).toHaveBeenCalledTimes(specialKeys.length);
		specialKeys.forEach((key, index) => {
			expect(mockRedisClient.setex.mock.calls[index]?.[0]).toBe(`cache:${key}`);
		});
	});

	it("should handle various data types", async () => {
		const testCases = [
			["string", "test-string"],
			["number", 42],
			["boolean-true", true],
			["boolean-false", false],
			["null-value", null],
			["array", [1, 2, 3]],
			["object", { key: "value" }],
			["nested", { level1: { level2: { level3: "deep" } } }],
		];

		for (const [key, value] of testCases) {
			await service.set(key as string, value);
		}

		expect(mockRedisClient.setex).toHaveBeenCalledTimes(testCases.length);
		testCases.forEach(([_key, value], index) => {
			expect(mockRedisClient.setex.mock.calls[index]?.[2]).toBe(
				JSON.stringify(value),
			);
		});
	});
});

describe("Cache Integration", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
	});

	it("should work with getOrSet and factory that returns different data types", async () => {
		// Test string factory
		mockRedisClient.get.mockResolvedValueOnce(null);
		const stringResult = await service.getOrSet(
			"string-key",
			async () => "factory-string",
		);
		expect(stringResult).toBe("factory-string");

		// Test object factory
		mockRedisClient.get.mockResolvedValueOnce(null);
		const objectResult = await service.getOrSet("object-key", async () => ({
			factory: "object",
		}));
		expect(objectResult).toEqual({ factory: "object" });

		// Test array factory
		mockRedisClient.get.mockResolvedValueOnce(null);
		const arrayResult = await service.getOrSet("array-key", async () => [
			1, 2, 3,
		]);
		expect(arrayResult).toEqual([1, 2, 3]);
	});

	it("should handle concurrent operations safely", async () => {
		// Simulate concurrent get operations
		const promises = Array.from({ length: 10 }, (_, i) =>
			service.get(`concurrent-key-${i}`),
		);

		await Promise.all(promises);

		expect(mockRedisClient.get).toHaveBeenCalledTimes(10);
	});

	it("should work with invalidateMany for mixed key types", async () => {
		mockRedisClient.del.mockResolvedValue(8); // 4 keys * 2 (main + stale)

		const keys = ["string-key", "object-key", "array-key", "special:key"];
		const result = await service.invalidateMany(keys, "mixed");

		expect(mockRedisClient.del).toHaveBeenCalledWith(
			"mixed:string-key",
			"mixed:string-key:stale",
			"mixed:object-key",
			"mixed:object-key:stale",
			"mixed:array-key",
			"mixed:array-key:stale",
			"mixed:special:key",
			"mixed:special:key:stale",
		);
		expect(result).toBe(8);
	});
});

describe("Environment-based Testing", () => {
	it("should work correctly in test environment", () => {
		expect(process.env.NODE_ENV).toBe("test");

		// Verify all cache instances are properly initialized
		expect(cache).toBeInstanceOf(CacheService);
		expect(householdCache).toBeInstanceOf(CacheService);
		expect(animalCache).toBeInstanceOf(CacheService);
		expect(pendingMedsCache).toBeInstanceOf(CacheService);
	});

	it("should handle mocked Redis client correctly", () => {
		// Verify that our mock is working as expected
		expect(typeof mockRedisClient.get).toBe("function");
		expect(typeof mockRedisClient.set).toBe("function");
		expect(typeof mockRedisClient.setex).toBe("function");
		expect(typeof mockRedisClient.del).toBe("function");

		// Verify the mock functions are spies
		expect(vi.isMockFunction(mockRedisClient.get)).toBe(true);
		expect(vi.isMockFunction(mockRedisClient.set)).toBe(true);
		expect(vi.isMockFunction(mockRedisClient.setex)).toBe(true);
		expect(vi.isMockFunction(mockRedisClient.del)).toBe(true);
	});
});

describe("Cache Validation", () => {
	let service: CacheService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new CacheService();
		mockRedisClient.setex.mockResolvedValue("OK");
	});

	it("should reject empty cache keys", async () => {
		await expect(service.get("")).rejects.toThrow("Cache key cannot be empty");
		await expect(service.set("", "value")).rejects.toThrow(
			"Cache key cannot be empty",
		);
		await expect(service.delete("")).rejects.toThrow(
			"Cache key cannot be empty",
		);
		await expect(service.getOrSet("", async () => "value")).rejects.toThrow(
			"Cache key cannot be empty",
		);
	});

	it("should reject keys with whitespace only", async () => {
		await expect(service.get("   ")).rejects.toThrow(
			"Cache key cannot be empty",
		);
		await expect(service.set("   ", "value")).rejects.toThrow(
			"Cache key cannot be empty",
		);
	});

	it("should reject keys with invalid characters", async () => {
		const invalidKeys = ["key\r", "key\n", "key\0"];

		for (const invalidKey of invalidKeys) {
			await expect(service.get(invalidKey)).rejects.toThrow(
				"Cache key contains invalid characters",
			);
			await expect(service.set(invalidKey, "value")).rejects.toThrow(
				"Cache key contains invalid characters",
			);
		}
	});

	it("should warn about very long keys", async () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const longKey = "x".repeat(300);

		await service.set(longKey, "value");

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining(`Cache key is very long (300 chars)`),
		);

		consoleSpy.mockRestore();
	});

	it("should warn about large cache values", async () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		// Create a large object (> 1MB)
		const largeValue = {
			data: "x".repeat(1024 * 1024 + 100), // Just over 1MB
		};

		await service.set("large-key", largeValue);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('Cache value for key "large-key" is large'),
		);

		consoleSpy.mockRestore();
	});

	it("should reject extremely large cache values", async () => {
		// Create a value > 10MB
		const extremelyLargeValue = {
			data: "x".repeat(11 * 1024 * 1024), // 11MB
		};

		await expect(service.set("huge-key", extremelyLargeValue)).rejects.toThrow(
			'Cache value for key "huge-key" is too large',
		);
	});

	it("should validate keys in getOrSet", async () => {
		const factory = vi.fn().mockResolvedValue("value");

		await expect(service.getOrSet("", factory)).rejects.toThrow(
			"Cache key cannot be empty",
		);
		expect(factory).not.toHaveBeenCalled();
	});

	it("should not interfere with normal operation for valid keys and values", async () => {
		const normalKey = "normal-key";
		const normalValue = { id: 123, data: "normal data" };

		const result = await service.set(normalKey, normalValue);
		expect(result).toBe(true);

		// Should not generate any warnings
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await service.set("another-key", "simple value");
		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should validate full keys in ByFullKey methods", async () => {
		// Note: We're not adding key validation to ByFullKey methods since they expect
		// already-constructed Redis keys, but we do validate values
		const largeValue = {
			data: "x".repeat(11 * 1024 * 1024), // 11MB
		};

		await expect(service.setByFullKey("test:key", largeValue)).rejects.toThrow(
			'Cache value for key "test:key" is too large',
		);
	});
});
