/**
 * Rate limiting implementation using @upstash/ratelimit
 * Provides sliding window rate limiting with multiple tiers and bypass options
 */

import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient, RedisKeys } from "./client";

/**
 * Rate limit tiers with different limits
 */
export type RateLimitTier =
  | "user"
  | "household"
  | "ip"
  | "admin"
  | "authenticated"
  | "anonymous";

/**
 * Rate limit configuration for each tier
 */
interface RateLimitConfig {
  requests: number;
  windowMs: number;
  keyGenerator: (identifier: string) => string;
  bypassAdmins?: boolean;
}

/**
 * Rate limit configurations by tier
 */
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  // User-specific rate limits (per authenticated user)
  user: {
    requests: 1000, // 1000 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (userId: string) => RedisKeys.rateLimit.user(userId),
    bypassAdmins: true,
  },

  // Household-specific rate limits (per household for multi-user operations)
  household: {
    requests: 5000, // 5000 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (householdId: string) =>
      RedisKeys.rateLimit.api("household", householdId),
    bypassAdmins: true,
  },

  // IP-based rate limits (for anonymous or additional protection)
  ip: {
    requests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (ip: string) => RedisKeys.rateLimit.ip(ip),
    bypassAdmins: false, // Apply to all IPs
  },

  // Admin operations (very high limits)
  admin: {
    requests: 10000, // 10000 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (identifier: string) =>
      RedisKeys.rateLimit.api("admin", identifier),
    bypassAdmins: false, // Admins still have limits, just higher
  },

  // General authenticated user rate limits
  authenticated: {
    requests: 500, // 500 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (userId: string) =>
      RedisKeys.rateLimit.api("authenticated", userId),
    bypassAdmins: true,
  },

  // Anonymous user rate limits (very restrictive)
  anonymous: {
    requests: 50, // 50 requests
    windowMs: 60 * 1000, // per minute
    keyGenerator: (identifier: string) =>
      RedisKeys.rateLimit.api("anonymous", identifier),
    bypassAdmins: false,
  },
};

/**
 * Rate limit result with additional metadata
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  bypassedReason?: string;
}

/**
 * Rate limit headers for HTTP responses
 */
export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "X-RateLimit-Retry-After"?: string;
  "X-RateLimit-Policy"?: string;

  // Add index signature to allow casting to Record<string, string>
  [key: string]: string | undefined;
}

/**
 * Singleton instances for rate limiters
 */
const rateLimiters = new Map<RateLimitTier, Ratelimit>();

/**
 * Get or create a rate limiter for a specific tier
 */
function getRateLimiter(tier: RateLimitTier): Ratelimit {
  if (!rateLimiters.has(tier)) {
    const config = RATE_LIMIT_CONFIGS[tier];
    const limiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(
        config.requests,
        `${config.windowMs} ms`,
      ),
      analytics: true, // Enable analytics for monitoring
      prefix: `rl:${tier}`,
    });
    rateLimiters.set(tier, limiter);
  }
  const limiter = rateLimiters.get(tier);
  if (!limiter) {
    throw new Error(`Rate limiter for tier ${tier} not found`);
  }
  return limiter;
}

/**
 * Check if user should bypass rate limits (for admin operations)
 */
function shouldBypassRateLimit(
  tier: RateLimitTier,
  isAdmin: boolean = false,
  bypassReason?: string,
): string | null {
  const config = RATE_LIMIT_CONFIGS[tier];

  // Explicit bypass reason (e.g., system operations)
  if (bypassReason) {
    return `system:${bypassReason}`;
  }

  // Admin bypass
  if (isAdmin && config.bypassAdmins) {
    return "admin";
  }

  return null;
}

/**
 * Apply rate limiting for a specific tier
 */
