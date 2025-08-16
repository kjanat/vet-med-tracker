/**
 * Circuit Breaker Pattern Implementation
 *
 * Protects against cascading failures by monitoring service health
 * and preventing calls when services are unhealthy. Provides fallback
 * mechanisms and automatic recovery detection.
 */

import { getRedisClient, RedisKeys } from "./client";

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = "CLOSED", // Normal operation - requests pass through
  OPEN = "OPEN", // Circuit is open - requests fail immediately
  HALF_OPEN = "HALF_OPEN", // Testing - limited requests to check recovery
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Service name for identification */
  name: string;
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Timeout before attempting recovery (ms) */
  recoveryTimeout: number;
  /** Timeout for individual operations (ms) */
  timeout: number;
  /** Enable health monitoring */
  enableMonitoring: boolean;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
  totalRequests: number;
  totalFailures: number;
  uptime: number; // Percentage
}

/**
 * Result of a circuit breaker operation
 */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromFallback: boolean;
  state: CircuitBreakerState;
  latency: number;
}

/**
 * Default configurations for different service types
 */
export const CircuitBreakerDefaults = {
  database: {
    failureThreshold: 5,
    successThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    enableMonitoring: true,
  },
  externalApi: {
    failureThreshold: 3,
    successThreshold: 2,
    recoveryTimeout: 60000, // 1 minute
    timeout: 10000, // 10 seconds
    enableMonitoring: true,
  },
  internalService: {
    failureThreshold: 10,
    successThreshold: 5,
    recoveryTimeout: 15000, // 15 seconds
    timeout: 3000, // 3 seconds
    enableMonitoring: true,
  },
} as const;

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker<T = unknown> {
  private readonly redis = getRedisClient();
  private readonly config: CircuitBreakerConfig;
  private readonly stateKey: string;
  private readonly statsKey: string;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.stateKey = RedisKeys.circuitBreaker.service(`${config.name}:state`);
    this.statsKey = RedisKeys.circuitBreaker.service(`${config.name}:stats`);
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<R = T>(
    operation: () => Promise<R>,
    fallback?: () => Promise<R>,
  ): Promise<CircuitBreakerResult<R>> {
    const start = Date.now();

    try {
      const state = await this.getState();

      // Check if circuit is open
      if (state === CircuitBreakerState.OPEN) {
        const canAttempt = await this.canAttemptRecovery();
        if (!canAttempt) {
          if (fallback) {
            const fallbackResult = await fallback();
            return {
              success: true,
              data: fallbackResult,
              fromFallback: true,
              state,
              latency: Date.now() - start,
            };
          }
          throw new Error(
            `Circuit breaker is OPEN for service: ${this.config.name}`,
          );
        }

        // Transition to half-open for recovery attempt
        await this.transitionToHalfOpen();
      }

      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation);

      // Record success
      await this.recordSuccess();

      return {
        success: true,
        data: result,
        fromFallback: false,
        state: await this.getState(),
        latency: Date.now() - start,
      };
    } catch (error) {
      // Record failure
      await this.recordFailure(error as Error);

      // Try fallback if available
      if (fallback) {
        try {
          const fallbackResult = await fallback();
          return {
            success: true,
            data: fallbackResult,
            fromFallback: true,
            state: await this.getState(),
            latency: Date.now() - start,
            error: error as Error,
          };
        } catch (fallbackError) {
          // Both primary and fallback failed
          throw new Error(
            `Both primary and fallback failed: ${error} | Fallback: ${fallbackError}`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  async getState(): Promise<CircuitBreakerState> {
    const state = await this.redis.get(this.stateKey);
    return (state as CircuitBreakerState) || CircuitBreakerState.CLOSED;
  }

  /**
   * Get circuit breaker statistics
   */
  async getStats(): Promise<CircuitBreakerStats> {
    const [state, statsData] = await Promise.all([
      this.getState(),
      this.redis.hgetall(this.statsKey),
    ]);

    const stats = statsData || {};
    const totalRequests = Number(stats.totalRequests) || 0;
    const totalFailures = Number(stats.totalFailures) || 0;

    return {
      state,
      failureCount: Number(stats.failureCount) || 0,
      successCount: Number(stats.successCount) || 0,
      lastFailure: stats.lastFailure
        ? new Date(String(stats.lastFailure))
        : undefined,
      lastSuccess: stats.lastSuccess
        ? new Date(String(stats.lastSuccess))
        : undefined,
      nextAttempt: stats.nextAttempt
        ? new Date(String(stats.nextAttempt))
        : undefined,
      totalRequests,
      totalFailures,
      uptime:
        totalRequests > 0
          ? ((totalRequests - totalFailures) / totalRequests) * 100
          : 100,
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  async reset(): Promise<void> {
    const pipe = this.redis.pipeline();
    pipe.set(this.stateKey, CircuitBreakerState.CLOSED);
    pipe.del(this.statsKey);
    await pipe.exec();
  }

  /**
   * Force circuit breaker to specific state (for testing/emergency)
   */
  async forceState(state: CircuitBreakerState): Promise<void> {
    await this.redis.set(this.stateKey, state);
  }

  /**
   * Get recent health metrics
   */
  async getHealthMetrics(limit = 20): Promise<Array<Record<string, unknown>>> {
    const metricKey = RedisKeys.circuitBreaker.service(
      `${this.config.name}:metrics`,
    );
    const metrics = await this.redis.lrange(metricKey, 0, limit - 1);
    return metrics.map((metric) => JSON.parse(metric));
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<R>(operation: () => Promise<R>): Promise<R> {
    return Promise.race([
      operation(),
      new Promise<R>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Operation timeout: ${this.config.timeout}ms`)),
          this.config.timeout,
        ),
      ),
    ]);
  }

  /**
   * Record successful operation
   */
  private async recordSuccess(): Promise<void> {
    const pipe = this.redis.pipeline();
    const now = new Date().toISOString();

    pipe.hincrby(this.statsKey, "successCount", 1);
    pipe.hincrby(this.statsKey, "totalRequests", 1);
    pipe.hset(this.statsKey, { lastSuccess: now });

    // Check if we should close the circuit
    const successCount = await this.redis.hget(this.statsKey, "successCount");
    if (Number(successCount) >= this.config.successThreshold) {
      pipe.set(this.stateKey, CircuitBreakerState.CLOSED);
      pipe.hset(this.statsKey, { failureCount: "0" });
      pipe.hset(this.statsKey, { successCount: "0" });
    }

    pipe.expire(this.statsKey, 86400); // Expire in 24 hours
    await pipe.exec();

    if (this.config.enableMonitoring) {
      await this.logHealthMetric("success", { timestamp: now });
    }
  }

  /**
   * Record failed operation
   */
  private async recordFailure(error: Error): Promise<void> {
    const pipe = this.redis.pipeline();
    const now = new Date().toISOString();
    const nextAttempt = new Date(
      Date.now() + this.config.recoveryTimeout,
    ).toISOString();

    pipe.hincrby(this.statsKey, "failureCount", 1);
    pipe.hincrby(this.statsKey, "totalRequests", 1);
    pipe.hincrby(this.statsKey, "totalFailures", 1);
    pipe.hset(this.statsKey, { lastFailure: now });
    pipe.hset(this.statsKey, { nextAttempt });

    // Check if we should open the circuit
    const failureCount = await this.redis.hget(this.statsKey, "failureCount");
    if (Number(failureCount) >= this.config.failureThreshold) {
      pipe.set(this.stateKey, CircuitBreakerState.OPEN);
    }

    pipe.expire(this.statsKey, 86400); // Expire in 24 hours
    await pipe.exec();

    if (this.config.enableMonitoring) {
      await this.logHealthMetric("failure", {
        timestamp: now,
        error: error.message,
        nextAttempt,
      });
    }
  }

  /**
   * Check if recovery attempt is allowed
   */
  private async canAttemptRecovery(): Promise<boolean> {
    const nextAttempt = await this.redis.hget(this.statsKey, "nextAttempt");
    if (!nextAttempt) return true;

    return Date.now() >= new Date(String(nextAttempt)).getTime();
  }

  /**
   * Transition to half-open state
   */
  private async transitionToHalfOpen(): Promise<void> {
    await this.redis.set(this.stateKey, CircuitBreakerState.HALF_OPEN);
  }

  /**
   * Log health metrics for monitoring
   */
  private async logHealthMetric(
    type: "success" | "failure",
    data: Record<string, unknown>,
  ): Promise<void> {
    const metricKey = RedisKeys.circuitBreaker.service(
      `${this.config.name}:metrics`,
    );
    const metric = {
      type,
      service: this.config.name,
      timestamp: new Date().toISOString(),
      ...data,
    };

    await this.redis.lpush(metricKey, JSON.stringify(metric));
    await this.redis.ltrim(metricKey, 0, 99); // Keep last 100 metrics
    await this.redis.expire(metricKey, 86400); // Expire in 24 hours
  }
}

/**
 * Circuit breaker factory functions for common use cases
 */

/**
 * Create circuit breaker for database operations
 */
export function createDatabaseBreaker(name = "database"): CircuitBreaker {
  return new CircuitBreaker({
    name,
    ...CircuitBreakerDefaults.database,
  });
}

/**
 * Create circuit breaker for external API calls
 */
export function createExternalApiBreaker(apiName: string): CircuitBreaker {
  return new CircuitBreaker({
    name: `external-api-${apiName}`,
    ...CircuitBreakerDefaults.externalApi,
  });
}

/**
 * Create circuit breaker for internal services
 */
export function createInternalServiceBreaker(
  serviceName: string,
): CircuitBreaker {
  return new CircuitBreaker({
    name: `internal-${serviceName}`,
    ...CircuitBreakerDefaults.internalService,
  });
}

/**
 * Create custom circuit breaker
 */
export function createCustomBreaker(
  config: CircuitBreakerConfig,
): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * Global circuit breaker registry for reusing instances
 */
class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers = new Map<string, CircuitBreaker>();

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  register(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker);
  }

  getOrCreate(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(config);
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  /**
   * Get all registered circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get health status of all registered breakers
   */
  async getAllStats(): Promise<Record<string, CircuitBreakerStats>> {
    const stats: Record<string, CircuitBreakerStats> = {};
    const promises = Array.from(this.breakers.entries()).map(
      async ([name, breaker]) => {
        stats[name] = await breaker.getStats();
      },
    );
    await Promise.all(promises);
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  async resetAll(): Promise<void> {
    const promises = Array.from(this.breakers.values()).map((breaker) =>
      breaker.reset(),
    );
    await Promise.all(promises);
  }
}

export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();

/**
 * Convenience function to get or create a circuit breaker
 */
export function getCircuitBreaker(
  name: string,
  config?: CircuitBreakerConfig,
): CircuitBreaker {
  if (config) {
    return circuitBreakerRegistry.getOrCreate(name, config);
  }

  const existing = circuitBreakerRegistry.get(name);
  if (!existing) {
    throw new Error(
      `Circuit breaker '${name}' not found and no config provided. Register it first or provide config.`,
    );
  }

  return existing;
}

/**
 * Utility function to wrap any async function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  name: string,
  operation: () => Promise<T>,
  options?: {
    config?: CircuitBreakerConfig;
    fallback?: () => Promise<T>;
  },
): Promise<CircuitBreakerResult<T>> {
  const config = options?.config || {
    name,
    ...CircuitBreakerDefaults.internalService,
  };

  const breaker = getCircuitBreaker(name, config);
  return breaker.execute(operation, options?.fallback);
}

/**
 * Health check function for all circuit breakers
 */
export async function checkAllCircuitBreakers(): Promise<{
  healthy: boolean;
  stats: Record<string, CircuitBreakerStats>;
  unhealthy: string[];
}> {
  const stats = await circuitBreakerRegistry.getAllStats();
  const unhealthy = Object.entries(stats)
    .filter(([, stat]) => stat.state === CircuitBreakerState.OPEN)
    .map(([name]) => name);

  return {
    healthy: unhealthy.length === 0,
    stats,
    unhealthy,
  };
}
