import { and, eq, gte, lte } from "drizzle-orm";
import { dbPooled as db } from "@/db/drizzle";
import {
  auditLogs,
  dataAccessLogs,
  type InsertAuditLog,
  type InsertDataAccessLog,
  type InsertPerformanceMetric,
  type InsertSecurityEvent,
  performanceMetrics,
  securityEvents,
} from "@/db/schema/audit-schema";
import { logger } from "@/lib/logging/logger";
import { maskSensitiveData } from "@/lib/security/data-protection";

/**
 * Enhanced audit logging system with database persistence
 *
 * Features:
 * - Database-backed audit trails
 * - HIPAA-compliant logging
 * - Security event tracking
 * - Performance monitoring
 * - Rate limit tracking
 * - Data access logging
 */

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

export interface EnhancedAuditEntry {
  // User context
  userId?: string;
  sessionId?: string;
  stackUserId?: string;

  // Action details
  action: ActionType;
  resourceType: ResourceType;
  resourceId?: string;

  // Request context
  endpoint?: string;
  httpMethod?: string;
  clientIp?: string;
  userAgent?: string;

  // Outcome
  success: boolean;
  errorMessage?: string;
  duration?: number;

  // Metadata
  metadata?: Record<string, unknown>;

  // Performance metrics
  memoryUsage?: number;
  cpuUsage?: number;

  // Household context
  householdId?: string;

  // Compliance
  dataClassification?: "public" | "internal" | "confidential" | "phi";
}

/**
 * Enhanced audit logger with database persistence
 */
export class EnhancedAuditLogger {
  /**
   * Log audit event to database and console
   */
  static async logAuditEvent(entry: EnhancedAuditEntry): Promise<void> {
    try {
      // Prepare audit log entry
      const auditEntry: InsertAuditLog = {
        action: entry.action,
        clientIp: entry.clientIp,
        cpuUsage: entry.cpuUsage,
        dataClassification: entry.dataClassification || "internal",
        duration: entry.duration,
        endpoint: entry.endpoint,
        errorMessage: entry.errorMessage,
        hipaaLogged: entry.dataClassification === "phi",
        householdId: entry.householdId,
        httpMethod: entry.httpMethod,
        memoryUsage: entry.memoryUsage,
        metadata: entry.metadata ? maskSensitiveData(entry.metadata) : null,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        sessionId: entry.sessionId,
        stackUserId: entry.stackUserId,
        success: entry.success,
        userAgent: entry.userAgent,
        userId: entry.userId,
      };

      // Insert into database
      await db.insert(auditLogs).values(auditEntry);

      // Also log to console for immediate monitoring
      const logMessage = EnhancedAuditLogger.formatAuditLogMessage(entry);
      const basePayload = {
        action: entry.action,
        audit: true,
        duration: entry.duration,
        endpoint: entry.endpoint,
        hipaaLogged: auditEntry.hipaaLogged,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        sessionId: entry.sessionId,
        userId: entry.userId,
      };

      const payload = entry.success
        ? basePayload
        : { ...basePayload, error: entry.errorMessage };

      if (entry.success) {
        await logger.info(logMessage, payload);
      } else {
        await logger.warn(logMessage, payload);
      }
    } catch (error) {
      // Never throw from audit logging - log failure and continue
      await logger.error(
        "Failed to log audit event to database",
        error instanceof Error ? error : new Error(String(error)),
        {
          originalEntry: maskSensitiveData(entry),
        },
      );
    }
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    eventType: string,
    severity: "low" | "medium" | "high" | "critical",
    clientIp: string,
    userId?: string,
    metadata?: Record<string, unknown>,
    description?: string,
  ): Promise<void> {
    try {
      const securityEntry: InsertSecurityEvent = {
        clientIp,
        description,
        eventType,
        metadata: metadata ? maskSensitiveData(metadata) : null,
        severity,
        userAgent: metadata?.userAgent as string,
        userId,
      };

      await db.insert(securityEvents).values(securityEntry);

      // Log to console with high visibility
      const logLevel =
        severity === "critical" || severity === "high" ? "error" : "warn";
      const securityData = {
        clientIp,
        description,
        metadata: maskSensitiveData(metadata),
        severity,
        userId,
      };

      if (logLevel === "error") {
        await logger.error(
          `🚨 Security Event: ${eventType}`,
          new Error(description || eventType),
          securityData,
        );
      } else {
        await logger.warn(`Security Event: ${eventType}`, securityData);
      }

      // Consider sending alerts for high/critical events
      if (severity === "high" || severity === "critical") {
        await EnhancedAuditLogger.triggerSecurityAlert(
          eventType,
          severity,
          clientIp,
          userId,
          description,
        );
      }
    } catch (error) {
      await logger.error(
        "Failed to log security event",
        error instanceof Error ? error : new Error(String(error)),
        {
          clientIp,
          eventType,
          severity,
          userId,
        },
      );
    }
  }

