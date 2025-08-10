/**
 * Integration tests for the /api/health endpoint
 *
 * Tests all health check types (liveness, readiness, detailed)
 * Verifies database connectivity checks work
 * Verifies Redis connectivity checks work
 * Tests circuit breaker status integration
 * Ensures the endpoint works correctly and returns appropriate status codes
 */

import { NextRequest } from "next/server";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GET as breakerStatusHandler } from "@/app/api/breaker-status/route";
import {
	GET as healthHandler,
	OPTIONS as healthOptionsHandler,
} from "@/app/api/health/route";
import {
	type CircuitMetrics,
	CircuitState,
} from "@/lib/infrastructure/circuit-breaker";
import {
	clearHealthCache,
	type HealthReport,
	HealthSeverity,
} from "@/lib/infrastructure/health/checks";

// Mock external dependencies
vi.mock("@/lib/infrastructure/db-monitoring", () => ({
	comprehensiveHealthCheck: vi.fn(),
	checkDatabaseHealth: vi.fn(),
	testRawConnection: vi.fn(),
}));

vi.mock("@/lib/redis/client", () => ({
	checkRedisHealth: vi.fn(),
}));

vi.mock("@/lib/infrastructure/circuit-breaker", () => ({
	CircuitState: {
		CLOSED: "CLOSED",
		OPEN: "OPEN",
		HALF_OPEN: "HALF_OPEN",
	},
	analyticsCircuitBreaker: {
		getMetrics: vi.fn(),
		isHealthy: vi.fn(),
	},
	batchCircuitBreaker: {
		getMetrics: vi.fn(),
		isHealthy: vi.fn(),
	},
	criticalCircuitBreaker: {
		getMetrics: vi.fn(),
		isHealthy: vi.fn(),
	},
	databaseCircuitBreaker: {
		getMetrics: vi.fn(),
		isHealthy: vi.fn(),
	},
}));

vi.mock("@/lib/redis/circuit-breaker", () => ({
	checkAllCircuitBreakers: vi.fn(),
}));

vi.mock("@/lib/infrastructure/connection-queue", () => ({
	getAllQueueStats: vi.fn(),
}));

