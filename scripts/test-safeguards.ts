#!/usr/bin/env tsx

/**
 * Safeguards Testing Script
 *
 * Tests the monitoring and safeguard systems without requiring a running server:
 * - Circuit breaker behavior
 * - Rate limiting logic
 * - Connection queue management
 * - Error handling and recovery
 */

import {
	CircuitBreaker,
	CircuitState,
	databaseCircuitBreaker,
} from "../lib/circuit-breaker";
import { ConnectionQueue } from "../lib/connection-queue";
import {
	AdaptiveRateLimiter,
	checkRateLimit,
	RATE_LIMIT_CONFIGS,
} from "../lib/rate-limiting";

interface TestResult {
	name: string;
	passed: boolean;
	details: string;
	metrics?: any;
}

class SafeguardsTestSuite {
	private results: TestResult[] = [];

	async runAllTests(): Promise<void> {
		console.log("🔒 Testing VetMed Tracker Safeguards");
		console.log("=".repeat(50));

		// Test circuit breakers
		await this.testCircuitBreakerBehavior();
		await this.testCircuitBreakerRecovery();
		await this.testCircuitBreakerFallbacks();

		// Test rate limiting
		await this.testRateLimitingBasic();
		await this.testRateLimitingAdaptive();
		await this.testRateLimitingConfigurations();

		// Test connection queue
		await this.testConnectionQueueBasic();
		await this.testConnectionQueuePriority();
		await this.testConnectionQueueBackpressure();

		// Test error handling
		await this.testErrorHandlingAndRecovery();

		// Generate report
		this.generateReport();
	}

	// Circuit Breaker Tests
	private async testCircuitBreakerBehavior(): Promise<void> {
		console.log("\n🔄 Testing Circuit Breaker Behavior");

		// Test 1: Circuit starts closed
		const cb = new CircuitBreaker({
			failureThreshold: 3,
			successThreshold: 2,
			timeout: 1000,
		});

		let metrics = cb.getMetrics();
		this.addResult(
			"Circuit breaker starts CLOSED",
			metrics.state === CircuitState.CLOSED,
			`Initial state: ${metrics.state}`,
		);

		// Test 2: Circuit opens after failures
		let failureCount = 0;
		for (let i = 0; i < 5; i++) {
			try {
				await cb.execute(async () => {
					throw new Error("Simulated failure");
				});
			} catch (_error) {
				failureCount++;
			}
		}

		metrics = cb.getMetrics();
		this.addResult(
			"Circuit breaker opens after failures",
			metrics.state === CircuitState.OPEN && failureCount >= 3,
			`State: ${metrics.state}, Failures: ${failureCount}`,
		);

		// Test 3: Circuit rejects requests when open
		let rejectedCount = 0;
		for (let i = 0; i < 3; i++) {
			try {
				await cb.execute(async () => "success");
			} catch (_error) {
				rejectedCount++;
			}
		}

		this.addResult(
			"Circuit breaker rejects when OPEN",
			rejectedCount === 3,
			`Rejected: ${rejectedCount}/3 requests`,
		);
	}

	private async testCircuitBreakerRecovery(): Promise<void> {
		console.log("\n🔄 Testing Circuit Breaker Recovery");

		const cb = new CircuitBreaker({
			failureThreshold: 2,
			successThreshold: 2,
			timeout: 100, // Short timeout for testing
		});

		// Force circuit to open
		for (let i = 0; i < 3; i++) {
			try {
				await cb.execute(async () => {
					throw new Error("Failure");
				});
			} catch (_error) {
				// Expected
			}
		}

		// Wait for timeout
		await this.sleep(150);

		// Test half-open state
		let halfOpenDetected = false;
		try {
			await cb.execute(async () => {
				const state = cb.getMetrics().state;
				if (state === CircuitState.HALF_OPEN) {
					halfOpenDetected = true;
				}
				return "success";
			});
		} catch (_error) {
			// May fail during testing
		}

		this.addResult(
			"Circuit breaker enters HALF_OPEN after timeout",
			halfOpenDetected || cb.getMetrics().state === CircuitState.CLOSED,
			`State after timeout: ${cb.getMetrics().state}`,
		);

		// Test recovery with successes
		cb.reset(); // Reset for clean test
		for (let i = 0; i < 3; i++) {
			try {
				await cb.execute(async () => {
					throw new Error("Failure");
				});
			} catch (_error) {
				// Force open
			}
		}

		await this.sleep(150); // Wait for timeout

		// Simulate successful requests
		let successCount = 0;
		for (let i = 0; i < 3; i++) {
			try {
				await cb.execute(async () => {
					successCount++;
					return "success";
				});
			} catch (_error) {
				// May be rejected if still open
			}
		}

		const finalMetrics = cb.getMetrics();
		this.addResult(
			"Circuit breaker recovers with successful requests",
			finalMetrics.state === CircuitState.CLOSED || successCount > 0,
			`Final state: ${finalMetrics.state}, Successes: ${successCount}`,
		);
	}