export async function applyRateLimit(
  tier: RateLimitTier,
  identifier: string,
  options: {
    isAdmin?: boolean;
    bypassReason?: string;
    customKey?: string;
  } = {},
): Promise<RateLimitResult> {
  const { isAdmin = false, bypassReason, customKey } = options;
  const config = RATE_LIMIT_CONFIGS[tier];

  // Check for bypass conditions
  const bypassedReason = shouldBypassRateLimit(tier, isAdmin, bypassReason);
  if (bypassedReason) {
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests,
      reset: new Date(Date.now() + config.windowMs),
      bypassedReason,
    };
  }

  // Generate rate limit key
  const key = customKey || config.keyGenerator(identifier);

  // Apply rate limit
  const limiter = getRateLimiter(tier);
  const result = await limiter.limit(key);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset),
    retryAfter: result.success
      ? undefined
      : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * Generate rate limit headers for HTTP responses
 */
export function generateRateLimitHeaders(
  result: RateLimitResult,
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.reset.getTime() / 1000).toString(),
  };

  if (result.retryAfter) {
    headers["X-RateLimit-Retry-After"] = result.retryAfter.toString();
  }

  // Add policy information
  headers["X-RateLimit-Policy"] = "sliding-window";

  return headers;
}

/**
 * Apply rate limiting checks for a given context
 */
async function applyRateLimitChecks(
  checks: Array<{
    tier: RateLimitTier;
    identifier: string;
    description: string;
  }>,
  isAdmin: boolean,
  path: string,
): Promise<void> {
  for (const check of checks) {
    const result = await applyRateLimit(check.tier, check.identifier, {
      isAdmin,
      bypassReason:
        path === "health" || path.startsWith("system") ? "system" : undefined,
    });

    if (!result.success) {
      const errorMessage = result.bypassedReason
        ? `Rate limit bypassed: ${result.bypassedReason}`
        : `Rate limit exceeded: ${check.description}. Try again in ${result.retryAfter} seconds.`;

      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: errorMessage,
        cause: {
          rateLimitResult: result,
          rateLimitHeaders: generateRateLimitHeaders(result),
          tier: check.tier,
          identifier: check.identifier,
          bypassedReason: result.bypassedReason,
        },
      });
    }
  }
}

/**
 * Build rate limit checks based on user context
 */
function buildRateLimitChecks(
  ip: string,
  isAuthenticated: boolean,
  userId: string | undefined,
  householdId: string | null | undefined,
  isAdmin: boolean,
  path: string,
): Array<{
  tier: RateLimitTier;
  identifier: string;
  description: string;
}> {
  const checks: Array<{
    tier: RateLimitTier;
    identifier: string;
    description: string;
  }> = [];

  // Always apply IP-based rate limiting
  checks.push({
    tier: "ip",
    identifier: ip,
    description: `IP rate limit for ${ip}`,
  });

  if (isAuthenticated && userId) {
    // Apply user-specific rate limiting
    checks.push({
      tier: "user",
      identifier: userId,
      description: `User rate limit for ${userId}`,
    });

    // Apply general authenticated user limits
    checks.push({
      tier: "authenticated",
      identifier: userId,
      description: `Authenticated user rate limit for ${userId}`,
    });

    // Apply household-specific rate limiting if available
    if (householdId) {
      checks.push({
        tier: "household",
        identifier: householdId,
        description: `Household rate limit for ${householdId}`,
      });
    }

    // Admin operations get higher limits
    if (isAdmin && (path.includes("admin") || path.includes("manage"))) {
      checks.push({
        tier: "admin",
        identifier: userId,
        description: `Admin rate limit for ${userId}`,
      });
    }
  } else {
    // Anonymous user - very restrictive
    checks.push({
      tier: "anonymous",
      identifier: ip,
      description: `Anonymous rate limit for ${ip}`,
    });
  }

  return checks;
}

/**
 * tRPC middleware for rate limiting
 * Applies rate limiting based on user context and request type
 */
export function createRateLimitMiddleware<
  TContext extends {
    headers: Headers;
    auth?: { userId?: string } | null;
    dbUser?: { id: string; role?: string } | null;
    householdId?: string | null;
    requestedHouseholdId?: string | null;
  },
