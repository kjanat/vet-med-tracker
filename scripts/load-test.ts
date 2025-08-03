#!/usr/bin/env tsx

/**
 * Load Testing Script for VetMed Tracker
 *
 * Tests monitoring and safeguards including:
 * - Rate limiting behavior
 * - Connection queue behavior
 * - Circuit breaker scenarios
 * - Health endpoint monitoring
 * - Database failure simulation
 */

import { performance } from "node:perf_hooks";

// Helper function to process circuit breaker data
function processCircuitBreakerData(
	components: Record<string, unknown>,
	metrics: Record<string, unknown>,
): Record<string, { status: string; state?: string }> {
	const result: Record<string, { status: string; state?: string }> = {};

	for (const [name, component] of Object.entries(components)) {
		const componentData = component as { status: string };
		const metricsData = metrics[name] as { state?: string } | undefined;

		result[name] = {
			status: componentData.status,
			state: metricsData?.state,
		};
	}

	return result;
}

// Test configuration
interface LoadTestConfig {
	baseUrl: string;
	concurrentUsers: number;
	requestsPerUser: number;
	testDurationMs: number;
	endpoints: {
		path: string;
		method: "GET" | "POST" | "PUT" | "DELETE";
		headers?: Record<string, string>;
		body?: unknown;
		weight: number; // Probability of selecting this endpoint
	}[];
}

// Test result interfaces
interface TestMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	rateLimitedRequests: number;
	circuitBreakerTriggered: number;
	averageResponseTime: number;
	p95ResponseTime: number;
	p99ResponseTime: number;
	errorsPerSecond: number;
	requestsPerSecond: number;
	healthCheckResults: HealthCheckResult[];
	circuitBreakerStates: CircuitBreakerState[];
	queueStats: QueueStatSnapshot[];
}

interface HealthCheckResult {
	timestamp: number;
	status: "healthy" | "degraded" | "unhealthy";
	responseTime: number;
	components: {
		database: { status: string; responseTime?: number };
		queue: { status: string; queuedItems?: number };
		circuitBreakers: Record<string, { status: string; state?: string }>;
	};
}

interface CircuitBreakerState {
	timestamp: number;
	name: string;
	state: "CLOSED" | "OPEN" | "HALF_OPEN";
	failureCount: number;
	failureRate: number;
}

interface QueueStatSnapshot {
	timestamp: number;
	activeConnections: number;
	queuedItems: number;
	averageWaitTime: number;
}

interface RequestResult {
	success: boolean;
	statusCode: number;
	responseTime: number;
	error?: string;
	rateLimited: boolean;
	circuitBreakerTriggered: boolean;
}

// Load testing scenarios
const SCENARIOS = {
	normal: {
		baseUrl: "http://localhost:3002",
		concurrentUsers: 10,
		requestsPerUser: 50,
		testDurationMs: 60000, // 1 minute
		endpoints: [
			{ path: "/api/health", method: "GET" as const, weight: 0.3 },
			{ path: "/api/trpc/animals.list", method: "GET" as const, weight: 0.2 },
			{
				path: "/api/trpc/households.current",
				method: "GET" as const,
				weight: 0.2,
			},
			{
				path: "/api/trpc/inventory.list",
				method: "GET" as const,
				weight: 0.15,
			},
			{ path: "/api/trpc/regimens.list", method: "GET" as const, weight: 0.15 },
		],
	},

	highLoad: {
		baseUrl: "http://localhost:3002",
		concurrentUsers: 50,
		requestsPerUser: 100,
		testDurationMs: 120000, // 2 minutes
		endpoints: [
			{ path: "/api/health", method: "GET" as const, weight: 0.1 },
			{ path: "/api/trpc/animals.list", method: "GET" as const, weight: 0.25 },
			{
				path: "/api/trpc/households.current",
				method: "GET" as const,
				weight: 0.25,
			},
			{ path: "/api/trpc/inventory.list", method: "GET" as const, weight: 0.2 },
			{ path: "/api/trpc/regimens.list", method: "GET" as const, weight: 0.2 },
		],
	},

	extreme: {
		baseUrl: "http://localhost:3002",
		concurrentUsers: 100,
		requestsPerUser: 200,
		testDurationMs: 180000, // 3 minutes
		endpoints: [
			{ path: "/api/health", method: "GET" as const, weight: 0.05 },
			{ path: "/api/trpc/animals.list", method: "GET" as const, weight: 0.3 },
			{
				path: "/api/trpc/households.current",
				method: "GET" as const,
				weight: 0.3,
			},
			{
				path: "/api/trpc/inventory.list",
				method: "GET" as const,
				weight: 0.175,
			},
			{
				path: "/api/trpc/regimens.list",
				method: "GET" as const,
				weight: 0.175,
			},
		],
	},

	rateLimitTest: {
		baseUrl: "http://localhost:3002",
		concurrentUsers: 20,
		requestsPerUser: 150, // Designed to exceed rate limits
		testDurationMs: 30000, // 30 seconds
		endpoints: [
			{ path: "/api/trpc/animals.list", method: "GET" as const, weight: 1.0 },
		],
	},

	circuitBreakerTest: {
		baseUrl: "http://localhost:3002",
		concurrentUsers: 30,
		requestsPerUser: 100,
		testDurationMs: 90000, // 1.5 minutes
		endpoints: [
			// Focus on endpoints likely to trigger circuit breakers
			{ path: "/api/trpc/inventory.list", method: "GET" as const, weight: 0.4 },
			{ path: "/api/trpc/regimens.list", method: "GET" as const, weight: 0.4 },
			{
				path: "/api/health?detailed=true",
				method: "GET" as const,
				weight: 0.2,
			},
		],
	},
};

