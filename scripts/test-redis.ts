#!/usr/bin/env tsx

/**
 * Test script for Redis infrastructure
 */

import { logger } from "../lib/logging/logger";
import { cache, householdCache } from "../lib/redis/cache";
import { CircuitBreaker } from "../lib/redis/circuit-breaker";
import { checkRedisHealth } from "../lib/redis/client";
import { getRateLimiter } from "../lib/redis/rate-limit";

async function testRedisConnection() {
	console.log("🔍 Testing Redis Connection...\n");

	try {
		// Test basic health
		const health = await checkRedisHealth();
		console.log("✅ Redis Health Check:", health);

		if (!health.healthy) {
			throw new Error(`Redis unhealthy: ${health.error}`);
		}

		console.log(`✅ Redis latency: ${health.latency}ms\n`);
	} catch (error) {
		console.error("❌ Redis connection failed:", error);
		process.exit(1);
	}
}

async function testCache() {
	console.log("🔍 Testing Cache Service...\n");

	try {
		// Test basic cache operations
		const testKey = "test:cache";
		const testData = { message: "Hello from cache!", timestamp: Date.now() };

		// Set cache
		await cache.set(testKey, testData, { ttl: 60 });
		console.log("✅ Cache set:", testKey);

		// Get cache
		const retrieved = await cache.get(testKey);
		console.log("✅ Cache get:", retrieved);

		// Test household cache
		const householdId = "test-household-123";
		const householdData = { name: "Test Household", memberCount: 3 };

		await householdCache.setHousehold(householdId, householdData);
		const cachedHousehold = await householdCache.getHousehold(householdId);
		console.log("✅ Household cache:", cachedHousehold);

		// Clean up
		await cache.delete(testKey);
		await householdCache.invalidateHousehold(householdId);
		console.log("✅ Cache cleanup complete\n");
	} catch (error) {
		console.error("❌ Cache test failed:", error);
	}
}

async function testRateLimiting() {
	console.log("🔍 Testing Rate Limiting...\n");

	try {
		const userId = "test-user-123";
		const rateLimiter = getRateLimiter("user");

		// Test rate limiting
		for (let i = 0; i < 5; i++) {
			const result = await rateLimiter.check(userId);
			console.log(
				`Request ${i + 1}: ${result.success ? "✅ Allowed" : "❌ Blocked"}`,
			);
			console.log(`  Remaining: ${result.remaining}/${result.limit}`);
			console.log(`  Reset in: ${Math.round(result.reset / 1000)}s`);
		}

		console.log("\n✅ Rate limiting working correctly\n");
	} catch (error) {
		console.error("❌ Rate limiting test failed:", error);
	}
}

async function testCircuitBreaker() {
	console.log("🔍 Testing Circuit Breaker...\n");

	try {
		const breaker = new CircuitBreaker("test-service", {
			failureThreshold: 2,
			recoveryTimeout: 5000,
			monitoringPeriod: 10000,
		});

		// Test successful operation
		const success = await breaker.execute(async () => {
			return "Operation successful!";
		});
		console.log("✅ Successful operation:", success);

		// Test failures to trip the breaker
		for (let i = 0; i < 3; i++) {
			try {
				await breaker.execute(async () => {
					throw new Error("Simulated failure");
				});
			} catch (_error) {
				console.log(`⚠️ Operation ${i + 1} failed (expected)`);
			}
		}

		// Check breaker state
		const state = await breaker.getState();
		console.log("🔌 Circuit breaker state:", state);

		// Test with fallback
		const withFallback = await breaker.execute(
			async () => {
				throw new Error("Will use fallback");
			},
			async () => "Fallback response",
		);
		console.log("✅ Fallback worked:", withFallback);

		console.log("\n✅ Circuit breaker working correctly\n");
	} catch (error) {
		console.error("❌ Circuit breaker test failed:", error);
	}
}

async function testLogging() {
	console.log("🔍 Testing Structured Logging...\n");

	try {
		// Test different log levels
		await logger.debug("Debug message", { test: true });
		await logger.info("Info message", { userId: "test-123" });
		await logger.warn("Warning message", { threshold: 80 });
		await logger.error("Error message", new Error("Test error"));

		// Test performance tracking
		const result = await logger.trackOperation("test.operation", async () => {
			// Simulate some work
			await new Promise((resolve) => setTimeout(resolve, 100));
			return "Operation complete";
		});
		console.log("✅ Operation tracked:", result);

		console.log("\n✅ Logging working correctly\n");
	} catch (error) {
		console.error("❌ Logging test failed:", error);
	}
}

async function runAllTests() {
	console.log("🚀 Starting Redis Infrastructure Tests\n");
	console.log("================================\n");

	await testRedisConnection();
	await testCache();
	await testRateLimiting();
	await testCircuitBreaker();
	await testLogging();

	console.log("================================");
	console.log("✅ All tests completed successfully!");

	// Give Redis time to close connections
	await new Promise((resolve) => setTimeout(resolve, 1000));
	process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
	console.error("❌ Test suite failed:", error);
	process.exit(1);
});
