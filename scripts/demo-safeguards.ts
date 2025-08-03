#!/usr/bin/env tsx

/**
 * Safeguards Demonstration Script
 *
 * Quick demonstration of monitoring and safeguards working correctly
 */

import { CircuitBreaker } from "../lib/circuit-breaker";
import { ConnectionQueue, QUEUE_PRIORITIES } from "../lib/connection-queue";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "../lib/rate-limiting";

async function demonstrateSafeguards(): Promise<void> {
	console.log("🔒 VetMed Tracker Safeguards Demonstration");
	console.log("=".repeat(50));

	// 1. Circuit Breaker Demo
	console.log("\n🔄 Circuit Breaker Demonstration");
	const demoCircuitBreaker = new CircuitBreaker({
		failureThreshold: 3,
		timeout: 2000,
	});

	console.log(`Initial state: ${demoCircuitBreaker.getMetrics().state}`);

	// Simulate failures to trigger circuit breaker
	for (let i = 0; i < 4; i++) {
		try {
			await demoCircuitBreaker.execute(async () => {
				throw new Error(`Simulated failure ${i + 1}`);
			});
		} catch (error) {
			console.log(
				`❌ Failure ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	console.log(`After failures: ${demoCircuitBreaker.getMetrics().state}`);
	console.log(
		`Failure rate: ${demoCircuitBreaker.getMetrics().failureRate.toFixed(1)}%`,
	);

	// Test with fallback
	const fallbackResult = await demoCircuitBreaker.execute(
		async () => {
			throw new Error("Primary service failed");
		},
		() => "🔄 Fallback response: System running in degraded mode",
	);
	console.log(`✅ ${fallbackResult}`);

	// 2. Rate Limiting Demo
	console.log("\n🚦 Rate Limiting Demonstration");
	const testKey = "demo-user";
	const config = RATE_LIMIT_CONFIGS.api;

	console.log(
		`Rate limit: ${config.maxRequests} requests per ${config.windowMs}ms`,
	);

	let allowedCount = 0;
	let deniedCount = 0;

	// Make requests to test rate limiting
	for (let i = 0; i < 10; i++) {
		const result = checkRateLimit(testKey, config);
		if (result.allowed) {
			allowedCount++;
			console.log(
				`✅ Request ${i + 1}: Allowed (${result.remaining} remaining)`,
			);
		} else {
			deniedCount++;
			console.log(
				`❌ Request ${i + 1}: Rate limited (retry in ${result.retryAfter}s)`,
			);
		}
	}

	console.log(`📊 Results: ${allowedCount} allowed, ${deniedCount} denied`);

	// 3. Connection Queue Demo
	console.log("\n🗂️ Connection Queue Demonstration");
	const demoQueue = new ConnectionQueue({
		maxConcurrentConnections: 2,
		maxQueueSize: 5,
		timeoutMs: 5000,
	});

	console.log("Adding tasks to queue with different priorities...");

	const tasks: Promise<string>[] = [];

	// Add tasks with different priorities
	tasks.push(
		demoQueue.enqueue(
			async () => {
				await sleep(100);
				console.log("🟡 Normal priority task completed");
				return "normal";
			},
			QUEUE_PRIORITIES.NORMAL,
			"normal-task",
		),
	);

	tasks.push(
		demoQueue.enqueue(
			async () => {
				await sleep(100);
				console.log("🔴 High priority task completed");
				return "high";
			},
			QUEUE_PRIORITIES.HIGH,
			"high-task",
		),
	);

	tasks.push(
		demoQueue.enqueue(
			async () => {
				await sleep(100);
				console.log("🟢 Critical priority task completed");
				return "critical";
			},
			QUEUE_PRIORITIES.CRITICAL,
			"critical-task",
		),
	);

	// Show queue stats
	const stats = demoQueue.getStats();
	console.log(
		`📊 Queue stats: ${stats.queuedItems} queued, ${stats.activeConnections} active`,
	);

	await Promise.all(tasks);

	const finalStats = demoQueue.getStats();
	console.log(
		`📊 Final stats: ${finalStats.totalProcessed} processed, ${finalStats.totalFailed} failed`,
	);

	// 4. Health Monitoring Demo
	console.log("\n🏥 Health Monitoring Demonstration");

	// Simulate health check data
	const healthData = {
		status: "healthy",
		timestamp: new Date().toISOString(),
		uptime: 123456,
		components: {
			database: { status: "healthy", responseTime: 45 },
			queue: { status: "healthy", queuedItems: 2 },
			circuitBreakers: {
				database: { status: "healthy", state: "CLOSED" },
				critical: { status: "healthy", state: "CLOSED" },
			},
		},
		metrics: {
			database: { responseTime: 45, isHealthy: true },
			queue: { queuedItems: 2, activeConnections: 1 },
			circuitBreakers: {
				database: demoCircuitBreaker.getMetrics(),
			},
		},
	};

	console.log("🟢 System Status:", healthData.status.toUpperCase());
	console.log(
		"📊 Database Response Time:",
		`${healthData.components.database.responseTime}ms`,
	);
	console.log(
		"🗂️ Queue Status:",
		`${healthData.components.queue.queuedItems} items queued`,
	);
	console.log(
		"🔄 Circuit Breakers:",
		Object.entries(healthData.components.circuitBreakers)
			.map(([name, cb]) => `${name}: ${cb.state}`)
			.join(", "),
	);

	// 5. Integration Demo
	console.log("\n🔗 Integrated Safeguards Demonstration");
	console.log("Simulating high load scenario...");

	const integrationPromises: Promise<string>[] = [];

	// Simulate multiple concurrent operations
	for (let i = 0; i < 8; i++) {
		integrationPromises.push(
			demoQueue.enqueue(
				async () => {
					// Check rate limit
					const rateLimitResult = checkRateLimit(
						`user-${i % 3}`,
						RATE_LIMIT_CONFIGS.recording,
					);

					if (!rateLimitResult.allowed) {
						throw new Error("Rate limited");
					}

					// Simulate database operation with circuit breaker
					return await demoCircuitBreaker.execute(
						async () => {
							await sleep(50 + Math.random() * 100);

							// Simulate occasional failure
							if (Math.random() < 0.2) {
								throw new Error("Database timeout");
							}

							return `Operation ${i} completed`;
						},
						() => "🔄 Cached response (fallback)",
					);
				},
				i < 4 ? QUEUE_PRIORITIES.HIGH : QUEUE_PRIORITIES.NORMAL,
				`operation-${i}`,
			),
		);
	}

	const results = await Promise.allSettled(integrationPromises);

	const successful = results.filter((r) => r.status === "fulfilled").length;
	const failed = results.filter((r) => r.status === "rejected").length;

	console.log(
		`📊 Integration test results: ${successful} successful, ${failed} failed`,
	);
	console.log(
		`🔄 Final circuit breaker state: ${demoCircuitBreaker.getMetrics().state}`,
	);
	console.log(
		`📈 Final failure rate: ${demoCircuitBreaker.getMetrics().failureRate.toFixed(1)}%`,
	);

	// Summary
	console.log(`\n${"=".repeat(50)}`);
	console.log("✅ SAFEGUARDS DEMONSTRATION COMPLETE");
	console.log("=".repeat(50));
	console.log("🔄 Circuit Breaker: Protects against cascading failures");
	console.log("🚦 Rate Limiting: Prevents API abuse");
	console.log("🗂️ Connection Queue: Manages database connections");
	console.log("🏥 Health Monitoring: Provides system visibility");
	console.log("🔗 Integration: All safeguards work together seamlessly");
	console.log("\n🎯 VetMed Tracker is protected and monitored!");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the demonstration
if (require.main === module) {
	demonstrateSafeguards().catch((error) => {
		console.error("❌ Demonstration failed:", error);
		process.exit(1);
	});
}