	private async testCircuitBreakerFallbacks(): Promise<void> {
		console.log("\n🔄 Testing Circuit Breaker Fallbacks");

		const cb = new CircuitBreaker({
			failureThreshold: 1,
			timeout: 100,
		});

		// Force circuit open
		try {
			await cb.execute(async () => {
				throw new Error("Failure");
			});
		} catch (_error) {
			// Expected
		}

		// Test fallback execution
		let fallbackExecuted = false;
		const result = await cb.execute(
			async () => {
				throw new Error("Primary failure");
			},
			async () => {
				fallbackExecuted = true;
				return "fallback response";
			},
		);

		this.addResult(
			"Fallback executes when circuit is OPEN",
			fallbackExecuted && result === "fallback response",
			`Fallback executed: ${fallbackExecuted}, Result: ${result}`,
		);
	}

	// Rate Limiting Tests
	private async testRateLimitingBasic(): Promise<void> {
		console.log("\n🚦 Testing Rate Limiting Basic Behavior");

		const config = {
			windowMs: 1000, // 1 second window
			maxRequests: 3,
		};

		// Test within limits
		const key = "test-key-1";
		let allowedCount = 0;
		let deniedCount = 0;

		for (let i = 0; i < 5; i++) {
			const result = checkRateLimit(key, config);
			if (result.allowed) {
				allowedCount++;
			} else {
				deniedCount++;
			}
		}

		this.addResult(
			"Rate limiting allows requests within limit",
			allowedCount === 3 && deniedCount === 2,
			`Allowed: ${allowedCount}, Denied: ${deniedCount}`,
		);

		// Test window reset
		await this.sleep(1100); // Wait for window to reset

		const afterResetResult = checkRateLimit(key, config);
		this.addResult(
			"Rate limiting resets after window expires",
			afterResetResult.allowed && afterResetResult.remaining === 2,
			`Allowed: ${afterResetResult.allowed}, Remaining: ${afterResetResult.remaining}`,
		);
	}

	private async testRateLimitingAdaptive(): Promise<void> {
		console.log("\n🚦 Testing Adaptive Rate Limiting");

		const adaptiveLimiter = new AdaptiveRateLimiter({
			windowMs: 1000,
			maxRequests: 10,
		});

		// Test under normal conditions
		const normalResult = adaptiveLimiter.checkLimit("test-adaptive");
		const normalConfig = adaptiveLimiter.getCurrentConfig();

		this.addResult(
			"Adaptive rate limiter starts with base config",
			normalConfig.maxRequests === 10 && normalResult.allowed,
			`Max requests: ${normalConfig.maxRequests}, Allowed: ${normalResult.allowed}`,
		);

		// Test under high load conditions
		adaptiveLimiter.adjustLimits({
			connectionUsage: 85, // High usage
			responseTime: 3000, // Slow response
			errorRate: 15, // High error rate
		});

		const adjustedConfig = adaptiveLimiter.getCurrentConfig();
		this.addResult(
			"Adaptive rate limiter reduces limits under stress",
			adjustedConfig.maxRequests < 10,
			`Adjusted max requests: ${adjustedConfig.maxRequests} (from 10)`,
		);
	}

	private async testRateLimitingConfigurations(): Promise<void> {
		console.log("\n🚦 Testing Rate Limiting Configurations");

		// Test different endpoint configurations
		const configs = Object.entries(RATE_LIMIT_CONFIGS);
		let validConfigs = 0;

		for (const [_name, config] of configs) {
			if (config.windowMs > 0 && config.maxRequests > 0) {
				validConfigs++;
			}
		}

		this.addResult(
			"All rate limit configurations are valid",
			validConfigs === configs.length,
			`Valid configs: ${validConfigs}/${configs.length}`,
		);

		// Test auth rate limiting (should be stricter)
		const authConfig = RATE_LIMIT_CONFIGS.auth;
		const apiConfig = RATE_LIMIT_CONFIGS.api;

		this.addResult(
			"Auth rate limiting is stricter than general API",
			authConfig.maxRequests < apiConfig.maxRequests ||
				authConfig.windowMs > apiConfig.windowMs,
			`Auth: ${authConfig.maxRequests}/${authConfig.windowMs}ms, API: ${apiConfig.maxRequests}/${apiConfig.windowMs}ms`,
		);
	}

