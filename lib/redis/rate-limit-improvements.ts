/**
 * Rate limiting improvements and enhancements
 * Additional features to strengthen the rate limiting implementation
 */

import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "./client";
import type { RateLimitTier } from "./rate-limit";

/**
 * Enhanced rate limiting with burst handling and priority queues
 */
export interface BurstRateLimitConfig {
  normalRequests: number;
  normalWindowMs: number;
  burstRequests: number;
  burstWindowMs: number;
  burstCooldownMs: number;
}

/**
 * Priority-based rate limiting for different operation types
 */
export type OperationPriority = "critical" | "high" | "normal" | "low";

export interface PriorityRateLimitConfig {
  critical: { requests: number; windowMs: number };
  high: { requests: number; windowMs: number };
  normal: { requests: number; windowMs: number };
  low: { requests: number; windowMs: number };
}

/**
 * Advanced rate limit result with additional metadata
 */
export interface AdvancedRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  bypassedReason?: string;
  burstUsed?: number;
  priority?: OperationPriority;
  queuePosition?: number;
}

/**
 * Rate limiting violations for monitoring
 */
export interface RateLimitViolation {
  timestamp: Date;
  identifier: string;
  tier: RateLimitTier;
  operation: string;
  exceedBy: number;
  userAgent?: string;
  ip: string;
  severity: "warning" | "critical";
}

/**
 * Burst rate limiter that allows short bursts of activity
 */
export class BurstRateLimit {
  private normalLimiter: Ratelimit;
  private burstLimiter: Ratelimit;
  private burstCooldownTracker: Map<string, number> = new Map();

  constructor(
    private config: BurstRateLimitConfig,
    prefix: string,
  ) {
    this.normalLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(
        config.normalRequests,
        `${config.normalWindowMs} ms`,
      ),
      prefix: `${prefix}:normal`,
    });

    this.burstLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(
        config.burstRequests,
        `${config.burstWindowMs} ms`,
      ),
      prefix: `${prefix}:burst`,
    });
  }

  async checkLimit(key: string): Promise<AdvancedRateLimitResult> {
    // Check if we're in burst cooldown
    const lastBurstTime = this.burstCooldownTracker.get(key);
    const now = Date.now();

    if (lastBurstTime && now - lastBurstTime < this.config.burstCooldownMs) {
      // Still in cooldown, use normal limits only
      const result = await this.normalLimiter.limit(key);
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

    // Try normal limits first
    const normalResult = await this.normalLimiter.limit(key);
    if (normalResult.success) {
      return {
        success: true,
        limit: normalResult.limit,
        remaining: normalResult.remaining,
        reset: new Date(normalResult.reset),
      };
    }

    // Normal limits exceeded, try burst
    const burstResult = await this.burstLimiter.limit(key);
    if (burstResult.success) {
      // Track burst usage
      this.burstCooldownTracker.set(key, now);
      return {
        success: true,
        limit: burstResult.limit,
        remaining: burstResult.remaining,
        reset: new Date(burstResult.reset),
        burstUsed: this.config.burstRequests - burstResult.remaining,
      };
    }

    // Both limits exceeded
    return {
      success: false,
      limit: normalResult.limit,
      remaining: 0,
      reset: new Date(normalResult.reset),
      retryAfter: Math.ceil((normalResult.reset - Date.now()) / 1000),
    };
  }
}

/**
 * Priority queue-based rate limiter
 */
export class PriorityRateLimit {
  private limiters: Record<OperationPriority, Ratelimit> = {} as Record<
    OperationPriority,
    Ratelimit
  >;
  private queue: Map<OperationPriority, string[]> = new Map();

  constructor(config: PriorityRateLimitConfig, prefix: string) {
    for (const [priority, settings] of Object.entries(config)) {
      this.limiters[priority as OperationPriority] = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(
          settings.requests,
          `${settings.windowMs} ms`,
        ),
        prefix: `${prefix}:${priority}`,
      });
      this.queue.set(priority as OperationPriority, []);
    }
  }

  async checkLimit(
    key: string,
    priority: OperationPriority,
  ): Promise<AdvancedRateLimitResult> {
    const limiter = this.limiters[priority];
    const result = await limiter.limit(key);

    if (!result.success) {
      // Add to queue
      const priorityQueue = this.queue.get(priority) || [];
      if (!priorityQueue.includes(key)) {
        priorityQueue.push(key);
        this.queue.set(priority, priorityQueue);
      }

      return {
        success: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset),
        priority,
        queuePosition: priorityQueue.indexOf(key) + 1,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      };
    }

    // Remove from queue if successful
    const priorityQueue = this.queue.get(priority) || [];
    const queueIndex = priorityQueue.indexOf(key);
    if (queueIndex !== -1) {
      priorityQueue.splice(queueIndex, 1);
      this.queue.set(priority, priorityQueue);
    }

    return {
      success: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
      priority,
    };
  }

  getQueueStatus(): Record<OperationPriority, number> {
    const status: Record<OperationPriority, number> = {} as Record<
      OperationPriority,
      number
    >;
    for (const [priority, queue] of this.queue.entries()) {
      status[priority] = queue.length;
    }
    return status;
  }
}

