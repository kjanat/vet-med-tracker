import { TRPCError } from "@trpc/server";
import { auditHelpers } from "@/lib/security/audit-logger";

/**
 * Production-grade rate limiting for VetMed Tracker
 *
 * Features:
 * - Progressive rate limiting (IP -> User -> Session based)
 * - Medical workflow-aware limits
 * - Suspicious activity detection
 * - HIPAA-compliant audit logging
 * - DDoS protection
 */

// Rate limiting configuration for different endpoint types
export const RATE_LIMITS = {
  // Administrative endpoints - very strict
  ADMIN: {
    blockDuration: 24 * 60 * 60 * 1000, // 24 hour block
    maxRequests: 100, // Max 100 admin actions per hour
    skipSuccessfulRequests: false,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Authentication endpoints - stricter limits
  AUTH: {
    blockDuration: 60 * 60 * 1000, // 1 hour block
    maxRequests: 10, // Max 10 auth attempts per 15 min
    skipSuccessfulRequests: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },

  // Medical data endpoints - balanced for workflow
  MEDICAL: {
    blockDuration: 10 * 60 * 1000, // 10 minute block
    maxRequests: 60, // 1 request per second average
    skipSuccessfulRequests: false,
    windowMs: 60 * 1000, // 1 minute
  },

  // Read-only endpoints - more permissive
  READ: {
    blockDuration: 5 * 60 * 1000, // 5 minute block
    maxRequests: 120, // 2 requests per second average
    skipSuccessfulRequests: false,
    windowMs: 60 * 1000, // 1 minute
  },

  // Upload endpoints - strict due to resource usage
  UPLOAD: {
    blockDuration: 15 * 60 * 1000, // 15 minute block
    maxRequests: 5, // Max 5 uploads per minute
    skipSuccessfulRequests: false,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

// In-memory store for rate limiting (Redis recommended for production clusters)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked?: boolean;
    blockUntil?: number;
    firstRequest: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    Object.keys(rateLimitStore).forEach((key) => {
      const entry = rateLimitStore[key];
      if (
        entry &&
        entry.resetTime < now &&
        (!entry.blockUntil || entry.blockUntil < now)
      ) {
        delete rateLimitStore[key];
      }
    });
  },
  10 * 60 * 1000,
);

/**
 * Generate rate limiting key based on multiple factors
 */
function generateRateLimitKey(
  type: string,
  userId?: string,
  ip?: string,
  sessionId?: string,
): string {
  // Primary: User-based limiting (most specific)
  if (userId) {
    return `${type}:user:${userId}`;
  }

  // Secondary: Session-based limiting
  if (sessionId) {
    return `${type}:session:${sessionId}`;
  }

  // Fallback: IP-based limiting
  const cleanIp = ip || "unknown";
  return `${type}:ip:${cleanIp}`;
}

/**
 * Extract client IP from request headers
 */
function extractClientIP(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "unknown";
}

/**
 * Check if IP is from private network (less restrictive limits)
 */
function isPrivateIP(ip: string): boolean {
  if (ip === "unknown") return false;

  const privateRanges = [
    /^127\./, // localhost
    /^10\./, // 10.0.0.0/8
    /^192\.168\./, // 192.168.0.0/16
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 private
  ];

  return privateRanges.some((pattern) => pattern.test(ip));
}

/**
 * Determine rate limit type based on tRPC path
 */
function getRateLimitType(path: string): keyof typeof RATE_LIMITS {
  // Authentication endpoints
  if (
    path.includes("auth") ||
    path.includes("login") ||
    path.includes("signin")
  ) {
    return "AUTH";
  }

  // Administrative endpoints
  if (
    path.includes("admin") ||
    path.includes("manage") ||
    path.includes("bulk")
  ) {
    return "ADMIN";
  }

  // Upload endpoints
  if (path.includes("upload") || path.includes("file")) {
    return "UPLOAD";
  }

  // Medical data mutations
  if (
    path.includes("medication") ||
    path.includes("regimen") ||
    path.includes("administration")
  ) {
    return "MEDICAL";
  }

  // Default to read limits for queries
  return "READ";
}

/**
 * Progressive rate limiting with suspicious activity detection
 */
export async function checkRateLimit(
  path: string,
  headers: Headers,
  userId?: string,
  sessionId?: string,
): Promise<void> {
  const now = Date.now();
  const ip = extractClientIP(headers);
  const isPrivate = isPrivateIP(ip);
  const limitType = getRateLimitType(path);
  const config = RATE_LIMITS[limitType];

  // Generate rate limiting key
  const key = generateRateLimitKey(limitType, userId, ip, sessionId);

  // Get or create rate limit entry
  let entry = rateLimitStore[key];
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      firstRequest: now,
      resetTime: now + config.windowMs,
    };
    rateLimitStore[key] = entry;
  }

  // Check if currently blocked
  if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
    const remainingTime = Math.ceil((entry.blockUntil - now) / 1000);

    // Log suspicious activity for extended blocks
    if (entry.blockUntil - now > 30 * 60 * 1000) {
      // >30 min block
      await auditHelpers.logThreat(
        "rate_limit_violation_extended",
        "high",
        ip,
        userId,
        {
          key: key.replace(/user:\w+/, "user:[REDACTED]"), // Anonymize for logging
          limitType,
          path,
          remainingBlockTime: remainingTime,
        },
      );
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limited. Try again in ${remainingTime} seconds.`,
    });
  }

  // Increment counter
  entry.count++;

  // Apply private IP multiplier (less restrictive for internal traffic)
  const effectiveLimit = isPrivate
    ? Math.floor(config.maxRequests * 1.5)
    : config.maxRequests;

  // Check if over limit
  if (entry.count > effectiveLimit) {
    // Block the key
    entry.blocked = true;
    entry.blockUntil = now + config.blockDuration;

    // Log security event
    const severity = entry.count > effectiveLimit * 2 ? "high" : "medium";
    await auditHelpers.logThreat("rate_limit_violation", severity, ip, userId, {
      blockDuration: config.blockDuration / 1000,
      firstRequestTime: new Date(entry.firstRequest).toISOString(),
      isPrivateIP: isPrivate,
      limit: effectiveLimit,
      limitType,
      path,
      requestCount: entry.count,
    });

    // Progressive blocking: increase block time for repeat offenders
    const timeRange = now - entry.firstRequest;
    if (timeRange < 5 * 60 * 1000 && entry.count > effectiveLimit * 3) {
      // >3x limit in <5min = potential attack
      entry.blockUntil = now + config.blockDuration * 3; // Triple block time

      await auditHelpers.logThreat(
        "potential_ddos_attack",
        "high",
        ip,
        userId,
        {
          extendedBlockDuration: (config.blockDuration * 3) / 1000,
          limitType,
          path,
          requestCount: entry.count,
          timeRange: timeRange / 1000,
        },
      );
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limited. Try again later.`,
    });
  }
}

