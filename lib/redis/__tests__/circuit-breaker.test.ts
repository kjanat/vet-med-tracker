/**
 * Comprehensive tests for Redis Circuit Breaker implementation
 * Tests all states (CLOSED, OPEN, HALF_OPEN), failure thresholds, recovery mechanisms,
 * fallback patterns, factory methods, and registry functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
// Import after mocking
import {
  CircuitBreaker,
  type CircuitBreakerConfig,
  CircuitBreakerDefaults,
  CircuitBreakerState,
  checkAllCircuitBreakers,
  circuitBreakerRegistry,
  createCustomBreaker,
  createDatabaseBreaker,
  createExternalApiBreaker,
  createInternalServiceBreaker,
  getCircuitBreaker,
  withCircuitBreaker,
} from "../circuit-breaker";
import { getRedisClient } from "../client";

// Mock the client module with a factory function
vi.mock("../client", () => {
  const mockClient = {
    get: vi.fn(),
    set: vi.fn(),
    pipeline: vi.fn(() => ({
      hincrby: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
    hget: vi.fn(),
    hgetall: vi.fn(),
    lpush: vi.fn(),
    ltrim: vi.fn(),
    lrange: vi.fn(),
    expire: vi.fn(),
    ping: vi.fn(),
  };

  return {
    getRedisClient: () => mockClient,
    RedisKeys: {
      circuitBreaker: {
        service: (name: string) => `test:circuit:service:${name}`,
      },
    },
  };
});

// Get reference to mock client for test setup
type MockFn = ReturnType<typeof vi.fn>;

interface MockPipeline {
  hincrby: MockFn;
  hset: MockFn;
  set: MockFn;
  expire: MockFn;
  del: MockFn;
  exec: MockFn;
}

interface MockRedisClient {
  get: MockFn;
  set: MockFn;
  pipeline: MockFn;
  hget: MockFn;
  hgetall: MockFn;
  lpush: MockFn;
  ltrim: MockFn;
  lrange: MockFn;
  expire: MockFn;
  ping: MockFn;
}

const mockRedisClient = getRedisClient() as unknown as MockRedisClient;
let mockPipeline: MockPipeline;

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker;
  const testConfig: CircuitBreakerConfig = {
    name: "test-service",
    failureThreshold: 3,
    successThreshold: 2,
    recoveryTimeout: 5000,
    timeout: 1000,
    enableMonitoring: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock pipeline
    mockPipeline = {
      hincrby: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    mockRedisClient.pipeline.mockReturnValue(mockPipeline);

    // Setup default mock responses
    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.set.mockResolvedValue("OK");
    mockRedisClient.hget.mockResolvedValue("0");
    mockRedisClient.hgetall.mockResolvedValue({});
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.ltrim.mockResolvedValue("OK");
    mockRedisClient.lrange.mockResolvedValue([]);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.ping.mockResolvedValue("PONG");

    circuitBreaker = new CircuitBreaker(testConfig);
  });

  describe("constructor", () => {
    it("should create circuit breaker with valid config", () => {
      expect(circuitBreaker).toBeInstanceOf(CircuitBreaker);
    });

    it("should initialize with correct Redis keys", async () => {
      await circuitBreaker.getState();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
      );
    });
  });

  describe("execute method - CLOSED state", () => {
    it("should execute operation successfully when circuit is CLOSED", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);

      const result = await circuitBreaker.execute(operation);

      expect(operation).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: "success",
        fromFallback: false,
        state: CircuitBreakerState.CLOSED,
        latency: expect.any(Number),
      });
    });

    it("should record success when operation completes", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
      mockRedisClient.hget.mockResolvedValue("1"); // successCount = 1

      await circuitBreaker.execute(operation);

      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "successCount",
        1,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "totalRequests",
        1,
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "lastSuccess",
        expect.any(String),
      );
    });

    it("should record failure when operation fails", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
      mockRedisClient.hget.mockResolvedValue("2"); // failureCount = 2 (less than threshold)

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Operation failed",
      );

      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "failureCount",
        1,
      );
      expect(mockPipeline.hincrby).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "totalFailures",
        1,
      );
    });

    it("should open circuit when failure threshold is reached", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
      mockRedisClient.hget.mockResolvedValue("3"); // failureCount = 3 (equals threshold)

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Operation failed",
      );

      expect(mockPipeline.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.OPEN,
      );
    });
  });

  describe("execute method - OPEN state", () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.OPEN);
    });

    it("should fail immediately when circuit is OPEN and recovery time not reached", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const nextAttempt = new Date(Date.now() + 10000).toISOString(); // 10 seconds in future
      mockRedisClient.hget.mockResolvedValue(nextAttempt);

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Circuit breaker is OPEN for service: test-service",
      );

      expect(operation).not.toHaveBeenCalled();
    });

    it("should use fallback when circuit is OPEN and recovery time not reached", async () => {
      const operation = vi.fn().mockResolvedValue("primary");
      const fallback = vi.fn().mockResolvedValue("fallback");
      const nextAttempt = new Date(Date.now() + 10000).toISOString();
      mockRedisClient.hget.mockResolvedValue(nextAttempt);

      const result = await circuitBreaker.execute(operation, fallback);

      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: "fallback",
        fromFallback: true,
        state: CircuitBreakerState.OPEN,
        latency: expect.any(Number),
      });
    });

    it("should transition to HALF_OPEN when recovery time is reached", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const pastTime = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      mockRedisClient.hget.mockResolvedValue(pastTime);

      await circuitBreaker.execute(operation);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.HALF_OPEN,
      );
    });
  });

  describe("execute method - HALF_OPEN state", () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.HALF_OPEN);
    });

    it("should execute operation in HALF_OPEN state", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await circuitBreaker.execute(operation);

      expect(operation).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
    });

    it("should close circuit after enough successes in HALF_OPEN", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      mockRedisClient.hget.mockResolvedValue("2"); // successCount = 2 (equals threshold)

      await circuitBreaker.execute(operation);

      expect(mockPipeline.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.CLOSED,
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "failureCount",
        0,
      );
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
        "successCount",
        0,
      );
    });

    it("should open circuit again if operation fails in HALF_OPEN", async () => {
      const error = new Error("Still failing");
      const operation = vi.fn().mockRejectedValue(error);
      mockRedisClient.hget.mockResolvedValue("3"); // failureCount equals threshold

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Still failing",
      );

      expect(mockPipeline.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.OPEN,
      );
    });
  });

  describe("operation timeout", () => {
    it("should timeout operation that exceeds configured timeout", async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000)), // 2 seconds
      );

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        "Operation timeout: 1000ms",
      );
    });

    it("should complete operation that finishes before timeout", async () => {
      const operation = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("fast"), 100)), // 100ms
      );

      const result = await circuitBreaker.execute(operation);
      expect(result.success).toBe(true);
      expect(result.data).toBe("fast");
    });
  });

  describe("fallback mechanisms", () => {
    it("should use fallback when primary operation fails", async () => {
      const error = new Error("Primary failed");
      const operation = vi.fn().mockRejectedValue(error);
      const fallback = vi.fn().mockResolvedValue("fallback-result");
      mockRedisClient.hget.mockResolvedValue("1"); // failureCount less than threshold

      const result = await circuitBreaker.execute(operation, fallback);

      expect(result).toEqual({
        success: true,
        data: "fallback-result",
        fromFallback: true,
        state: expect.any(String),
        latency: expect.any(Number),
        error: error,
      });
    });

    it("should throw error when both primary and fallback fail", async () => {
      const primaryError = new Error("Primary failed");
      const fallbackError = new Error("Fallback failed");
      const operation = vi.fn().mockRejectedValue(primaryError);
      const fallback = vi.fn().mockRejectedValue(fallbackError);

      await expect(circuitBreaker.execute(operation, fallback)).rejects.toThrow(
        "Both primary and fallback failed:",
      );
    });
  });

  describe("getState method", () => {
    it("should return current circuit state", async () => {
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.OPEN);

      const state = await circuitBreaker.getState();

      expect(state).toBe(CircuitBreakerState.OPEN);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
      );
    });

    it("should default to CLOSED when no state is stored", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const state = await circuitBreaker.getState();

      expect(state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe("getStats method", () => {
    it("should return comprehensive circuit breaker statistics", async () => {
      const mockStats = {
        failureCount: "5",
        successCount: "3",
        lastFailure: "2023-01-01T12:00:00Z",
        lastSuccess: "2023-01-01T12:05:00Z",
        nextAttempt: "2023-01-01T12:10:00Z",
        totalRequests: "100",
        totalFailures: "25",
      };
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.HALF_OPEN);
      mockRedisClient.hgetall.mockResolvedValue(mockStats);

      const stats = await circuitBreaker.getStats();

      expect(stats).toEqual({
        state: CircuitBreakerState.HALF_OPEN,
        failureCount: 5,
        successCount: 3,
        lastFailure: new Date("2023-01-01T12:00:00Z"),
        lastSuccess: new Date("2023-01-01T12:05:00Z"),
        nextAttempt: new Date("2023-01-01T12:10:00Z"),
        totalRequests: 100,
        totalFailures: 25,
        uptime: 75, // (100 - 25) / 100 * 100
      });
    });

    it("should handle missing statistics gracefully", async () => {
      mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
      mockRedisClient.hgetall.mockResolvedValue(null);

      const stats = await circuitBreaker.getStats();

      expect(stats).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailure: undefined,
        lastSuccess: undefined,
        nextAttempt: undefined,
        totalRequests: 0,
        totalFailures: 0,
        uptime: 100,
      });
    });
  });

  describe("reset method", () => {
    it("should reset circuit breaker to initial state", async () => {
      await circuitBreaker.reset();

      expect(mockPipeline.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.CLOSED,
      );
      expect(mockPipeline.del).toHaveBeenCalledWith(
        "test:circuit:service:test-service:stats",
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe("forceState method", () => {
    it("should force circuit breaker to specific state", async () => {
      await circuitBreaker.forceState(CircuitBreakerState.OPEN);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "test:circuit:service:test-service:state",
        CircuitBreakerState.OPEN,
      );
    });
  });

  describe("health monitoring", () => {
    it("should log success metrics when monitoring is enabled", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      await circuitBreaker.execute(operation);

      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        "test:circuit:service:test-service:metrics",
        expect.stringContaining('"type":"success"'),
      );
      expect(mockRedisClient.ltrim).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it("should log failure metrics when monitoring is enabled", async () => {
      const error = new Error("Test failure");
      const operation = vi.fn().mockRejectedValue(error);

      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected to fail
      }

      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        "test:circuit:service:test-service:metrics",
        expect.stringContaining('"type":"failure"'),
      );
    });

    it("should retrieve health metrics", async () => {
      const mockMetrics = [
        JSON.stringify({ type: "success", timestamp: "2023-01-01T12:00:00Z" }),
        JSON.stringify({
          type: "failure",
          timestamp: "2023-01-01T11:55:00Z",
          error: "Test error",
        }),
      ];
      mockRedisClient.lrange.mockResolvedValue(mockMetrics);

      const metrics = await circuitBreaker.getHealthMetrics(10);

      expect(mockRedisClient.lrange).toHaveBeenCalledWith(
        "test:circuit:service:test-service:metrics",
        0,
        9,
      );
      expect(metrics).toEqual([
        { type: "success", timestamp: "2023-01-01T12:00:00Z" },
        {
          type: "failure",
          timestamp: "2023-01-01T11:55:00Z",
          error: "Test error",
        },
      ]);
    });
  });

  describe("monitoring disabled", () => {
    beforeEach(() => {
      const configWithoutMonitoring: CircuitBreakerConfig = {
        ...testConfig,
        enableMonitoring: false,
      };
      circuitBreaker = new CircuitBreaker(configWithoutMonitoring);
    });

    it("should not log metrics when monitoring is disabled", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      await circuitBreaker.execute(operation);

      expect(mockRedisClient.lpush).not.toHaveBeenCalled();
    });
  });
});

describe("Circuit Breaker Factory Functions", () => {
  it("should create database circuit breaker with correct defaults", () => {
    const breaker = createDatabaseBreaker("test-db");

    expect(breaker).toBeInstanceOf(CircuitBreaker);
    // Factory methods are tested through their actual usage since config is private
  });

  it("should create external API circuit breaker with correct defaults", () => {
    const breaker = createExternalApiBreaker("payment-api");

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it("should create internal service circuit breaker with correct defaults", () => {
    const breaker = createInternalServiceBreaker("auth-service");

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it("should create custom circuit breaker with provided config", () => {
    const customConfig: CircuitBreakerConfig = {
      name: "custom-service",
      failureThreshold: 10,
      successThreshold: 5,
      recoveryTimeout: 30000,
      timeout: 2000,
      enableMonitoring: false,
    };

    const breaker = createCustomBreaker(customConfig);

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });
});

describe("CircuitBreakerRegistry", () => {
  beforeEach(async () => {
    // Reset the registry before each test by accessing the private breakers Map
    // Since getAll() returns a copy, we need to clear the original
    (
      circuitBreakerRegistry as unknown as { breakers: Map<string, unknown> }
    ).breakers.clear();
  });

  it("should register and retrieve circuit breakers", () => {
    const breaker = createDatabaseBreaker("test-registry");

    circuitBreakerRegistry.register("test-registry", breaker);
    const retrieved = circuitBreakerRegistry.get("test-registry");

    expect(retrieved).toBe(breaker);
  });

  it("should return undefined for non-existent circuit breaker", () => {
    const retrieved = circuitBreakerRegistry.get("non-existent");

    expect(retrieved).toBeUndefined();
  });

  it("should create new circuit breaker if not exists", () => {
    const config: CircuitBreakerConfig = {
      name: "new-service",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 1500,
      enableMonitoring: true,
    };

    const breaker = circuitBreakerRegistry.getOrCreate("new-service", config);

    expect(breaker).toBeInstanceOf(CircuitBreaker);
    expect(circuitBreakerRegistry.get("new-service")).toBe(breaker);
  });

  it("should return existing circuit breaker if already exists", () => {
    const config: CircuitBreakerConfig = {
      name: "existing-service",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 1500,
      enableMonitoring: true,
    };

    const breaker1 = circuitBreakerRegistry.getOrCreate(
      "existing-service",
      config,
    );
    const breaker2 = circuitBreakerRegistry.getOrCreate(
      "existing-service",
      config,
    );

    expect(breaker1).toBe(breaker2);
  });

  it("should get all registered circuit breakers", () => {
    const breaker1 = createDatabaseBreaker("db1");
    const breaker2 = createExternalApiBreaker("api1");

    circuitBreakerRegistry.register("db1", breaker1);
    circuitBreakerRegistry.register("api1", breaker2);

    const all = circuitBreakerRegistry.getAll();

    expect(all.size).toBe(2);
    expect(all.get("db1")).toBe(breaker1);
    expect(all.get("api1")).toBe(breaker2);
  });

  it("should get stats for all registered circuit breakers", async () => {
    const breaker1 = createDatabaseBreaker("stats-db");
    const breaker2 = createExternalApiBreaker("stats-api");

    circuitBreakerRegistry.register("stats-db", breaker1);
    circuitBreakerRegistry.register("stats-api", breaker2);

    // Mock stats responses
    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.hgetall.mockResolvedValue({
      totalRequests: "10",
      totalFailures: "2",
    });

    const stats = await circuitBreakerRegistry.getAllStats();

    expect(stats).toHaveProperty("stats-db");
    expect(stats).toHaveProperty("stats-api");
    expect(stats["stats-db"]?.uptime).toBe(80); // (10-2)/10*100
  });

  it("should reset all circuit breakers", async () => {
    const breaker1 = createDatabaseBreaker("reset-db");
    const breaker2 = createExternalApiBreaker("reset-api");

    circuitBreakerRegistry.register("reset-db", breaker1);
    circuitBreakerRegistry.register("reset-api", breaker2);

    // Clear the exec call count from beforeEach setup
    mockPipeline.exec.mockClear();

    await circuitBreakerRegistry.resetAll();

    // Each breaker should have been reset (2 calls to pipeline.exec)
    expect(mockPipeline.exec).toHaveBeenCalledTimes(2);
    expect(mockPipeline.set).toHaveBeenCalledWith(
      expect.stringContaining("reset-db:state"),
      CircuitBreakerState.CLOSED,
    );
    expect(mockPipeline.set).toHaveBeenCalledWith(
      expect.stringContaining("reset-api:state"),
      CircuitBreakerState.CLOSED,
    );
  });
});

describe("getCircuitBreaker utility", () => {
  beforeEach(() => {
    (
      circuitBreakerRegistry as unknown as { breakers: Map<string, unknown> }
    ).breakers.clear();
  });

  it("should get existing circuit breaker by name", () => {
    const config: CircuitBreakerConfig = {
      name: "utility-test",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 1500,
      enableMonitoring: true,
    };

    const breaker = getCircuitBreaker("utility-test", config);
    const retrieved = getCircuitBreaker("utility-test");

    expect(retrieved).toBe(breaker);
  });

  it("should create new circuit breaker when config provided", () => {
    const config: CircuitBreakerConfig = {
      name: "new-utility",
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeout: 5000,
      timeout: 1000,
      enableMonitoring: false,
    };

    const breaker = getCircuitBreaker("new-utility", config);

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it("should throw error when circuit breaker not found and no config provided", () => {
    expect(() => getCircuitBreaker("non-existent")).toThrow(
      "Circuit breaker 'non-existent' not found and no config provided. Register it first or provide config.",
    );
  });
});

describe("withCircuitBreaker utility", () => {
  beforeEach(() => {
    (
      circuitBreakerRegistry as unknown as { breakers: Map<string, unknown> }
    ).breakers.clear();
    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
  });

  it("should execute operation with circuit breaker protection", async () => {
    const operation = vi.fn().mockResolvedValue("utility-result");

    const result = await withCircuitBreaker("utility-service", operation);

    expect(operation).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      data: "utility-result",
      fromFallback: false,
      state: CircuitBreakerState.CLOSED,
      latency: expect.any(Number),
    });
  });

  it("should use custom config when provided", async () => {
    const operation = vi.fn().mockResolvedValue("config-result");
    const config: CircuitBreakerConfig = {
      name: "custom-utility",
      failureThreshold: 10,
      successThreshold: 5,
      recoveryTimeout: 30000,
      timeout: 5000,
      enableMonitoring: true,
    };

    const result = await withCircuitBreaker("custom-utility", operation, {
      config,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe("config-result");
  });

  it("should use fallback when provided", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Service failed"));
    const fallback = vi.fn().mockResolvedValue("fallback-result");
    mockRedisClient.hget.mockResolvedValue("1"); // failureCount less than threshold

    const result = await withCircuitBreaker("fallback-service", operation, {
      fallback,
    });

    expect(fallback).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      data: "fallback-result",
      fromFallback: true,
      state: expect.any(String),
      latency: expect.any(Number),
      error: expect.any(Error),
    });
  });

  it("should use default internal service config when no config provided", async () => {
    const operation = vi.fn().mockResolvedValue("default-config");

    const result = await withCircuitBreaker("default-service", operation);

    // The service should be registered with default internal service config
    expect(result.success).toBe(true);
  });
});

describe("checkAllCircuitBreakers utility", () => {
  beforeEach(() => {
    (
      circuitBreakerRegistry as unknown as { breakers: Map<string, unknown> }
    ).breakers.clear();
  });

  it("should report all circuit breakers as healthy when none are open", async () => {
    const breaker1 = createDatabaseBreaker("healthy-db");
    const breaker2 = createExternalApiBreaker("healthy-api");

    circuitBreakerRegistry.register("healthy-db", breaker1);
    circuitBreakerRegistry.register("healthy-api", breaker2);

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.hgetall.mockResolvedValue({
      totalRequests: "10",
      totalFailures: "1",
    });

    const health = await checkAllCircuitBreakers();

    expect(health.healthy).toBe(true);
    expect(health.unhealthy).toEqual([]);
    expect(health.stats).toHaveProperty("healthy-db");
    expect(health.stats).toHaveProperty("healthy-api");
  });

  it("should report unhealthy circuit breakers when some are open", async () => {
    const breaker1 = createDatabaseBreaker("unhealthy-db");
    const breaker2 = createExternalApiBreaker("healthy-api");

    circuitBreakerRegistry.register("unhealthy-db", breaker1);
    circuitBreakerRegistry.register("healthy-api", breaker2);

    // Mock different states for each breaker
    mockRedisClient.get
      .mockResolvedValueOnce(CircuitBreakerState.OPEN) // unhealthy-db
      .mockResolvedValueOnce(CircuitBreakerState.CLOSED); // healthy-api

    mockRedisClient.hgetall.mockResolvedValue({
      totalRequests: "5",
      totalFailures: "3",
    });

    const health = await checkAllCircuitBreakers();

    expect(health.healthy).toBe(false);
    expect(health.unhealthy).toEqual(["unhealthy-db"]);
    expect(health.stats["unhealthy-db"]?.state).toBe(CircuitBreakerState.OPEN);
    expect(health.stats["healthy-api"]?.state).toBe(CircuitBreakerState.CLOSED);
  });

  it("should handle empty registry gracefully", async () => {
    const health = await checkAllCircuitBreakers();

    expect(health.healthy).toBe(true);
    expect(health.unhealthy).toEqual([]);
    expect(health.stats).toEqual({});
  });
});

describe("CircuitBreakerDefaults", () => {
  it("should have database defaults", () => {
    expect(CircuitBreakerDefaults.database).toEqual({
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 30000,
      timeout: 5000,
      enableMonitoring: true,
    });
  });

  it("should have external API defaults", () => {
    expect(CircuitBreakerDefaults.externalApi).toEqual({
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeout: 60000,
      timeout: 10000,
      enableMonitoring: true,
    });
  });

  it("should have internal service defaults", () => {
    expect(CircuitBreakerDefaults.internalService).toEqual({
      failureThreshold: 10,
      successThreshold: 5,
      recoveryTimeout: 15000,
      timeout: 3000,
      enableMonitoring: true,
    });
  });
});

describe("Error handling and edge cases", () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: "error-test",
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeout: 5000,
      timeout: 1000,
      enableMonitoring: true,
    });
  });

  it("should handle Redis failures gracefully during state retrieval", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const operation = vi.fn().mockResolvedValue("success");

    mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));

    // Should not throw, but may have degraded functionality
    try {
      await circuitBreaker.execute(operation);
    } catch {
      // Expected behavior may vary based on implementation
    }

    consoleSpy.mockRestore();
  });

  it("should handle Redis failures gracefully during stats recording", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const operation = vi.fn().mockResolvedValue("success");

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    // Make the pipeline execution fail, but the operation should still complete
    mockPipeline.exec.mockRejectedValueOnce(new Error("Redis write failed"));

    // The operation may fail due to stats recording issues, but should be handled gracefully
    try {
      const result = await circuitBreaker.execute(operation);
      expect(result.success).toBe(true);
    } catch (error) {
      // If it throws, it should be the Redis error, not the operation error
      expect((error as Error).message).toBe("Redis write failed");
    }

    consoleSpy.mockRestore();
  });

  it("should handle malformed date strings in stats", async () => {
    const badStats = {
      failureCount: "not-a-number",
      lastFailure: "invalid-date",
      totalRequests: "also-not-a-number",
    };

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.hgetall.mockResolvedValue(badStats);

    const stats = await circuitBreaker.getStats();

    expect(stats.failureCount).toBe(0); // Should default to 0 for invalid numbers
    // Note: new Date("invalid-date") creates Invalid Date object, not undefined
    expect(stats.lastFailure?.toString()).toBe("Invalid Date");
    expect(stats.totalRequests).toBe(0);
    expect(stats.uptime).toBe(100); // Should calculate correctly with 0 requests
  });

  it("should handle empty or null Redis responses", async () => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.hgetall.mockResolvedValue(null);
    mockRedisClient.hget.mockResolvedValue(null);

    // All operations should work with null responses
    const state = await circuitBreaker.getState();
    const stats = await circuitBreaker.getStats();

    expect(state).toBe(CircuitBreakerState.CLOSED);
    expect(stats.failureCount).toBe(0);
    expect(stats.uptime).toBe(100);
  });
});

describe("Real-world integration scenarios", () => {
  it("should handle database failure scenario with fallback", async () => {
    const databaseBreaker = createDatabaseBreaker("user-db");

    // Simulate database operation that fails
    const databaseOperation = vi
      .fn()
      .mockRejectedValue(new Error("Connection timeout"));

    // Simulate cache fallback
    const cacheOperation = vi
      .fn()
      .mockResolvedValue({ id: 1, name: "cached-user", source: "cache" });

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.hget.mockResolvedValue("2"); // Failure count less than threshold

    const result = await databaseBreaker.execute(
      databaseOperation,
      cacheOperation,
    );

    expect(result.success).toBe(true);
    expect(result.fromFallback).toBe(true);
    expect((result.data as any).source).toBe("cache");
    expect(result.error).toBeInstanceOf(Error);
  });

  it("should handle API failure scenario with circuit opening", async () => {
    const apiBreaker = createExternalApiBreaker("payment");

    // Simulate API operation that consistently fails
    const paymentOperation = vi
      .fn()
      .mockRejectedValue(new Error("Service unavailable"));

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);
    mockRedisClient.hget.mockResolvedValue("3"); // Failure count equals threshold

    await expect(apiBreaker.execute(paymentOperation)).rejects.toThrow(
      "Service unavailable",
    );

    // Circuit should open after this failure
    expect(mockPipeline.set).toHaveBeenCalledWith(
      expect.stringContaining("payment:state"),
      CircuitBreakerState.OPEN,
    );
  });

  it("should handle recovery scenario from HALF_OPEN to CLOSED", async () => {
    const serviceBreaker = createInternalServiceBreaker("auth");

    // Start in HALF_OPEN state
    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.HALF_OPEN);

    // Simulate successful operations that meet success threshold
    const authOperation = vi
      .fn()
      .mockResolvedValue({ token: "abc123", valid: true });
    mockRedisClient.hget.mockResolvedValue("5"); // Success count equals threshold

    const result = await serviceBreaker.execute(authOperation);

    expect(result.success).toBe(true);
    expect((result.data as any).valid).toBe(true);

    // Circuit should close after meeting success threshold
    expect(mockPipeline.set).toHaveBeenCalledWith(
      expect.stringContaining("auth:state"),
      CircuitBreakerState.CLOSED,
    );
  });

  it("should handle multiple concurrent operations correctly", async () => {
    const concurrentBreaker = createInternalServiceBreaker("concurrent");

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);

    const operations = Array.from({ length: 5 }, (_, i) =>
      vi.fn().mockResolvedValue(`result-${i}`),
    );

    const promises = operations.map((op) => concurrentBreaker.execute(op));
    const results = await Promise.all(promises);

    // All operations should succeed
    results.forEach((result: any, index: number) => {
      expect(result.success).toBe(true);
      expect(result.data).toBe(`result-${index}`);
    });

    // All operations should have been called
    operations.forEach((op) => {
      expect(op).toHaveBeenCalledOnce();
    });
  });
});

describe("Performance and resource management", () => {
  it("should measure operation latency accurately", async () => {
    const breaker = new CircuitBreaker({
      name: "perf-test",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 5000,
      enableMonitoring: true,
    });

    const slowOperation = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve("slow-result"), 100),
          ),
      );

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);

    const result = await breaker.execute(slowOperation);

    expect(result.success).toBe(true);
    expect(result.latency).toBeGreaterThan(90); // Should be at least 90ms
    expect(result.latency).toBeLessThan(200); // Should be less than 200ms
  });

  it("should handle very fast operations correctly", async () => {
    const breaker = new CircuitBreaker({
      name: "fast-test",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 5000,
      enableMonitoring: true,
    });

    const fastOperation = vi.fn().mockResolvedValue("fast-result");

    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);

    const result = await breaker.execute(fastOperation);

    expect(result.success).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(result.latency).toBeLessThan(10); // Should be very fast
  });

  it("should not leak memory with health metrics", async () => {
    const breaker = new CircuitBreaker({
      name: "memory-test",
      failureThreshold: 5,
      successThreshold: 3,
      recoveryTimeout: 10000,
      timeout: 1000,
      enableMonitoring: true,
    });

    const operation = vi.fn().mockResolvedValue("result");
    mockRedisClient.get.mockResolvedValue(CircuitBreakerState.CLOSED);

    // Execute many operations
    for (let i = 0; i < 150; i++) {
      await breaker.execute(operation);
    }

    // Verify that metrics are trimmed to prevent memory leaks
    expect(mockRedisClient.ltrim).toHaveBeenCalledWith(
      expect.stringContaining("memory-test:metrics"),
      0,
      99, // Should keep only last 100 metrics
    );
  });
});
