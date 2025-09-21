import { db } from "@/db/drizzle";
import { auditLogs } from "@/db/schema";
import { logger } from "@/lib/logging/logger";

type ActionType =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "BULK_CREATE"
  | "BULK_UPDATE"
  | "BULK_DELETE"
  | "AUTHENTICATE"
  | "AUTHORIZE"
  | "IMPORT"
  | "EXPORT";

type ResourceType =
  | "USER"
  | "HOUSEHOLD"
  | "ANIMAL"
  | "MEDICATION"
  | "REGIMEN"
  | "ADMINISTRATION"
  | "SYSTEM";

export interface AuditEntry {
  id?: string;
  userId?: string;
  sessionId?: string;
  action: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  endpoint?: string;
}

/**
 * Formats a concise audit log message
 */
function formatAuditLogMessage(entry: AuditEntry): string {
  const resource = `${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ""}`;
  const user: string = entry.userId ?? "unknown";
  const outcome = entry.success ? "SUCCESS" : "FAILED";
  return `Audit: ${entry.action} ${resource} by user ${user} - ${outcome}`;
}

/**
 * Logs an audit event to the database and system logs
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    // Store in audit log table
    await db.insert(auditLogs).values({
      action: entry.action,
      clientIp: entry.clientIp,
      duration: entry.duration,
      endpoint: entry.endpoint,
      errorMessage: entry.errorMessage,
      // Map householdId from metadata if available
      householdId: (entry.metadata?.householdId as string) || undefined,
      metadata: entry.metadata,
      resourceId: entry.resourceId,
      resourceType: entry.resourceType,
      sessionId: entry.sessionId,
      success: entry.success,
      userAgent: entry.userAgent,
      userId: entry.userId,
    });

    const logMessage: string = formatAuditLogMessage(entry);

    // Shared payload for both success and failure
    const basePayload = {
      action: entry.action,
      audit: true,
      duration: entry.duration,
      endpoint: entry.endpoint,
      resourceId: entry.resourceId,
      resourceType: entry.resourceType,
      sessionId: entry.sessionId,
      userId: entry.userId,
    } as const;

    const payload = entry.success
      ? basePayload
      : { ...basePayload, error: entry.errorMessage };

    if (entry.success) {
      await logger.info(logMessage, payload);
    } else {
      await logger.warn(logMessage, payload);
    }
  } catch (error) {
    // Never throw from audit logging - just log the failure
    await logger.warn("Failed to log audit event", {
      error: error instanceof Error ? error.message : "Unknown error",
      originalEntry: entry,
    });
  }
}

/**
 * Creates an audit entry for successful operations
 */
export function createSuccessAudit(
  userId: string | undefined,
  action: ActionType,
  resourceType: ResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): AuditEntry {
  return {
    action,
    metadata,
    resourceId,
    resourceType,
    success: true,
    timestamp: new Date(),
    userId,
  };
}

/**
 * Creates an audit entry for failed operations
 */
export function createFailureAudit(
  userId: string | undefined,
  action: ActionType,
  resourceType: ResourceType,
  error: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): AuditEntry {
  return {
    action,
    errorMessage: error,
    metadata,
    resourceId,
    resourceType,
    success: false,
    timestamp: new Date(),
    userId,
  };
}

/**
 * Convenience function for database operations
 */
export async function auditDatabaseOperation(
  userId: string | undefined,
  action: ActionType,
  resourceType: ResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: AuditEntry = createSuccessAudit(
    userId,
    action,
    resourceType,
    resourceId,
    metadata,
  );
  await logAuditEvent(entry);
}

/**
 * Convenience function for failed operations
 */
export async function auditFailedOperation(
  userId: string | undefined,
  action: ActionType,
  resourceType: ResourceType,
  error: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: AuditEntry = createFailureAudit(
    userId,
    action,
    resourceType,
    error,
    resourceId,
    metadata,
  );
  await logAuditEvent(entry);
}

/**
 * Enhanced audit logging for authentication events
 */
export async function auditAuthEvent(
  action: "LOGIN" | "LOGOUT" | "FAILED_LOGIN",
  userId?: string,
  clientIp?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: AuditEntry = {
    action: "AUTHENTICATE",
    clientIp,
    metadata: {
      ...metadata,
      authAction: action,
    },
    resourceId: userId,
    resourceType: "USER",
    success: action !== "FAILED_LOGIN",
    timestamp: new Date(),
    userAgent,
    userId,
  };

  await logAuditEvent(entry);
}

/**
 * Audit logging for household operations
 */
export async function auditHouseholdOperation(
  userId: string | undefined,
  action: ActionType,
  householdId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await auditDatabaseOperation(
    userId,
    action,
    "HOUSEHOLD",
    householdId,
    metadata,
  );
}

/**
 * Audit logging for medication operations
 */
export async function auditMedicationOperation(
  userId: string | undefined,
  action: ActionType,
  medicationId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await auditDatabaseOperation(
    userId,
    action,
    "MEDICATION",
    medicationId,
    metadata,
  );
}

/**
 * Audit logging for administration recording
 */
export async function auditAdministrationRecord(
  userId: string | undefined,
  administrationId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await auditDatabaseOperation(
    userId,
    "CREATE",
    "ADMINISTRATION",
    administrationId,
    metadata,
  );
}

/**
 * Audit logging for bulk operations
 */
