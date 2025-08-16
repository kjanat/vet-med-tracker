/**
 * Shared test types for Redis test files
 */

import type { Redis } from "@upstash/redis";
import type { Mock } from "vitest";

/**
 * Mock Redis client interface for testing
 */
export interface MockRedisClient extends Partial<Redis> {
  get: Mock;
  set: Mock;
  del: Mock;
  expire: Mock;
  exists: Mock;
  pipeline: Mock;
  multi: Mock;
  setex: Mock;
  hset: Mock;
  hget: Mock;
  hdel: Mock;
  hgetall: Mock;
  incr: Mock;
  decr: Mock;
  zadd: Mock;
  zrange: Mock;
  zrem: Mock;
  zcard: Mock;
}

/**
 * Mock pipeline interface for testing
 */
export interface MockPipeline {
  get: Mock;
  set: Mock;
  del: Mock;
  expire: Mock;
  exec: Mock;
  hset: Mock;
  hget: Mock;
  hdel: Mock;
  zadd: Mock;
  zrem: Mock;
}

/**
 * Mock Ratelimit result
 */
export interface MockRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Generic test error type
 */
export type TestError = Error | unknown;

/**
 * Test context type
 */
export interface TestContext {
  mockRedisClient: MockRedisClient;
  mockPipeline: MockPipeline;
  originalEnv: NodeJS.ProcessEnv;
}
