import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  auditLogs,
  dataAccessLogs,
  performanceMetrics,
  rateLimitEvents,
  securityEvents,
} from "@/db/schema/audit-schema";
import { EnhancedAuditLogger } from "@/lib/security/audit-logger-enhanced";
import { getRateLimitStatus } from "@/lib/security/rate-limiting";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc-enhanced";

/**
 * Security monitoring and compliance API router
 *
 * Provides endpoints for:
 * - Security dashboard data
 * - Audit log queries
 * - Compliance reporting
 * - Incident management
 * - Performance monitoring
 */

export const securityMonitoringRouter = createTRPCRouter({
  // Generate compliance report
  generateComplianceReport: adminProcedure
    .input(
      z.object({
        endDate: z.date(),
        householdId: z.uuid().optional(),
        startDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Generate comprehensive compliance report
      const [
        auditSummary,
        dataAccessSummary,
        securityEventSummary,
        performanceSummary,
      ] = await Promise.all([
        // Audit activity summary
        db
          .select({
            action: auditLogs.action,
            count: count(),
            resourceType: auditLogs.resourceType,
            successRate: sql<number>`(count(*) filter (where success)) * 100.0 / count(*)`,
          })
          .from(auditLogs)
          .where(
            and(
              gte(auditLogs.createdAt, input.startDate),
              sql`${auditLogs.createdAt} <= ${input.endDate}`,
              input.householdId
                ? eq(auditLogs.householdId, input.householdId)
                : sql`true`,
            ),
          )
          .groupBy(auditLogs.action, auditLogs.resourceType),

        // Data access summary
        db
          .select({
            accessType: dataAccessLogs.accessType,
            count: count(),
            dataType: dataAccessLogs.dataType,
            uniqueUsers: sql<number>`count(distinct user_id)`,
          })
          .from(dataAccessLogs)
          .where(
            and(
              gte(dataAccessLogs.createdAt, input.startDate),
              sql`${dataAccessLogs.createdAt} <= ${input.endDate}`,
              input.householdId
                ? eq(dataAccessLogs.householdId, input.householdId)
                : sql`true`,
            ),
          )
          .groupBy(dataAccessLogs.dataType, dataAccessLogs.accessType),

        // Security events summary
        db
          .select({
            count: count(),
            eventType: securityEvents.eventType,
            resolvedCount: sql<number>`count(*) filter (where resolved)`,
            severity: securityEvents.severity,
          })
          .from(securityEvents)
          .where(
            and(
              gte(securityEvents.createdAt, input.startDate),
              sql`${securityEvents.createdAt} <= ${input.endDate}`,
            ),
          )
          .groupBy(securityEvents.eventType, securityEvents.severity),

        // Performance summary
        db
          .select({
            avgDuration: sql<number>`avg(duration)`,
            endpoint: performanceMetrics.endpoint,
            errorRate: sql<number>`(count(*) filter (where not success)) * 100.0 / count(*)`,
            maxDuration: sql<number>`max(duration)`,
            requestCount: count(),
          })
          .from(performanceMetrics)
          .where(
            and(
              gte(performanceMetrics.createdAt, input.startDate),
              sql`${performanceMetrics.createdAt} <= ${input.endDate}`,
            ),
          )
          .groupBy(performanceMetrics.endpoint),
      ]);

      return {
        auditActivity: auditSummary,
        dataAccess: dataAccessSummary,
        generatedAt: new Date(),
        generatedBy: ctx.dbUser.id,
        performance: performanceSummary,
        reportPeriod: {
          endDate: input.endDate,
          householdId: input.householdId,
          startDate: input.startDate,
        },
        securityEvents: securityEventSummary,
      };
    }),

  // Get audit logs with filtering
  getAuditLogs: adminProcedure
    .input(
      z.object({
        action: z
          .enum([
            "CREATE",
            "READ",
            "UPDATE",
            "DELETE",
            "BULK_CREATE",
            "BULK_UPDATE",
            "BULK_DELETE",
            "AUTHENTICATE",
            "AUTHORIZE",
            "IMPORT",
            "EXPORT",
          ])
          .optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        resourceType: z
          .enum([
            "USER",
            "HOUSEHOLD",
            "ANIMAL",
            "MEDICATION",
            "REGIMEN",
            "ADMINISTRATION",
            "SYSTEM",
          ])
          .optional(),
        startDate: z.date().optional(),
        success: z.boolean().optional(),
        userId: z.uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Apply filters
      const conditions = [];
      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }
      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input.resourceType) {
        conditions.push(eq(auditLogs.resourceType, input.resourceType));
      }
      if (input.success !== undefined) {
        conditions.push(eq(auditLogs.success, input.success));
      }
      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, input.startDate));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),
  // Get security dashboard overview
  getDashboard: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Security events summary
    const [
      recentSecurityEvents,
      criticalSecurityEvents,
      unresolvedSecurityEvents,
      rateLimitViolations,
      auditLogCount,
      performanceIssues,
    ] = await Promise.all([
      // Recent security events (last 24h)
      db
        .select({ count: count() })
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, last24Hours)),

      // Critical unresolved events
      db
        .select({ count: count() })
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.severity, "critical"),
            eq(securityEvents.resolved, false),
          ),
        ),

      // All unresolved events
      db
        .select({ count: count() })
        .from(securityEvents)
        .where(eq(securityEvents.resolved, false)),

      // Rate limit violations (last 24h)
      db
        .select({ count: count() })
        .from(rateLimitEvents)
        .where(
          and(
            gte(rateLimitEvents.createdAt, last24Hours),
            eq(rateLimitEvents.blocked, true),
          ),
        ),

      // Audit log entries (last 7 days)
      db
        .select({ count: count() })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, last7Days)),

      // Slow performance issues (last 24h)
      db
        .select({ count: count() })
        .from(performanceMetrics)
        .where(
          and(
            gte(performanceMetrics.createdAt, last24Hours),
            gte(performanceMetrics.duration, 1000), // >1 second
          ),
        ),
    ]);

    return {
      auditing: {
        entries7d: auditLogCount[0]?.count || 0,
      },
      lastUpdated: new Date(),
      performance: {
        slowRequests24h: performanceIssues[0]?.count || 0,
      },
      rateLimiting: {
        violations24h: rateLimitViolations[0]?.count || 0,
      },
      securityEvents: {
        criticalUnresolved: criticalSecurityEvents[0]?.count || 0,
        recent24h: recentSecurityEvents[0]?.count || 0,
        totalUnresolved: unresolvedSecurityEvents[0]?.count || 0,
      },
    };
  }),

  // Get data access logs for compliance
  getDataAccessLogs: adminProcedure
    .input(
      z.object({
        dataType: z.string().optional(),
        endDate: z.date().optional(),
        householdId: z.uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        startDate: z.date().optional(),
        userId: z.uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Apply filters
      const conditions = [];
      if (input.userId) {
        conditions.push(eq(dataAccessLogs.userId, input.userId));
      }
      if (input.dataType) {
        conditions.push(eq(dataAccessLogs.dataType, input.dataType));
      }
      if (input.householdId) {
        conditions.push(eq(dataAccessLogs.householdId, input.householdId));
      }
      if (input.startDate) {
        conditions.push(gte(dataAccessLogs.createdAt, input.startDate));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const accessLogs = await db
        .select()
        .from(dataAccessLogs)
        .where(whereClause)
        .orderBy(desc(dataAccessLogs.createdAt))
        .limit(input.limit);

      return accessLogs;
    }),

  // Get performance metrics
  getPerformanceMetrics: adminProcedure
    .input(
      z.object({
        endDate: z.date().optional(),
        endpoint: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        minDuration: z.number().min(0).default(0),
        startDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Apply filters
      const conditions = [];
      if (input.endpoint) {
        conditions.push(eq(performanceMetrics.endpoint, input.endpoint));
      }
      if (input.minDuration > 0) {
        conditions.push(gte(performanceMetrics.duration, input.minDuration));
      }
      if (input.startDate) {
        conditions.push(gte(performanceMetrics.createdAt, input.startDate));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const metrics = await db
        .select()
        .from(performanceMetrics)
        .where(whereClause)
        .orderBy(desc(performanceMetrics.duration))
        .limit(input.limit);

      return metrics;
    }),

  // Get rate limiting status
  getRateLimitStatus: protectedProcedure
    .input(
      z.object({
        path: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clientIp = ctx.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

      return getRateLimitStatus(
        input.path,
        ctx.dbUser.id,
        clientIp,
        ctx.headers.get("x-session-id") || undefined,
      );
    }),

  // Get rate limit violations
  getRateLimitViolations: adminProcedure
    .input(
      z.object({
        blocked: z.boolean().optional(),
        clientIp: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        limitType: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Apply filters
      const conditions = [];
      if (input.clientIp) {
        conditions.push(eq(rateLimitEvents.clientIp, input.clientIp));
      }
      if (input.blocked !== undefined) {
        conditions.push(eq(rateLimitEvents.blocked, input.blocked));
      }
      if (input.limitType) {
        conditions.push(eq(rateLimitEvents.limitType, input.limitType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const violations = await db
        .select()
        .from(rateLimitEvents)
        .where(whereClause)
        .orderBy(desc(rateLimitEvents.createdAt))
        .limit(input.limit);

      return violations;
    }),

  // Get recent security events
  getSecurityEvents: adminProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        resolved: z.boolean().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      // Apply filters
      const conditions = [];
      if (input.severity) {
        conditions.push(eq(securityEvents.severity, input.severity));
      }
      if (input.resolved !== undefined) {
        conditions.push(eq(securityEvents.resolved, input.resolved));
      }
      if (input.eventType) {
        conditions.push(eq(securityEvents.eventType, input.eventType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const events = await db
        .select()
        .from(securityEvents)
        .where(whereClause)
        .orderBy(desc(securityEvents.createdAt))
        .limit(input.limit);

      return events;
    }),

  // Resolve security event
  resolveSecurityEvent: adminProcedure
    .input(
      z.object({
        eventId: z.uuid(),
        resolutionNotes: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await EnhancedAuditLogger.resolveSecurityEvent(
        input.eventId,
        ctx.dbUser.id,
        input.resolutionNotes,
      );

      // Log the resolution action
      await EnhancedAuditLogger.logAuditEvent({
        action: "UPDATE",
        metadata: {
          action: "resolve_security_event",
          resolutionNotes: input.resolutionNotes,
        },
        resourceId: input.eventId,
        resourceType: "SYSTEM",
        success: true,
        userId: ctx.dbUser.id,
      });

      return { success: true };
    }),
});