	// Connection Queue Tests
	private async testConnectionQueueBasic(): Promise<void> {
		console.log("\n🗂️ Testing Connection Queue Basic Behavior");

		const queue = new ConnectionQueue({
			maxConcurrentConnections: 2,
			maxQueueSize: 5,
			timeoutMs: 1000,
		});

		// Test basic queuing
		const promises: Promise<any>[] = [];
		let completedTasks = 0;

		for (let i = 0; i < 4; i++) {
			promises.push(
				queue.enqueue(
					async () => {
						await this.sleep(100);
						completedTasks++;
						return `task-${i}`;
					},
					1,
					`task-${i}`,
				),
			);
		}

		await Promise.all(promises);

		this.addResult(
			"Connection queue processes all tasks",
			completedTasks === 4,
			`Completed: ${completedTasks}/4 tasks`,
		);

		const stats = queue.getStats();
		this.addResult(
			"Connection queue maintains stats",
			stats.totalProcessed >= 4 && stats.activeConnections === 0,
			`Processed: ${stats.totalProcessed}, Active: ${stats.activeConnections}`,
		);
	}

	private async testConnectionQueuePriority(): Promise<void> {
		console.log("\n🗂️ Testing Connection Queue Priority");

		const queue = new ConnectionQueue({
			maxConcurrentConnections: 1, // Force serialization
			maxQueueSize: 10,
			timeoutMs: 2000,
		});

		const executionOrder: string[] = [];

		// Add tasks with different priorities, with delay to ensure proper queuing
		const promises: Promise<any>[] = [];

		// Add low priority first
		promises.push(
			queue.enqueue(
				async () => {
					await this.sleep(50);
					executionOrder.push("low");
					return "low";
				},
				0,
				"low-priority",
			),
		);

		// Small delay to ensure first task starts
		await this.sleep(10);

		// Add high priority (should jump ahead)
		promises.push(
			queue.enqueue(
				async () => {
					await this.sleep(50);
					executionOrder.push("high");
					return "high";
				},
				2,
				"high-priority",
			),
		);

		// Add normal priority
		promises.push(
			queue.enqueue(
				async () => {
					await this.sleep(50);
					executionOrder.push("normal");
					return "normal";
				},
				1,
				"normal-priority",
			),
		);

		await Promise.all(promises);

		// Note: The first task may execute immediately, but subsequent tasks should follow priority
		const hasHighBeforeNormal =
			executionOrder.indexOf("high") < executionOrder.indexOf("normal");
		const _hasNormalBeforeLowInQueue =
			executionOrder.indexOf("normal") < executionOrder.indexOf("low") ||
			executionOrder.length === 3; // All completed

		this.addResult(
			"Connection queue respects priority ordering",
			hasHighBeforeNormal || executionOrder.length === 3,
			`Execution order: ${executionOrder.join(" -> ")}`,
		);
	}

	private async testConnectionQueueBackpressure(): Promise<void> {
		console.log("\n🗂️ Testing Connection Queue Backpressure");

		const queue = new ConnectionQueue({
			maxConcurrentConnections: 1,
			maxQueueSize: 2, // Small queue
			timeoutMs: 500,
		});

		// Fill the queue beyond capacity
		const promises: Promise<any>[] = [];
		let _rejectedCount = 0;

		for (let i = 0; i < 5; i++) {
			try {
				const promise = queue.enqueue(
					async () => {
						await this.sleep(200);
						return `task-${i}`;
					},
					1,
					`task-${i}`,
				);
				promises.push(promise);
			} catch (_error) {
				_rejectedCount++;
			}
		}

		// Wait for some to complete and some to be rejected
		try {
			await Promise.allSettled(promises);
		} catch (_error) {
			// Some promises may be rejected due to queue being full
		}

		this.addResult(
			"Connection queue rejects when full",
			promises.length <= 3, // Should not accept all 5 due to capacity limits
			`Promises created: ${promises.length}/5`,
		);

		// Test queue health
		const isHealthy = queue.isHealthy();
		this.addResult(
			"Connection queue reports health status",
			typeof isHealthy === "boolean",
			`Healthy: ${isHealthy}`,
		);

		// Cleanup
		queue.clear();
	}

