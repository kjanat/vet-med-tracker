/**
 * Shared test types for Redis test files
 */

import type { Redis } from "@upstash/redis";

/**
 * Mock Redis client interface for testing
 */
export interface MockRedisClient extends Partial<Redis> {
	get: jest.Mock;
	set: jest.Mock;
	del: jest.Mock;
	expire: jest.Mock;
	exists: jest.Mock;
	pipeline: jest.Mock;
	multi: jest.Mock;
	setex: jest.Mock;
	hset: jest.Mock;
	hget: jest.Mock;
	hdel: jest.Mock;
	hgetall: jest.Mock;
	incr: jest.Mock;
	decr: jest.Mock;
	zadd: jest.Mock;
	zrange: jest.Mock;
	zrem: jest.Mock;
	zcard: jest.Mock;
}

/**
 * Mock pipeline interface for testing
 */
export interface MockPipeline {
	get: jest.Mock;
	set: jest.Mock;
	del: jest.Mock;
	expire: jest.Mock;
	exec: jest.Mock;
	hset: jest.Mock;
	hget: jest.Mock;
	hdel: jest.Mock;
	zadd: jest.Mock;
	zrem: jest.Mock;
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