class LoadTester {
	private metrics: TestMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		rateLimitedRequests: 0,
		circuitBreakerTriggered: 0,
		averageResponseTime: 0,
		p95ResponseTime: 0,
		p99ResponseTime: 0,
		errorsPerSecond: 0,
		requestsPerSecond: 0,
		healthCheckResults: [],
		circuitBreakerStates: [],
		queueStats: [],
	};

	private responseTimes: number[] = [];
	private healthCheckInterval?: NodeJS.Timeout;
	private testStartTime = 0;

	async runScenario(
		scenarioName: keyof typeof SCENARIOS,
	): Promise<TestMetrics> {
		const config = SCENARIOS[scenarioName];
		console.log(`🚀 Starting load test scenario: ${scenarioName}`);
		console.log(
			`📊 Config: ${config.concurrentUsers} users, ${config.requestsPerUser} requests/user, ${config.testDurationMs}ms duration`,
		);

		this.testStartTime = performance.now();
		this.startHealthMonitoring(config.baseUrl);

		// Start concurrent users
		const userPromises: Promise<void>[] = [];
		for (let i = 0; i < config.concurrentUsers; i++) {
			userPromises.push(this.simulateUser(config, i));
		}

		// Wait for test completion or timeout
		const timeoutPromise = new Promise<void>((resolve) => {
			setTimeout(resolve, config.testDurationMs);
		});

		await Promise.race([Promise.all(userPromises), timeoutPromise]);

		this.stopHealthMonitoring();
		this.calculateFinalMetrics();

		console.log(`✅ Load test completed: ${scenarioName}`);
		return this.metrics;
	}

	private async simulateUser(
		config: LoadTestConfig,
		userId: number,
	): Promise<void> {
		const _startTime = performance.now();

		for (let i = 0; i < config.requestsPerUser; i++) {
			// Check if test duration exceeded
			if (performance.now() - this.testStartTime > config.testDurationMs) {
				break;
			}

			try {
				const endpoint = this.selectRandomEndpoint(config.endpoints);
				const result = await this.makeRequest(config.baseUrl, endpoint);
				this.recordRequestResult(result);

				// Add some jitter between requests
				await this.sleep(Math.random() * 100 + 50); // 50-150ms
			} catch (error) {
				this.metrics.failedRequests++;
				console.error(`❌ User ${userId} request ${i} failed:`, error);
			}
		}
	}

	private selectRandomEndpoint(
		endpoints: LoadTestConfig["endpoints"],
	): LoadTestConfig["endpoints"][0] {
		const random = Math.random();
		let weightSum = 0;

		for (const endpoint of endpoints) {
			weightSum += endpoint.weight;
			if (random <= weightSum) {
				return endpoint;
			}
		}

		// Fallback to first endpoint
		const firstEndpoint = endpoints[0];
		if (!firstEndpoint) {
			throw new Error("No endpoints available");
		}
		return firstEndpoint;
	}

	private async makeRequest(
		baseUrl: string,
		endpoint: LoadTestConfig["endpoints"][0],
	): Promise<RequestResult> {
		const startTime = performance.now();

		try {
			const response = await fetch(`${baseUrl}${endpoint.path}`, {
				method: endpoint.method,
				headers: {
					"Content-Type": "application/json",
					...endpoint.headers,
				},
				body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
			});

			const responseTime = performance.now() - startTime;
			const isSuccess = response.status >= 200 && response.status < 300;
			const isRateLimited = response.status === 429;
			const isCircuitBreaker =
				response.status === 503 &&
				response.headers.get("x-circuit-breaker") === "open";

			return {
				success: isSuccess,
				statusCode: response.status,
				responseTime,
				rateLimited: isRateLimited,
				circuitBreakerTriggered: isCircuitBreaker,
			};
		} catch (error) {
			const responseTime = performance.now() - startTime;
			return {
				success: false,
				statusCode: 0,
				responseTime,
				error: error instanceof Error ? error.message : String(error),
				rateLimited: false,
				circuitBreakerTriggered: false,
			};
		}
	}

	private recordRequestResult(result: RequestResult): void {
		this.metrics.totalRequests++;
		this.responseTimes.push(result.responseTime);

		if (result.success) {
			this.metrics.successfulRequests++;
		} else {
			this.metrics.failedRequests++;
		}

		if (result.rateLimited) {
			this.metrics.rateLimitedRequests++;
		}

		if (result.circuitBreakerTriggered) {
			this.metrics.circuitBreakerTriggered++;
		}
	}

	private startHealthMonitoring(baseUrl: string): void {
		this.healthCheckInterval = setInterval(async () => {
			try {
				const healthResult = await this.checkHealth(baseUrl);
				this.metrics.healthCheckResults.push(healthResult);
			} catch (error) {
				console.warn("⚠️ Health check failed:", error);
			}
		}, 5000); // Check every 5 seconds
	}

	private async checkHealth(baseUrl: string): Promise<HealthCheckResult> {
		const startTime = performance.now();

		const response = await fetch(`${baseUrl}/api/health?detailed=true`);
		const responseTime = performance.now() - startTime;
		const data = await response.json();

		return {
			timestamp: Date.now(),
			status: data.status,
			responseTime,
			components: {
				database: {
					status: data.components.database.status,
					responseTime: data.components.database.responseTime,
				},
				queue: {
					status: data.components.queue.status,
					queuedItems: data.metrics.queue.queuedItems,
				},
				circuitBreakers: processCircuitBreakerData(
					data.components.circuitBreakers,
					data.metrics.circuitBreakers,
				),
			},
		};
	}

	private stopHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
	}

	private calculateFinalMetrics(): void {
		const testDuration = (performance.now() - this.testStartTime) / 1000; // seconds

		// Response time metrics
		this.responseTimes.sort((a, b) => a - b);
		this.metrics.averageResponseTime =
			this.responseTimes.reduce((sum, time) => sum + time, 0) /
			this.responseTimes.length;

		const p95Index = Math.floor(this.responseTimes.length * 0.95);
		const p99Index = Math.floor(this.responseTimes.length * 0.99);
		this.metrics.p95ResponseTime = this.responseTimes[p95Index] || 0;
		this.metrics.p99ResponseTime = this.responseTimes[p99Index] || 0;

		// Rate metrics
		this.metrics.requestsPerSecond = this.metrics.totalRequests / testDuration;
		this.metrics.errorsPerSecond = this.metrics.failedRequests / testDuration;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Database failure simulation
class DatabaseFailureSimulator {
	async simulateHighLoad(): Promise<void> {
		console.log("🔥 Simulating high database load...");

		// Create many concurrent connections to stress the database
		const connections: Promise<void>[] = [];
		for (let i = 0; i < 50; i++) {
			connections.push(this.createSlowQuery());
		}

		await Promise.allSettled(connections);
		console.log("✅ High load simulation completed");
	}

	async simulateConnectionFailure(): Promise<void> {
		console.log("💥 Simulating database connection failure...");

		// This would need to be implemented based on your database setup
		// For testing, we'll simulate by making requests that should fail
		const failures: Promise<void>[] = [];
		for (let i = 0; i < 20; i++) {
			failures.push(this.makeFailingRequest());
		}

		await Promise.allSettled(failures);
		console.log("✅ Connection failure simulation completed");
	}

	private async createSlowQuery(): Promise<void> {
		try {
			// Simulate a slow database query
			await fetch(
				"http://localhost:3000/api/health?detailed=true&simulate_slow=true",
			);
		} catch (_error) {
			// Expected to fail
		}
	}

	private async makeFailingRequest(): Promise<void> {
		try {
			// Try to access an endpoint that should trigger database errors
			await fetch("http://localhost:3000/api/trpc/nonexistent.endpoint");
		} catch (_error) {
			// Expected to fail
		}
	}
}

// Test runner and reporting
class LoadTestRunner {
	private tester = new LoadTester();
	private simulator = new DatabaseFailureSimulator();

	async runAllTests(): Promise<void> {
		console.log("🎯 Starting comprehensive load testing suite");
		console.log("=".repeat(50));

		const results: Record<string, TestMetrics> = {};

		// Test scenarios in order of increasing intensity
		const scenarios: (keyof typeof SCENARIOS)[] = [
			"normal",
			"highLoad",
			"rateLimitTest",
			"circuitBreakerTest",
			"extreme",
		];

		for (const scenario of scenarios) {
			console.log(`\n🔄 Running scenario: ${scenario}`);

			try {
				// Wait between tests to let system recover
				if (Object.keys(results).length > 0) {
					console.log("⏳ Waiting for system to stabilize...");
					await this.sleep(10000); // 10 second cooldown
				}

				const metrics = await this.tester.runScenario(scenario);
				results[scenario] = metrics;

				this.printScenarioResults(scenario, metrics);
			} catch (error) {
				console.error(`❌ Scenario ${scenario} failed:`, error);
			}
		}

		// Run failure simulations
		console.log("\n🧪 Running failure simulations");
		await this.runFailureSimulations();

		// Generate final report
		this.generateReport(results);
	}

	private async runFailureSimulations(): Promise<void> {
		try {
			await this.simulator.simulateHighLoad();
			await this.sleep(5000);
			await this.simulator.simulateConnectionFailure();
		} catch (error) {
			console.error("❌ Failure simulation error:", error);
		}
	}

	private printScenarioResults(scenario: string, metrics: TestMetrics): void {
		this.printBasicMetrics(scenario, metrics);
		this.printPerformanceMetrics(metrics);
		this.printHealthSummary(metrics);
	}

	private printBasicMetrics(scenario: string, metrics: TestMetrics): void {
		console.log(`\n📊 Results for ${scenario}:`);
		console.log(`   Total Requests: ${metrics.totalRequests}`);
		console.log(
			`   Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`,
		);
		console.log(`   Rate Limited: ${metrics.rateLimitedRequests}`);
		console.log(
			`   Circuit Breaker Triggered: ${metrics.circuitBreakerTriggered}`,
		);
	}

	private printPerformanceMetrics(metrics: TestMetrics): void {
		console.log(
			`   Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`,
		);
		console.log(
			`   P95 Response Time: ${metrics.p95ResponseTime.toFixed(2)}ms`,
		);
		console.log(
			`   P99 Response Time: ${metrics.p99ResponseTime.toFixed(2)}ms`,
		);
		console.log(`   Requests/sec: ${metrics.requestsPerSecond.toFixed(2)}`);
		console.log(`   Errors/sec: ${metrics.errorsPerSecond.toFixed(2)}`);
	}

	private printHealthSummary(metrics: TestMetrics): void {
		const healthyChecks = metrics.healthCheckResults.filter(
			(h) => h.status === "healthy",
		).length;
		const totalChecks = metrics.healthCheckResults.length;
		console.log(
			`   Health Status: ${healthyChecks}/${totalChecks} healthy checks`,
		);
	}

	private generateReport(results: Record<string, TestMetrics>): void {
		this.printReportHeader();
		this.printSummaryTable(results);
		this.printSystemBehaviorAnalysis(results);
		this.printHealthMonitoring(results);
		this.printRecommendations(results);
		this.printReportFooter();
	}

	private printReportHeader(): void {
		console.log(`\n${"=".repeat(80)}`);
		console.log("📊 LOAD TEST COMPREHENSIVE REPORT");
		console.log("=".repeat(80));
	}

	private printSummaryTable(results: Record<string, TestMetrics>): void {
		console.log("\n📋 Test Summary:");
		console.log(
			"Scenario".padEnd(20) +
				"Requests".padEnd(12) +
				"Success%".padEnd(12) +
				"RateLimit".padEnd(12) +
				"CircuitBreaker".padEnd(15) +
				"AvgTime(ms)",
		);
		console.log("-".repeat(83));

		for (const [scenario, metrics] of Object.entries(results)) {
			const successRate = (
				(metrics.successfulRequests / metrics.totalRequests) *
				100
			).toFixed(1);
			console.log(
				scenario.padEnd(20) +
					metrics.totalRequests.toString().padEnd(12) +
					`${successRate}%`.padEnd(12) +
					metrics.rateLimitedRequests.toString().padEnd(12) +
					metrics.circuitBreakerTriggered.toString().padEnd(15) +
					metrics.averageResponseTime.toFixed(1),
			);
		}
	}

	private printSystemBehaviorAnalysis(
		results: Record<string, TestMetrics>,
	): void {
		console.log("\n🔍 System Behavior Analysis:");

		this.analyzeRateLimiting(results);
		this.analyzeCircuitBreakers(results);
		this.analyzePerformanceDegradation(results);
	}

	private analyzeRateLimiting(results: Record<string, TestMetrics>): void {
		const rateLimitScenario = results.rateLimitTest;
		if (rateLimitScenario) {
			const rateLimitEffectiveness =
				(rateLimitScenario.rateLimitedRequests /
					rateLimitScenario.totalRequests) *
				100;
			console.log(
				`   Rate Limiting: ${rateLimitEffectiveness.toFixed(1)}% of requests rate limited`,
			);
			console.log(
				`   ${rateLimitEffectiveness > 10 ? "✅" : "⚠️"} Rate limiting ${rateLimitEffectiveness > 10 ? "working effectively" : "may need tuning"}`,
			);
		}
	}

	private analyzeCircuitBreakers(results: Record<string, TestMetrics>): void {
		const circuitBreakerScenario = results.circuitBreakerTest;
		if (circuitBreakerScenario) {
			console.log(
				`   Circuit Breakers: ${circuitBreakerScenario.circuitBreakerTriggered} triggers detected`,
			);
			console.log(
				`   ${circuitBreakerScenario.circuitBreakerTriggered > 0 ? "✅" : "⚠️"} Circuit breakers ${circuitBreakerScenario.circuitBreakerTriggered > 0 ? "activated under stress" : "may need adjustment"}`,
			);
		}
	}

	private analyzePerformanceDegradation(
		results: Record<string, TestMetrics>,
	): void {
		const normalMetrics = results.normal;
		const extremeMetrics = results.extreme;
		if (normalMetrics && extremeMetrics) {
			const degradationRatio =
				extremeMetrics.averageResponseTime / normalMetrics.averageResponseTime;
			console.log(
				`   Performance Degradation: ${degradationRatio.toFixed(2)}x slower under extreme load`,
			);
			console.log(
				`   ${degradationRatio < 5 ? "✅" : "⚠️"} Performance ${degradationRatio < 5 ? "acceptable" : "concerning"} under high load`,
			);
		}
	}

	private printHealthMonitoring(results: Record<string, TestMetrics>): void {
		const totalHealthChecks = Object.values(results).reduce(
			(sum, metrics) => sum + metrics.healthCheckResults.length,
			0,
		);
		const healthyHealthChecks = Object.values(results).reduce(
			(sum, metrics) =>
				sum +
				metrics.healthCheckResults.filter((h) => h.status === "healthy").length,
			0,
		);
		const healthMonitoringReliability =
			(healthyHealthChecks / totalHealthChecks) * 100;
		console.log(
			`   Health Monitoring: ${healthMonitoringReliability.toFixed(1)}% healthy status during tests`,
		);
	}

	private printRecommendations(results: Record<string, TestMetrics>): void {
		console.log("\n🎯 Recommendations:");
		this.generateRecommendations(results);
	}

	private printReportFooter(): void {
		console.log("\n✅ Load testing completed successfully!");
		console.log("📁 Detailed results available in test metrics objects");
	}

	private generateRecommendations(results: Record<string, TestMetrics>): void {
		const recommendations: string[] = [];

		// Analyze rate limiting
		const rateLimitScenario = results.rateLimitTest;
		if (rateLimitScenario) {
			const rateLimitRate =
				(rateLimitScenario.rateLimitedRequests /
					rateLimitScenario.totalRequests) *
				100;
			if (rateLimitRate < 5) {
				recommendations.push(
					"Consider lowering rate limits for better protection",
				);
			} else if (rateLimitRate > 50) {
				recommendations.push(
					"Rate limits may be too restrictive for normal usage",
				);
			}
		}

		// Analyze circuit breakers
		const circuitBreakerScenario = results.circuitBreakerTest;
		if (
			circuitBreakerScenario &&
			circuitBreakerScenario.circuitBreakerTriggered === 0
		) {
			recommendations.push("Circuit breaker thresholds may need to be lowered");
		}

		// Analyze performance
		const extremeScenario = results.extreme;
		if (extremeScenario && extremeScenario.averageResponseTime > 5000) {
			recommendations.push(
				"Consider implementing additional performance optimizations",
			);
		}

		// Analyze queue performance
		const queueIssues = Object.values(results).some((metrics) =>
			metrics.healthCheckResults.some(
				(h) =>
					h.components.queue.queuedItems && h.components.queue.queuedItems > 50,
			),
		);
		if (queueIssues) {
			recommendations.push("Connection queue may need capacity increases");
		}

		if (recommendations.length === 0) {
			recommendations.push("System performing well under all test scenarios");
		}

		recommendations.forEach((rec, index) => {
			console.log(`   ${index + 1}. ${rec}`);
		});
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// CLI interface
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];

	const runner = new LoadTestRunner();

	switch (command) {
		case "all":
			await runner.runAllTests();
			break;

		case "scenario": {
			const scenarioName = args[1] as keyof typeof SCENARIOS;
			if (!scenarioName || !(scenarioName in SCENARIOS)) {
				console.error(
					"❌ Invalid scenario. Available scenarios:",
					Object.keys(SCENARIOS).join(", "),
				);
				process.exit(1);
			}
			const tester = new LoadTester();
			const results = await tester.runScenario(scenarioName);
			console.log("\n📊 Results:", JSON.stringify(results, null, 2));
			break;
		}

		case "simulate": {
			const simulationType = args[1];
			const simulator = new DatabaseFailureSimulator();
			if (simulationType === "load") {
				await simulator.simulateHighLoad();
			} else if (simulationType === "failure") {
				await simulator.simulateConnectionFailure();
			} else {
				console.error("❌ Invalid simulation type. Use 'load' or 'failure'");
				process.exit(1);
			}
			break;
		}

		default:
			console.log("🎯 VetMed Tracker Load Testing Tool");
			console.log("");
			console.log("Usage:");
			console.log(
				"  pnpm tsx scripts/load-test.ts all                    - Run all test scenarios",
			);
			console.log(
				"  pnpm tsx scripts/load-test.ts scenario <name>        - Run specific scenario",
			);
			console.log(
				"  pnpm tsx scripts/load-test.ts simulate <type>        - Run failure simulation",
			);
			console.log("");
			console.log("Available scenarios:", Object.keys(SCENARIOS).join(", "));
			console.log("Simulation types: load, failure");
			process.exit(1);
	}
}

// Error handling
process.on("uncaughtException", (error) => {
	console.error("❌ Uncaught exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error("❌ Unhandled rejection:", reason);
	process.exit(1);
});

// Run the CLI
if (require.main === module) {
	main().catch((error) => {
		console.error("❌ Load test failed:", error);
		process.exit(1);
	});
}

export { LoadTester, DatabaseFailureSimulator, LoadTestRunner, SCENARIOS };