export async function auditBulkOperation(
  userId: string | undefined,
  action: "BULK_CREATE" | "BULK_UPDATE" | "BULK_DELETE",
  resourceType: ResourceType,
  affectedCount: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry = createSuccessAudit(userId, action, resourceType, undefined, {
    ...metadata,
    affectedCount,
  });
  await logAuditEvent(entry);
}

/**
 * Audit logging for system events
 */
export async function auditSystemEvent(
  action: ActionType,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: AuditEntry = {
    action,
    metadata: { ...metadata, description },
    resourceType: "SYSTEM",
    success: true,
    timestamp: new Date(),
  };
  await logAuditEvent(entry);
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  resourceType?: ResourceType;
  action?: ActionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<AuditEntry[]> {
  try {
    const { and, eq, gte, lte, desc } = await import("drizzle-orm");

    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const query = db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 100)
      .offset(filters.offset || 0);

    const results = await query;

    return results.map((row) => ({
      action: row.action as ActionType,
      clientIp: row.clientIp || undefined,
      duration: row.duration || undefined,
      endpoint: row.endpoint || undefined,
      errorMessage: row.errorMessage || undefined,
      id: row.id,
      metadata: (row.metadata as Record<string, unknown>) || undefined,
      resourceId: row.resourceId || undefined,
      resourceType: row.resourceType as ResourceType,
      sessionId: row.sessionId || undefined,
      success: row.success,
      timestamp: row.createdAt,
      userAgent: row.userAgent || undefined,
      userId: row.userId || undefined,
    }));
  } catch (error) {
    await logger.warn("Failed to query audit logs", {
      error: error instanceof Error ? error.message : "Unknown error",
      filters,
    });
    return [];
  }
}

/**
 * Performance monitoring data structure
 */
interface PerformanceMetrics {
  endpoint: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  success: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Log performance metrics for monitoring
 */
export async function logPerformanceMetrics(
  metrics: PerformanceMetrics,
): Promise<void> {
  try {
    await logger.info("Performance Metrics", {
      cpuUsage: metrics.cpuUsage,
      duration: metrics.duration,
      endpoint: metrics.endpoint,
      memoryUsage: metrics.memoryUsage,
      success: metrics.success,
      userId: metrics.userId,
    });

    // Store critical performance data in audit log for slow operations
    if (metrics.duration > 1000) {
      await logAuditEvent({
        action: "READ",
        endpoint: metrics.endpoint,
        metadata: {
          cpuUsage: metrics.cpuUsage,
          duration: metrics.duration,
          memoryUsage: metrics.memoryUsage,
          performanceWarning: "Slow operation detected",
        },
        resourceType: "SYSTEM",
        success: true,
        timestamp: metrics.timestamp,
        userId: metrics.userId,
      });
    }
  } catch (error) {
    await logger.warn("Failed to log performance metrics", {
      error: error instanceof Error ? error.message : "Unknown error",
      metrics,
    });
  }
}

/**
 * Security event types
 */
export const SecurityEvents = {
  MULTIPLE_FAILED_LOGINS: "MULTIPLE_FAILED_LOGINS",
  PRIVILEGE_ESCALATION: "PRIVILEGE_ESCALATION",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  UNUSUAL_ACCESS_PATTERN: "UNUSUAL_ACCESS_PATTERN",
} as const;

export type SecurityEventType =
  (typeof SecurityEvents)[keyof typeof SecurityEvents];

/**
 * tRPC audit middleware configuration
 */
interface AuditMiddlewareContext {
  dbUser?: { id: string };
  [key: string]: unknown;
}

interface AuditMiddlewareOptions {
  ctx: AuditMiddlewareContext;
  next: () => Promise<unknown>;
  path: string;
  type: string;
}

/**
 * Audit middleware for tRPC
 */
export function createAuditMiddleware(): (
  opts: AuditMiddlewareOptions,
) => Promise<unknown> {
  return async function auditMiddleware(
    opts: AuditMiddlewareOptions,
  ): Promise<unknown> {
    const { ctx, next, path, type } = opts;
    const startTime = Date.now();
    const userId = ctx.dbUser?.id;

    // Map tRPC call type to a valid ActionType
    const actionMap: Record<string, ActionType> = {
      mutation: "UPDATE",
      query: "READ",
      subscription: "READ",
    };
    const action = actionMap[type] ?? "READ";

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      await logAuditEvent({
        action,
        duration,
        endpoint: `${type}.${path}`,
        resourceType: "SYSTEM",
        success: true,
        timestamp: new Date(),
        userId,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await logAuditEvent({
        action,
        duration,
        endpoint: `${type}.${path}`,
        errorMessage,
        resourceType: "SYSTEM",
        success: false,
        timestamp: new Date(),
        userId,
      });

      throw error;
    }
  };
}

/**
 * Audit helpers for common security logging patterns
 */
export const auditHelpers = {
  async logDataAccess(
    action: string,
    userId: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await logger.info(`Data access: ${action}`, {
      action,
      metadata,
      resourceId,
      resourceType,
      userId,
    });
  },

  async logThreat(
    threatType: string,
    severity: "low" | "medium" | "high",
    clientIp?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await logger.warn(`Security threat detected: ${threatType}`, {
      clientIp,
      metadata,
      severity,
      threatType,
      userId,
    });
  },

  async logValidationFailure(
    fileName: string,
    validationType: string,
    clientIp?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await logger.warn(`Validation failure: ${validationType}`, {
      clientIp,
      fileName,
      metadata,
      userId,
      validationType,
    });
  },
};