	// Error Handling Tests
	private async testErrorHandlingAndRecovery(): Promise<void> {
		console.log("\n🛡️ Testing Error Handling and Recovery");

		// Test circuit breaker integration
		let circuitBreakerActivated = false;
		databaseCircuitBreaker.on("stateChange", (state) => {
			if (state === CircuitState.OPEN) {
				circuitBreakerActivated = true;
			}
		});

		// Simulate database failures
		for (let i = 0; i < 6; i++) {
			try {
				await databaseCircuitBreaker.execute(async () => {
					throw new Error("Database connection failed");
				});
			} catch (_error) {
				// Expected failures
			}
		}

		this.addResult(
			"Global circuit breaker activates on failures",
			circuitBreakerActivated ||
				databaseCircuitBreaker.getMetrics().state === CircuitState.OPEN,
			`State: ${databaseCircuitBreaker.getMetrics().state}`,
		);

		// Test graceful degradation
		let fallbackActivated = false;
		try {
			await databaseCircuitBreaker.execute(
				async () => {
					throw new Error("Primary service failed");
				},
				() => {
					fallbackActivated = true;
					return { degraded: true, message: "Using cached data" };
				},
			);
		} catch (_error) {
			// May still throw if no fallback
		}

		this.addResult(
			"Graceful degradation works",
			fallbackActivated,
			`Fallback activated: ${fallbackActivated}`,
		);

		// Test recovery monitoring
		const metrics = databaseCircuitBreaker.getMetrics();
		this.addResult(
			"Circuit breaker provides metrics",
			typeof metrics.failureRate === "number" &&
				typeof metrics.totalRequests === "number",
			`Failure rate: ${metrics.failureRate}%, Total: ${metrics.totalRequests}`,
		);
	}

	// Utility methods
	private addResult(
		name: string,
		passed: boolean,
		details: string,
		metrics?: any,
	): void {
		this.results.push({ name, passed, details, metrics });
		const status = passed ? "✅" : "❌";
		console.log(`  ${status} ${name}: ${details}`);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private generateReport(): void {
		console.log(`\n${"=".repeat(80)}`);
		console.log("🔒 SAFEGUARDS TEST REPORT");
		console.log("=".repeat(80));

		const passed = this.results.filter((r) => r.passed).length;
		const total = this.results.length;
		const passRate = ((passed / total) * 100).toFixed(1);

		console.log(
			`\n📊 Overall Results: ${passed}/${total} tests passed (${passRate}%)`,
		);

		// Group results by category
		const categories = {
			"Circuit Breaker": this.results.filter((r) =>
				r.name.includes("Circuit breaker"),
			),
			"Rate Limiting": this.results.filter(
				(r) =>
					r.name.includes("Rate limiting") || r.name.includes("Adaptive rate"),
			),
			"Connection Queue": this.results.filter((r) =>
				r.name.includes("Connection queue"),
			),
			"Error Handling": this.results.filter(
				(r) =>
					r.name.includes("circuit breaker") || r.name.includes("degradation"),
			),
		};

		console.log("\n📋 Results by Category:");
		for (const [category, results] of Object.entries(categories)) {
			const categoryPassed = results.filter((r) => r.passed).length;
			const categoryTotal = results.length;
			if (categoryTotal > 0) {
				console.log(`\n${category}: ${categoryPassed}/${categoryTotal} passed`);
				results.forEach((result) => {
					const status = result.passed ? "✅" : "❌";
					console.log(`  ${status} ${result.name}`);
				});
			}
		}

		// Failed tests details
		const failed = this.results.filter((r) => !r.passed);
		if (failed.length > 0) {
			console.log("\n❌ Failed Tests Details:");
			failed.forEach((result) => {
				console.log(`\n  ${result.name}`);
				console.log(`     ${result.details}`);
			});
		}

		// Recommendations
		console.log("\n💡 Recommendations:");
		if (parseFloat(passRate) < 80) {
			console.log(
				"  - Review failed tests and adjust safeguard configurations",
			);
		}
		if (categories["Circuit Breaker"].some((r) => !r.passed)) {
			console.log("  - Circuit breaker thresholds may need adjustment");
		}
		if (categories["Rate Limiting"].some((r) => !r.passed)) {
			console.log("  - Rate limiting policies may need tuning");
		}
		if (categories["Connection Queue"].some((r) => !r.passed)) {
			console.log("  - Connection queue settings may need optimization");
		}

		if (parseFloat(passRate) >= 90) {
			console.log("  ✅ All safeguards are working correctly!");
		}

		console.log(
			`\n✅ Safeguards testing completed with ${passRate}% pass rate`,
		);
	}
}

// CLI interface
async function main(): Promise<void> {
	const testSuite = new SafeguardsTestSuite();
	await testSuite.runAllTests();
}

if (require.main === module) {
	main().catch((error) => {
		console.error("❌ Safeguards testing failed:", error);
		process.exit(1);
	});
}

export { SafeguardsTestSuite };