/**
 * Create rate limiting middleware for tRPC
 */
export function createRateLimitMiddleware() {
  return async function rateLimitMiddleware<T>({
    ctx,
    next,
    path,
  }: {
    ctx: {
      headers: Headers;
      dbUser?: { id: string } | null;
      stackUser?: { id: string } | null;
    };
    next: () => Promise<T>;
    path: string;
  }): Promise<T> {
    // Skip rate limiting for internal system calls
    if (path.startsWith("_")) {
      return next();
    }

    // Extract session/user info
    const userId = ctx.dbUser?.id || ctx.stackUser?.id;
    const sessionId = ctx.headers.get("x-session-id") || undefined;

    // Check rate limit
    await checkRateLimit(path, ctx.headers, userId, sessionId);

    return next();
  };
}

/**
 * Get current rate limit status for a user (for frontend display)
 */
export function getRateLimitStatus(
  path: string,
  userId?: string,
  ip?: string,
  sessionId?: string,
): {
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
} {
  const limitType = getRateLimitType(path);
  const config = RATE_LIMITS[limitType];
  const key = generateRateLimitKey(limitType, userId, ip, sessionId);
  const entry = rateLimitStore[key];
  const now = Date.now();

  if (!entry || entry.resetTime < now) {
    return {
      blocked: false,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
    };
  }

  const isPrivate = ip ? isPrivateIP(ip) : false;
  const effectiveLimit = isPrivate
    ? Math.floor(config.maxRequests * 1.5)
    : config.maxRequests;

  return {
    blocked: Boolean(
      entry.blocked && entry.blockUntil && entry.blockUntil > now,
    ),
    blockUntil: entry.blockUntil,
    remaining: Math.max(0, effectiveLimit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSizeBytes: number = 1024 * 1024) {
  // 1MB default
  return async function requestSizeMiddleware<T>({
    ctx,
    next,
    input,
  }: {
    ctx: {
      headers: Headers;
      dbUser?: { id: string } | null;
    };
    next: () => Promise<T>;
    input: unknown;
  }): Promise<T> {
    try {
      const inputSize = JSON.stringify(input).length;

      if (inputSize > maxSizeBytes) {
        const ip = extractClientIP(ctx.headers);

        await auditHelpers.logThreat(
          "oversized_request",
          "medium",
          ip,
          ctx.dbUser?.id,
          {
            maxAllowed: maxSizeBytes,
            requestSize: inputSize,
            sizeRatio: inputSize / maxSizeBytes,
          },
        );

        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "Request too large",
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      // If JSON.stringify fails, likely malformed input
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid request payload",
      });
    }

    return next();
  };
}

/**
 * Reset rate limits for a user (admin function)
 */
export async function resetRateLimit(
  userId: string,
  adminUserId: string,
  reason: string,
): Promise<void> {
  // Find and remove all rate limit entries for the user
  const keysToRemove = Object.keys(rateLimitStore).filter((key) =>
    key.includes(`user:${userId}`),
  );

  keysToRemove.forEach((key) => {
    delete rateLimitStore[key];
  });

  // Log the admin action
  await auditHelpers.logDataAccess(
    "rate_limit_reset",
    adminUserId,
    "USER",
    userId,
    {
      reason,
      resetCount: keysToRemove.length,
      targetUserId: userId,
    },
  );
}