/**
 * Rate limit violation tracker for security monitoring
 */
export class RateLimitViolationTracker {
  private violations: RateLimitViolation[] = [];
  private readonly maxViolations = 1000;

  addViolation(violation: RateLimitViolation): void {
    this.violations.unshift(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(0, this.maxViolations);
    }

    // Log critical violations
    if (violation.severity === "critical") {
      console.error("Critical rate limit violation:", violation);
    }
  }

  getViolations(
    options: {
      since?: Date;
      identifier?: string;
      severity?: "warning" | "critical";
      limit?: number;
    } = {},
  ): RateLimitViolation[] {
    let filtered = this.violations;

    if (options.since) {
      const sinceDate = options.since;
      filtered = filtered.filter((v) => v.timestamp >= sinceDate);
    }

    if (options.identifier) {
      filtered = filtered.filter((v) => v.identifier === options.identifier);
    }

    if (options.severity) {
      filtered = filtered.filter((v) => v.severity === options.severity);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getViolationStats(timeWindowMs: number = 3600000): {
    totalViolations: number;
    criticalViolations: number;
    topViolators: Array<{ identifier: string; count: number }>;
    violationsByTier: Record<RateLimitTier, number>;
  } {
    const since = new Date(Date.now() - timeWindowMs);
    const recentViolations = this.getViolations({ since });

    const violatorCounts: Record<string, number> = {};
    const tierCounts: Record<RateLimitTier, number> = {} as Record<
      RateLimitTier,
      number
    >;
    let criticalCount = 0;

    for (const violation of recentViolations) {
      violatorCounts[violation.identifier] =
        (violatorCounts[violation.identifier] || 0) + 1;
      tierCounts[violation.tier] = (tierCounts[violation.tier] || 0) + 1;

      if (violation.severity === "critical") {
        criticalCount++;
      }
    }

    const topViolators = Object.entries(violatorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([identifier, count]) => ({ identifier, count }));

    return {
      totalViolations: recentViolations.length,
      criticalViolations: criticalCount,
      topViolators,
      violationsByTier: tierCounts,
    };
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on system load
 */
export class AdaptiveRateLimit {
  private baseLimiter!: Ratelimit;
  private currentMultiplier = 1.0;
  private readonly minMultiplier = 0.1;
  private readonly maxMultiplier = 2.0;

  constructor(
    private baseRequests: number,
    private windowMs: number,
    private prefix: string,
  ) {
    this.updateLimiter();
  }

  adjustLimits(systemLoad: {
    cpuUsage: number;
    memoryUsage: number;
    dbResponseTime: number;
    errorRate: number;
  }): void {
    // Calculate load score (0-1, where 1 is maximum load)
    const loadScore =
      systemLoad.cpuUsage * 0.3 +
      systemLoad.memoryUsage * 0.2 +
      Math.min(systemLoad.dbResponseTime / 1000, 1) * 0.3 +
      systemLoad.errorRate * 0.2;

    // Adjust multiplier based on load
    if (loadScore > 0.8) {
      this.currentMultiplier = Math.max(
        this.currentMultiplier * 0.8,
        this.minMultiplier,
      );
    } else if (loadScore < 0.3) {
      this.currentMultiplier = Math.min(
        this.currentMultiplier * 1.1,
        this.maxMultiplier,
      );
    }

    this.updateLimiter();
  }

  async checkLimit(key: string): Promise<AdvancedRateLimitResult> {
    const result = await this.baseLimiter.limit(key);
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

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  private updateLimiter(): void {
    const adjustedRequests = Math.floor(
      this.baseRequests * this.currentMultiplier,
    );
    this.baseLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(adjustedRequests, `${this.windowMs} ms`),
      prefix: `${this.prefix}:adaptive`,
    });
  }
}

/**
 * Geo-based rate limiting for different regions
 */
export class GeoRateLimit {
  private limiters: Map<string, Ratelimit> = new Map();
  private defaultLimiter: Ratelimit;

  constructor(
    configs: Record<string, { requests: number; windowMs: number }>,
    defaultConfig: { requests: number; windowMs: number },
    prefix: string,
  ) {
    this.defaultLimiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(
        defaultConfig.requests,
        `${defaultConfig.windowMs} ms`,
      ),
      prefix: `${prefix}:default`,
    });

    for (const [region, config] of Object.entries(configs)) {
      this.limiters.set(
        region,
        new Ratelimit({
          redis: getRedisClient(),
          limiter: Ratelimit.slidingWindow(
            config.requests,
            `${config.windowMs} ms`,
          ),
          prefix: `${prefix}:${region}`,
        }),
      );
    }
  }

  async checkLimit(
    key: string,
    region?: string,
  ): Promise<AdvancedRateLimitResult> {
    const limiter =
      region && this.limiters.has(region)
        ? (this.limiters.get(region) ?? this.defaultLimiter)
        : this.defaultLimiter;

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
}

/**
 * Create violation record from context and path
 */
function createViolationRecord(
  ctx: {
    headers: Headers;
    auth?: { userId?: string } | null;
  },
  path: string,
): RateLimitViolation {
  return {
    timestamp: new Date(),
    identifier: ctx.auth?.userId || "anonymous",
    tier: "user", // Would be determined based on context
    operation: path,
    exceedBy: 1, // Would be calculated from actual result
    ip: extractIP(ctx.headers),
    severity: path.includes("admin") ? "critical" : "warning",
  };
}

/**
 * Check if alert should be sent
 */
function shouldSendAlert(
  options: { alertWebhook?: string },
  violationTracker: RateLimitViolationTracker | null,
): boolean {
  if (!options.alertWebhook || !violationTracker) {
    return false;
  }

  const stats = violationTracker.getViolationStats(300000); // 5 minutes
  return stats.criticalViolations > 5;
}

/**
 * Handle rate limit violations
 */
function handleRateLimitViolation(
  ctx: {
    headers: Headers;
    auth?: { userId?: string } | null;
  },
  path: string,
  options: { alertWebhook?: string },
  violationTracker: RateLimitViolationTracker | null,
): void {
  if (!violationTracker) {
    return;
  }

  // Track violation
  const violation = createViolationRecord(ctx, path);
  violationTracker.addViolation(violation);

  // Send alert if configured
  if (shouldSendAlert(options, violationTracker)) {
    const stats = violationTracker.getViolationStats(300000);
    console.warn("High rate limit violations detected:", stats);
  }
}

/**
 * Enhanced rate limit middleware with monitoring and alerting
 */
export function createEnhancedRateLimitMiddleware<
  TContext extends {
    headers: Headers;
    auth?: { userId?: string } | null;
    dbUser?: { id: string; role?: string } | null;
    householdId?: string | null;
    requestedHouseholdId?: string | null;
  },
>(
  options: {
    enableBurstProtection?: boolean;
    enablePriorityQueue?: boolean;
    enableViolationTracking?: boolean;
    enableAdaptiveLimits?: boolean;
    enableGeoLimits?: boolean;
    alertWebhook?: string;
  } = {},
) {
  const violationTracker = options.enableViolationTracking
    ? new RateLimitViolationTracker()
    : null;

  return async function enhancedRateLimitMiddleware({
    ctx,
    next,
    path,
  }: {
    ctx: TContext;
    next: () => Promise<unknown>;
    path: string;
  }) {
    // Basic rate limiting logic here...
    // This would integrate with the existing rate limit middleware
    // and add the enhanced features as needed

    try {
      const result = await next();
      return result;
    } catch (error) {
      if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") {
        handleRateLimitViolation(ctx, path, options, violationTracker);
      }
      throw error;
    }
  };
}

/**
 * Utility function to extract IP from headers
 */
function extractIP(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIP = headers.get("x-real-ip");
  const cfConnectingIP = headers.get("cf-connecting-ip");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0];
    return firstIp ? firstIp.trim() : "unknown";
  }

  return realIP || cfConnectingIP || "unknown";
}

/**
 * Rate limit dashboard data provider
 */
export async function getRateLimitDashboardData(): Promise<{
  currentLimits: Record<RateLimitTier, { limit: number; remaining: number }>;
  violations: RateLimitViolation[];
  queueStatus: Record<OperationPriority, number>;
  systemLoad: {
    adaptive: number;
    burstUsage: number;
    geoDistribution: Record<string, number>;
  };
}> {
  // This would collect data from all the enhanced rate limiters
  // and provide a comprehensive dashboard view
  return {
    currentLimits: {} as Record<
      RateLimitTier,
      { limit: number; remaining: number }
    >,
    violations: [],
    queueStatus: {} as Record<OperationPriority, number>,
    systemLoad: {
      adaptive: 1.0,
      burstUsage: 0,
      geoDistribution: {},
    },
  };
}

/**
 * Export the global violation tracker instance
 */
export const globalViolationTracker = new RateLimitViolationTracker();