  /**
   * Log data access for HIPAA compliance
   */
  static async logDataAccess(
    userId: string,
    dataType: string,
    accessType: string,
    clientIp: string,
    resourceId?: string,
    householdId?: string,
    animalId?: string,
    fieldsAccessed?: string[],
    purpose?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const dataAccessEntry: InsertDataAccessLog = {
        accessType,
        animalId,
        authorized: true, // Assume authorized if we're logging it
        clientIp,
        dataType,
        fieldsAccessed: fieldsAccessed || null,
        householdId,
        metadata: metadata ? maskSensitiveData(metadata) : null,
        purpose,
        referrer: metadata?.referrer as string,
        resourceId,
        userAgent: metadata?.userAgent as string,
        userId,
      };

      await db.insert(dataAccessLogs).values(dataAccessEntry);

      await logger.info(`Data access: ${dataType}`, {
        accessType,
        fieldsAccessed: fieldsAccessed?.length || 0,
        purpose,
        resourceId,
        userId,
      });
    } catch (error) {
      await logger.error(
        "Failed to log data access",
        error instanceof Error ? error : new Error(String(error)),
        {
          accessType,
          dataType,
          userId,
        },
      );
    }
  }

  /**
   * Log performance metrics
   */
  static async logPerformanceMetrics(
    endpoint: string,
    duration: number,
    success: boolean,
    userId?: string,
    clientIp?: string,
    httpMethod?: string,
    memoryUsage?: number,
    cpuUsage?: number,
    errorType?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const performanceEntry: InsertPerformanceMetric = {
        clientIp,
        cpuUsage,
        duration,
        endpoint,
        errorType,
        httpMethod,
        memoryUsage,
        metadata: metadata ? maskSensitiveData(metadata) : null,
        success,
        userId,
      };

      await db.insert(performanceMetrics).values(performanceEntry);

      // Log slow requests
      if (duration > 1000) {
        await logger.warn(`Slow request detected: ${endpoint}`, {
          duration,
          endpoint,
          success,
          userId,
        });
      }
    } catch (error) {
      await logger.error(
        "Failed to log performance metrics",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Query audit logs with filtering
   */
  static async queryAuditLogs(filters: {
    userId?: string;
    resourceType?: ResourceType;
    action?: ActionType;
    startDate?: Date;
    endDate?: Date;
    householdId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];

      // Apply filters
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }

      // Add more filters as needed...
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

      const query = db.select().from(auditLogs);
      return await (conditions.length > 0
        ? query.where(and(...conditions))
        : query
      )
        .limit(filters.limit || 100)
        .offset(filters.offset || 0)
        .orderBy(auditLogs.createdAt);
    } catch (error) {
      await logger.error(
        "Failed to query audit logs",
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }
  }
  /**
   * Resolve security event
   */
  static async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    resolutionNotes: string,
  ): Promise<void> {
    try {
      await db
        .update(securityEvents)
        .set({
          resolutionNotes,
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
        })
        .where(eq(securityEvents.id, eventId));

      await logger.info(`Security event resolved: ${eventId}`, {
        resolutionNotes,
        resolvedBy,
      });
    } catch (error) {
      await logger.error(
        "Failed to resolve security event",
        error instanceof Error ? error : new Error(String(error)),
        {
          eventId,
          resolvedBy,
        },
      );
    }
  }

  /**
   * Format audit log message
   */
  private static formatAuditLogMessage(entry: EnhancedAuditEntry): string {
    const resource = `${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId})` : ""}`;
    const user = entry.userId ?? "unknown";
    const outcome = entry.success ? "SUCCESS" : "FAILED";
    return `Audit: ${entry.action} ${resource} by user ${user} - ${outcome}`;
  }

  /**
   * Trigger security alert (placeholder for alert system integration)
   */
  private static async triggerSecurityAlert(
    eventType: string,
    severity: string,
    clientIp: string,
    userId?: string,
    description?: string,
  ): Promise<void> {
    // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
    await logger.error(
      `SECURITY ALERT: ${eventType}`,
      new Error(description || eventType),
      {
        clientIp,
        description,
        severity,
        timestamp: new Date().toISOString(),
        userId,
      },
    );

    // Mark alert as sent in the database
    try {
      // Update the most recent security event to mark alert as sent
      await db
        .update(securityEvents)
        .set({
          alertSent: true,
          alertSentAt: new Date(),
        })
        .where(eq(securityEvents.eventType, eventType));
    } catch (_error) {
      // Don't fail the audit process if alert marking fails
      await logger.warn("Failed to mark security alert as sent", {
        eventType,
      });
    }
  }
}

// Export convenience functions for backward compatibility
export const logAuditEvent =
  EnhancedAuditLogger.logAuditEvent.bind(EnhancedAuditLogger);
export const logSecurityEvent =
  EnhancedAuditLogger.logSecurityEvent.bind(EnhancedAuditLogger);
export const logDataAccess =
  EnhancedAuditLogger.logDataAccess.bind(EnhancedAuditLogger);
export const logPerformanceMetrics =
  EnhancedAuditLogger.logPerformanceMetrics.bind(EnhancedAuditLogger);

// Enhanced audit helpers
export const enhancedAuditHelpers = {
  async logDataAccess(
    action: string,
    userId: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await EnhancedAuditLogger.logDataAccess(
      userId,
      resourceType.toLowerCase(),
      action,
      (metadata?.clientIp as string) || "unknown",
      resourceId,
      metadata?.householdId as string,
      metadata?.animalId as string,
      metadata?.fieldsAccessed as string[],
      metadata?.purpose as string,
      metadata,
    );
  },

  async logThreat(
    threatType: string,
    severity: "low" | "medium" | "high" | "critical",
    clientIp?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await EnhancedAuditLogger.logSecurityEvent(
      threatType,
      severity,
      clientIp || "unknown",
      userId,
      metadata,
      `Security threat detected: ${threatType}`,
    );
  },

  async logValidationFailure(
    fileName: string,
    validationType: string,
    clientIp?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await EnhancedAuditLogger.logSecurityEvent(
      "validation_failure",
      "medium",
      clientIp || "unknown",
      userId,
      {
        ...metadata,
        fileName,
        validationType,
      },
      `Validation failure: ${validationType} for ${fileName}`,
    );
  },
};