>() {
  return async function rateLimitMiddleware({
    ctx,
    next,
    path,
  }: {
    ctx: TContext;
    next: () => Promise<unknown>;
    path: string;
  }) {
    const ip = extractClientIP(ctx.headers);

    // Determine if user is authenticated and admin
    const isAuthenticated = !!ctx.auth?.userId;
    const isAdmin =
      ctx.dbUser?.role === "ADMIN" || ctx.dbUser?.role === "OWNER";
    const userId = ctx.auth?.userId;
    const householdId = ctx.householdId || ctx.requestedHouseholdId;

    // Build rate limit checks based on context
    const rateLimitChecks = buildRateLimitChecks(
      ip,
      isAuthenticated,
      userId,
      householdId,
      isAdmin,
      path,
    );

    // Apply all rate limit checks
    await applyRateLimitChecks(rateLimitChecks, isAdmin, path);

    // All rate limits passed, continue with the request
    return next();
  };
}

/**
 * Specialized rate limiting for critical operations
 */
export async function rateLimitCriticalOperation(
  operationType:
    | "administration"
    | "inventory"
    | "user-creation"
    | "password-reset",
  identifier: string,
  _options: { isAdmin?: boolean } = {},
): Promise<RateLimitResult> {
  const criticalLimits = {
    administration: { requests: 10, windowMs: 60 * 1000 }, // 10 per minute
    inventory: { requests: 50, windowMs: 60 * 1000 }, // 50 per minute
    "user-creation": { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
    "password-reset": { requests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  };

  const config = criticalLimits[operationType];
  const key = RedisKeys.rateLimit.api(`critical:${operationType}`, identifier);

  // Create a custom rate limiter for this operation
  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.slidingWindow(config.requests, `${config.windowMs} ms`),
    analytics: true,
    prefix: `rl:critical:${operationType}`,
  });

  const result = await limiter.limit(key);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: new Date(result.reset),
    retryAfter: result.success
      ? undefined
      : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * Get rate limit analytics for monitoring
 */
export async function getRateLimitAnalytics(
  tier: RateLimitTier,
  identifier: string,
): Promise<{
  tier: RateLimitTier;
  identifier: string;
  current: RateLimitResult;
  analytics?: unknown;
}> {
  const result = await applyRateLimit(tier, identifier, {
    bypassReason: "analytics", // Don't actually apply the limit
  });

  return {
    tier,
    identifier,
    current: result,
    // Note: @upstash/ratelimit analytics would be available here
    // but the current version doesn't expose detailed analytics
  };
}

/**
 * Clear rate limits for a specific identifier (admin only)
 */
export async function clearRateLimit(
  tier: RateLimitTier,
  identifier: string,
): Promise<boolean> {
  try {
    const config = RATE_LIMIT_CONFIGS[tier];
    const key = config.keyGenerator(identifier);
    const redis = getRedisClient();

    // Clear the rate limit key
    await redis.del(key);

    return true;
  } catch (error) {
    console.error("Failed to clear rate limit:", error);
    return false;
  }
}

/**
 * Bulk clear rate limits (for admin operations)
 */
export async function bulkClearRateLimits(
  operations: Array<{ tier: RateLimitTier; identifier: string }>,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const op of operations) {
    const result = await clearRateLimit(op.tier, op.identifier);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Helper to extract IP address from various header sources
 */
export function extractClientIP(headers: Headers): string {
  // Check various headers in order of preference
  const forwardedFor = headers.get("x-forwarded-for");
  const realIP = headers.get("x-real-ip");
  const cfConnectingIP = headers.get("cf-connecting-ip"); // Cloudflare
  const xClientIP = headers.get("x-client-ip");

  // X-Forwarded-For can contain multiple IPs, take the first one
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    return ips[0] || "unknown";
  }

  return realIP || cfConnectingIP || xClientIP || "unknown";
}