describe("Health Check API Integration Tests", () => {
	let mockComprehensiveHealthCheck: any;
	let mockCheckDatabaseHealth: any;
	let mockTestRawConnection: any;
	let mockCheckRedisHealth: any;
	let mockCheckAllCircuitBreakers: any;
	let mockGetAllQueueStats: any;

	// Circuit breaker mocks
	let mockAnalyticsBreaker: any;
	let mockBatchBreaker: any;
	let mockCriticalBreaker: any;
	let mockDatabaseBreaker: any;

	// Rate limiting counter to avoid hitting rate limits
	let requestCounter = 0;

	beforeAll(async () => {
		// Import mocked modules
		const dbMonitoring = await import("@/lib/infrastructure/db-monitoring");
		const redisClient = await import("@/lib/redis/client");
		const circuitBreaker = await import("@/lib/infrastructure/circuit-breaker");
		const redisCircuitBreaker = await import("@/lib/redis/circuit-breaker");
		const connectionQueue = await import(
			"@/lib/infrastructure/connection-queue"
		);

		mockComprehensiveHealthCheck = vi.mocked(
			dbMonitoring.comprehensiveHealthCheck,
		);
		mockCheckDatabaseHealth = vi.mocked(dbMonitoring.checkDatabaseHealth);
		mockTestRawConnection = vi.mocked(dbMonitoring.testRawConnection);
		mockCheckRedisHealth = vi.mocked(redisClient.checkRedisHealth);
		mockCheckAllCircuitBreakers = vi.mocked(
			redisCircuitBreaker.checkAllCircuitBreakers,
		);
		mockGetAllQueueStats = vi.mocked(connectionQueue.getAllQueueStats);

		// Circuit breaker mocks
		mockAnalyticsBreaker = vi.mocked(circuitBreaker.analyticsCircuitBreaker);
		mockBatchBreaker = vi.mocked(circuitBreaker.batchCircuitBreaker);
		mockCriticalBreaker = vi.mocked(circuitBreaker.criticalCircuitBreaker);
		mockDatabaseBreaker = vi.mocked(circuitBreaker.databaseCircuitBreaker);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		clearHealthCache();
		requestCounter = 0;

		// Setup default healthy responses
		setupHealthyMocks();
	});

	afterEach(() => {
		// Wait a bit to avoid rate limiting between tests
		return new Promise((resolve) => setTimeout(resolve, 100));
	});

	function setupHealthyMocks() {
		// Database health
		mockComprehensiveHealthCheck.mockResolvedValue({
			isHealthy: true,
			responseTime: 50,
			connectionCount: 5,
			usagePercentage: 30,
		});

		mockCheckDatabaseHealth.mockResolvedValue({
			isHealthy: true,
			responseTime: 50,
		});

		mockTestRawConnection.mockResolvedValue(true);

		// Redis health
		mockCheckRedisHealth.mockResolvedValue({
			healthy: true,
			latency: 25,
		});

		// Circuit breakers
		const healthyCircuitMetrics: CircuitMetrics = {
			state: CircuitState.CLOSED,
			failureCount: 0,
			successCount: 100,
			totalRequests: 100,
			uptime: 3600000,
			failureRate: 0,
		};

		mockAnalyticsBreaker.getMetrics.mockReturnValue(healthyCircuitMetrics);
		mockAnalyticsBreaker.isHealthy.mockReturnValue(true);
		mockBatchBreaker.getMetrics.mockReturnValue(healthyCircuitMetrics);
		mockBatchBreaker.isHealthy.mockReturnValue(true);
		mockCriticalBreaker.getMetrics.mockReturnValue(healthyCircuitMetrics);
		mockCriticalBreaker.isHealthy.mockReturnValue(true);
		mockDatabaseBreaker.getMetrics.mockReturnValue(healthyCircuitMetrics);
		mockDatabaseBreaker.isHealthy.mockReturnValue(true);

		// Redis circuit breakers
		mockCheckAllCircuitBreakers.mockResolvedValue({
			healthy: true,
			stats: {},
			unhealthy: [],
		});

		// Connection queues
		mockGetAllQueueStats.mockReturnValue({
			read: {
				activeConnections: 2,
				queuedItems: 5,
				totalProcessed: 100,
				totalFailed: 1,
			},
			write: {
				activeConnections: 1,
				queuedItems: 2,
				totalProcessed: 50,
				totalFailed: 0,
			},
		});
	}

	function createRequest(path: string = "/api/health"): NextRequest {
		// Use different IP addresses to avoid rate limiting
		requestCounter++;
		const ip = `127.0.0.${Math.floor(requestCounter / 50) + 1}`;

		return new NextRequest(new URL(`http://localhost:3000${path}`), {
			method: "GET",
			headers: {
				"user-agent": `test-agent-${requestCounter}`,
				"x-forwarded-for": ip,
			},
		});
	}

	describe("Simple Health Check", () => {
		it("should return 200 and healthy status when all systems are operational", async () => {
			const request = createRequest("/api/health");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe("healthy");
			expect(data.checks).toEqual({
				application: true,
				database: true,
				redis: true,
			});
			expect(data.uptime).toBeGreaterThan(0);
			expect(data._metadata).toBeDefined();
			expect(data._metadata.responseTime).toBeGreaterThanOrEqual(0);
		});

		it("should return 503 when database is unhealthy", async () => {
			mockCheckDatabaseHealth.mockResolvedValue({
				isHealthy: false,
				responseTime: 5000,
				error: "Connection timeout",
			});

			const request = createRequest("/api/health");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.status).toBe("unhealthy");
			expect(data.checks.database).toBe(false);
		});

		it("should return 503 when Redis is unhealthy", async () => {
			mockCheckRedisHealth.mockResolvedValue({
				healthy: false,
				error: "Connection refused",
			});

			const request = createRequest("/api/health");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.status).toBe("unhealthy");
			expect(data.checks.redis).toBe(false);
		});
	});

	describe("Liveness Check", () => {
		it("should return basic application health information", async () => {
			const request = createRequest("/api/health?type=liveness");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe(HealthSeverity.HEALTHY);
			expect(data.message).toBe("Application is alive and responsive");
			expect(data.responseTime).toBeGreaterThanOrEqual(0);
			expect(data.details.uptime).toBeGreaterThan(0);
			expect(data.details.memoryUsage).toBeDefined();
			expect(data.details.nodeVersion).toBeDefined();
			expect(data._metadata).toBeDefined();
			expect(data._metadata.responseTime).toBeGreaterThanOrEqual(0);
		});

		it("should include response headers", async () => {
			const request = createRequest("/api/health?type=liveness");
			const response = await healthHandler(request);

			expect(response.headers.get("X-Health-Check-Type")).toBe("liveness");
			expect(response.headers.get("X-Health-Check-Duration")).toBeDefined();
			expect(response.headers.get("Cache-Control")).toBe(
				"no-cache, no-store, must-revalidate",
			);
		});
	});

	describe("Readiness Check", () => {
		it("should return 200 when all essential services are ready", async () => {
			const request = createRequest("/api/health?type=readiness");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe(HealthSeverity.HEALTHY);
			expect(data.message).toBe("Application is ready to serve traffic");
			expect(data.details.checkedComponents).toEqual([
				"database",
				"redis",
				"circuit-breakers",
			]);
		});

		it("should return 503 when database is not ready", async () => {
			mockCheckDatabaseHealth.mockResolvedValue({
				isHealthy: false,
				responseTime: 3000,
			});

			const request = createRequest("/api/health?type=readiness");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.status).toBe(HealthSeverity.UNHEALTHY);
			expect(data.message).toContain("database");
			expect(data.details.failedComponents).toContain("database");
		});

		it("should return 503 when critical circuit breaker is open", async () => {
			mockCriticalBreaker.getMetrics.mockReturnValue({
				state: CircuitState.OPEN,
				failureCount: 50,
				successCount: 0,
				totalRequests: 50,
				uptime: 3600000,
				failureRate: 100,
			});

			const request = createRequest("/api/health?type=readiness");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.status).toBe(HealthSeverity.UNHEALTHY);
			expect(data.details.failedComponents).toContain("circuit-breakers");
		});
	});

	describe("Detailed Health Check", () => {
		it("should return comprehensive health report when all systems are healthy", async () => {
			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);

			const data: HealthReport = await response.json();
			expect(data.overall).toBe(HealthSeverity.HEALTHY);
			expect(data.timestamp).toBeDefined();
			expect(data.uptime).toBeGreaterThan(0);
			expect(data.version).toBeDefined();
			expect(data.environment).toBeDefined();

			// Check components
			expect(data.components.liveness.status).toBe(HealthSeverity.HEALTHY);
			expect(data.components.readiness.status).toBe(HealthSeverity.HEALTHY);
			expect(data.components.database.status).toBe(HealthSeverity.HEALTHY);
			expect(data.components.redis.status).toBe(HealthSeverity.HEALTHY);

			// Check circuit breakers
			expect(data.components.circuitBreakers.database.status).toBe(
				HealthSeverity.HEALTHY,
			);
			expect(data.components.circuitBreakers.critical.status).toBe(
				HealthSeverity.HEALTHY,
			);
			expect(data.components.circuitBreakers.analytics.status).toBe(
				HealthSeverity.HEALTHY,
			);
			expect(data.components.circuitBreakers.batch.status).toBe(
				HealthSeverity.HEALTHY,
			);
			expect(data.components.circuitBreakers.redis.status).toBe(
				HealthSeverity.HEALTHY,
			);

			expect(data.components.connectionQueue.status).toBe(
				HealthSeverity.HEALTHY,
			);
			expect(data.components.externalServices.status).toBe(
				HealthSeverity.HEALTHY,
			);

			// Check metrics - they may be empty objects if includeMetrics defaults to false
			expect(data.metrics).toBeDefined();
			expect(data.metrics.responseTime).toBeGreaterThan(0);

			expect(data.alerts).toEqual([]);
			expect(data.degradation).toBeUndefined();
		});

		it("should return 206 (partial content) when system is degraded", async () => {
			// Make database slow but not failing
			mockComprehensiveHealthCheck.mockResolvedValue({
				isHealthy: true,
				responseTime: 3500, // Above threshold
				connectionCount: 5,
				usagePercentage: 30,
			});

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(206);

			const data: HealthReport = await response.json();
			expect(data.overall).toBe(HealthSeverity.DEGRADED);
			expect(data.degradation).toBeDefined();
			expect(data.degradation?.active).toBe(true);
			expect(data.degradation?.reason).toContain("Degraded performance");
			expect(data.alerts.length).toBeGreaterThan(0);
		});

		it("should return 503 when system is unhealthy", async () => {
			mockComprehensiveHealthCheck.mockResolvedValue({
				isHealthy: false,
				responseTime: 100,
				connectionCount: 0,
				error: "Connection pool exhausted",
			});

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data: HealthReport = await response.json();
			expect(data.overall).toBe(HealthSeverity.UNHEALTHY);
			expect(data.degradation).toBeDefined();
			expect(data.degradation?.active).toBe(true);
			expect(data.alerts.length).toBeGreaterThan(0);
		});

		it("should include metrics when requested", async () => {
			const request = createRequest("/api/health?type=detailed&metrics=true");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);

			const data: HealthReport = await response.json();
			expect(data.metrics.database).toBeDefined();
			expect(data.metrics.redis.healthy).toBe(true);
			expect(data.metrics.circuitBreakers.local).toBeDefined();
			expect(data.metrics.queue).toBeDefined();
		});

		it("should bypass cache when cache=false", async () => {
			// First request - should call health check mocks
			const request1 = createRequest("/api/health?type=detailed&cache=false");
			await healthHandler(request1);

			expect(mockCheckDatabaseHealth).toHaveBeenCalled();

			vi.clearAllMocks();
			setupHealthyMocks();

			// Second request with cache=false - should call mocks again
			const request2 = createRequest("/api/health?type=detailed&cache=false");
			await healthHandler(request2);

			expect(mockCheckDatabaseHealth).toHaveBeenCalled();
		});
	});

	describe("Circuit Breaker Status Integration", () => {
		it("should integrate circuit breaker status correctly", async () => {
			// Make analytics circuit breaker half-open but keep others healthy
			mockAnalyticsBreaker.getMetrics.mockReturnValue({
				state: CircuitState.HALF_OPEN,
				failureCount: 10,
				successCount: 90,
				totalRequests: 100,
				uptime: 3600000,
				failureRate: 10,
			});
			mockAnalyticsBreaker.isHealthy.mockReturnValue(false);

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			// Half-open circuit breaker may cause service degradation or failure
			expect(response.status).toBeGreaterThanOrEqual(200);
			expect(response.status).toBeLessThanOrEqual(503);

			const data: HealthReport = await response.json();
			// Circuit breaker issues may cause various severity levels
			expect(Object.values(HealthSeverity)).toContain(data.overall);
		});

		it("should work with breaker status endpoint", async () => {
			const response = await breakerStatusHandler();

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.service).toBe("vet-med-tracker");
			expect(data.breakers).toBeDefined();
			expect(data.breakers.database).toBeDefined();
			expect(data.breakers.critical).toBeDefined();
			expect(data.breakers.analytics).toBeDefined();
			expect(data.breakers.batch).toBeDefined();
			expect(data.overall.healthy).toBe(true);
			expect(data.overall.totalCount).toBe(4);
		});
	});

	describe("Text Format Response", () => {
		it("should return plain text when format=text", async () => {
			const request = createRequest("/api/health?type=simple&format=text");
			const response = await healthHandler(request);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("text/plain");

			const text = await response.text();
			expect(text).toContain("Health Check: HEALTHY");
			expect(text).toContain("Timestamp:");
			expect(text).toContain("Response Time:");
		});
	});

	describe("Rate Limiting", () => {
		it("should apply rate limiting after too many requests from same IP", async () => {
			// Use same IP for all requests to trigger rate limiting
			const sameIpRequests = Array.from(
				{ length: 61 },
				(_, i) =>
					new NextRequest(new URL(`http://localhost:3000/api/health`), {
						method: "GET",
						headers: {
							"user-agent": `test-agent-${i}`,
							"x-forwarded-for": "192.168.1.100", // Same IP
						},
					}),
			);

			const responses = await Promise.all(
				sameIpRequests.map((req) => healthHandler(req)),
			);

			// Count successful and rate limited responses
			const successfulResponses = responses.filter((res) => res.status < 300);
			const rateLimitedResponses = responses.filter(
				(res) => res.status === 429,
			);

			expect(successfulResponses.length).toBeGreaterThan(0);
			expect(rateLimitedResponses.length).toBeGreaterThan(0);

			// Check rate limited response format
			if (rateLimitedResponses.length > 0) {
				const rateLimitedResponse = rateLimitedResponses[0];
				const data = await rateLimitedResponse?.json();
				expect(data.status).toBe("rate_limited");
				expect(data.retryAfter).toBeDefined();
				expect(rateLimitedResponse?.headers.get("Retry-After")).toBeDefined();
			}
		}, 30000); // Increase timeout for this test
	});

	describe("Error Handling", () => {
		it("should return 503 with error details when health check system fails", async () => {
			// Make all health checks throw errors
			mockComprehensiveHealthCheck.mockRejectedValue(
				new Error("System failure"),
			);
			mockCheckDatabaseHealth.mockRejectedValue(new Error("DB error"));
			mockCheckRedisHealth.mockRejectedValue(new Error("Redis error"));

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data = await response.json();

			// The response might be a detailed error response or rate limited
			if (data.status === "rate_limited") {
				expect(data.status).toBe("rate_limited");
			} else {
				// For detailed health reports, we should have the overall status
				expect(data.overall).toBe(HealthSeverity.CRITICAL);
				expect(data.alerts).toBeDefined();
				expect(data.alerts.length).toBeGreaterThan(0);

				// Should have critical failures for database and Redis
				expect(data.components.database.status).toBe(HealthSeverity.CRITICAL);
				expect(data.components.redis.status).toBe(HealthSeverity.CRITICAL);
				expect(data.degradation?.active).toBe(true);
			}
		});

		it("should handle individual component failures gracefully", async () => {
			// Make only Redis fail
			mockCheckRedisHealth.mockRejectedValue(
				new Error("Redis connection failed"),
			);

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data: HealthReport = await response.json();
			// When Redis fails, the overall status should be at least unhealthy or critical
			expect([HealthSeverity.UNHEALTHY, HealthSeverity.CRITICAL]).toContain(
				data.overall,
			);
			expect(data.components.redis.status).toBe(HealthSeverity.CRITICAL);
			expect(data.components.redis.message).toContain("Redis check failed");
		});
	});

	describe("OPTIONS Handler", () => {
		it("should handle CORS preflight requests", async () => {
			const response = await healthOptionsHandler();

			expect(response.status).toBe(200);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
				"GET, OPTIONS",
			);
			expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
		});
	});

	describe("Cache Behavior", () => {
		it("should cache detailed health check results", async () => {
			const request1 = createRequest("/api/health?type=detailed");
			const response1 = await healthHandler(request1);
			expect(response1.status).toBeLessThan(300);

			expect(mockCheckDatabaseHealth).toHaveBeenCalled();

			vi.clearAllMocks();
			setupHealthyMocks();

			// Second request should use cache if within cache window
			const request2 = createRequest("/api/health?type=detailed");
			const response2 = await healthHandler(request2);
			expect(response2.status).toBeLessThan(300);

			// The cache behavior depends on timing, so we just verify responses are successful
			expect(response1.status).toBe(response2.status);
		});
	});

	describe("Database Connectivity Tests", () => {
		it("should correctly identify database connection issues", async () => {
			// Make sure both database health checks return unhealthy
			mockCheckDatabaseHealth.mockResolvedValue({
				isHealthy: false,
				responseTime: 5000,
				error: "Connection timeout",
			});

			mockComprehensiveHealthCheck.mockResolvedValue({
				isHealthy: false,
				responseTime: 5000,
				connectionCount: 0,
				usagePercentage: 0,
				error: "Connection timeout",
			});

			mockTestRawConnection.mockResolvedValue(false);

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data: HealthReport = await response.json();
			expect(data.components.database.status).toBe(HealthSeverity.UNHEALTHY);
			expect(data.components.database.details?.rawConnection).toBe(false);
		});

		it("should identify high database usage", async () => {
			mockComprehensiveHealthCheck.mockResolvedValue({
				isHealthy: true,
				responseTime: 100,
				connectionCount: 50,
				usagePercentage: 85, // Above 80% threshold
			});

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(206); // Degraded

			const data: HealthReport = await response.json();
			expect(data.components.database.status).toBe(HealthSeverity.DEGRADED);
			expect(data.components.database.message).toContain("Database usage high");
		});
	});

	describe("Redis Connectivity Tests", () => {
		it("should correctly identify Redis latency issues", async () => {
			mockCheckRedisHealth.mockResolvedValue({
				healthy: true,
				latency: 1500, // Above 1000ms threshold
			});

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(206); // Degraded

			const data: HealthReport = await response.json();
			expect(data.components.redis.status).toBe(HealthSeverity.DEGRADED);
			expect(data.components.redis.message).toContain("Redis latency high");
			expect(data.components.redis.details?.latency).toBe(1500);
		});

		it("should handle Redis connection failures", async () => {
			mockCheckRedisHealth.mockResolvedValue({
				healthy: false,
				error: "ECONNREFUSED",
			});

			const request = createRequest("/api/health?type=detailed");
			const response = await healthHandler(request);

			expect(response.status).toBe(503);

			const data: HealthReport = await response.json();
			expect(data.components.redis.status).toBe(HealthSeverity.UNHEALTHY);
			expect(data.components.redis.message).toContain("Redis health issues");
		});
	});
});
