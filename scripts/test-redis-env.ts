#!/usr/bin/env tsx
/**
 * Test Redis with proper environment loading
 */

// Load environment variables first
import "../envConfig";

import { cache } from "../lib/redis/cache";
import { checkRedisHealth, isRedisConfigured } from "../lib/redis/client";

async function testRedis() {
	console.log("🔍 Testing Redis Configuration...\n");

	// Check if Redis is configured
	if (!isRedisConfigured()) {
		console.error(
			"❌ Redis is not configured. Please check environment variables:",
		);
		console.error("   - KV_REST_API_URL");
		console.error("   - KV_REST_API_TOKEN");
		process.exit(1);
	}

	console.log("✅ Redis configuration found\n");

	// Test connection
	console.log("🔍 Testing Redis Connection...");
	const health = await checkRedisHealth();

	if (!health.healthy) {
		console.error("❌ Redis connection failed:", health.error);
		process.exit(1);
	}

	console.log(`✅ Redis is healthy! Latency: ${health.latency}ms\n`);

	// Test basic operations
	console.log("🔍 Testing Basic Operations...");

	try {
		const testKey = "test:ping";
		const testValue = { message: "Hello Redis!", timestamp: Date.now() };

		// Set a value
		await cache.set(testKey, testValue, { ttl: 60 });
		console.log("✅ Set value:", testKey);

		// Get the value
		const retrieved = await cache.get(testKey);
		console.log("✅ Retrieved value:", retrieved);

		// Delete the value
		await cache.delete(testKey);
		console.log("✅ Deleted value\n");

		console.log("🎉 All Redis tests passed!");
	} catch (error) {
		console.error("❌ Redis operation failed:", error);
		process.exit(1);
	}
}

testRedis().catch(console.error);
