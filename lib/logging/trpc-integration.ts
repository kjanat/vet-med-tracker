import { TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";
import {
  type AuditEventType,
  AuditSeverity,
  auditLog,
  auditLogger,
} from "./audit-logger";
import { logger } from "./logger";
import {
  createTRPCLoggingMiddleware,
  getTRPCLoggingContext,
} from "./trpc-middleware";

/**
 * Enhanced tRPC middleware that integrates with existing Stack Auth context
 */
export const enhancedLoggingMiddleware = createTRPCLoggingMiddleware({
  logRequests: true,
  logResponses: process.env.NODE_ENV === "development",
  logErrors: true,
  logPerformance: true,
  excludePaths: ["/health", "/ping"],
  maxPayloadSize: 2000,
});

/**
 * Middleware specifically for tRPC procedures that need audit logging
 */
export const auditMiddleware = async ({
  ctx,
  next,
  path,
  input,
}: {
  ctx: Context;
  next: () => Promise<{ data: unknown; ctx: Context }>;
  path: string;
  input: unknown;
}) => {
  // Create logging context with user information from Stack Auth
  const loggingContext = await logger.createContext(`trpc.${path}`, {
    trpc: true,
    path,
    userId: ctx.dbUser?.id,
    householdId: ctx.currentHouseholdId,
  });

  // Update context with user info
  if (ctx.dbUser?.id) {
    logger.updateContext(loggingContext.correlationId, {
      userId: ctx.dbUser.id,
    });
  }

  if (ctx.currentHouseholdId) {
    logger.updateContext(loggingContext.correlationId, {
      householdId: ctx.currentHouseholdId,
    });
  }

  try {
    const result = await next();

    // Log successful completion for audit-worthy operations
    if (isAuditWorthyPath(path)) {
      await logger.info(
        `Audit-worthy operation completed: ${path}`,
        {
          userId: ctx.dbUser?.id,
          householdId: ctx.currentHouseholdId,
          input: sanitizeAuditInput(input),
        },
        loggingContext.correlationId,
      );
    }

    return result;
  } catch (error) {
    // Enhanced error logging with context
    await logger.error(
      `tRPC procedure failed: ${path}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: ctx.dbUser?.id,
        householdId: ctx.currentHouseholdId,
        membershipRole: ctx.currentMembership?.role,
        input: sanitizeAuditInput(input),
      },
      loggingContext.correlationId,
    );

    throw error;
  } finally {
    logger.cleanupContext(loggingContext.correlationId);
  }
};

/**
 * Helper to determine if a tRPC path requires audit logging
 */
function isAuditWorthyPath(path: string): boolean {
  const auditWorthyPaths = [
    "admin.recordAdministration",
    "admin.correctAdministration",
    "admin.deleteAdministration",
    "regimens.create",
    "regimens.update",
    "regimens.delete",
    "animals.create",
    "animals.update",
    "animals.delete",
    "households.create",
    "households.update",
    "households.delete",
    "households.addMember",
    "households.removeMember",
    "households.updateMemberRole",
    "inventory.create",
    "inventory.update",
    "inventory.delete",
    "inventory.assign",
    "user.update",
    "user.delete",
  ];

  return auditWorthyPaths.some((auditPath) => path.includes(auditPath));
}

/**
 * Sanitize input for audit logging (remove sensitive data)
 */
function sanitizeAuditInput(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const sanitized = { ...(input as Record<string, unknown>) };

  // Remove or mask sensitive fields
  const sensitiveFields = ["password", "token", "secret", "key"];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "***";
    }
  }

  return sanitized;
}

/**
 * Utility functions for common tRPC + audit logging patterns
 */
export const trpcAudit = {
  /**
   * Log medication administration with audit trail
   */
  async logMedicationAdministration(
    ctx: Context,
    animalId: string,
    regimenId: string,
    administrationId: string,
    isHighRisk: boolean = false,
    correlationId?: string,
  ): Promise<void> {
    if (!ctx.dbUser?.id || !ctx.currentHouseholdId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User context required for audit logging",
      });
    }

    await auditLog.medicationGiven(
      ctx.dbUser.id,
      ctx.currentHouseholdId,
      animalId,
      regimenId,
      administrationId,
      isHighRisk,
      {
        membershipRole: ctx.currentMembership?.role,
      },
      correlationId,
    );
  },

  /**
   * Log data changes with before/after values
   */
  async logDataChange(
    ctx: Context,
    eventType: AuditEventType,
    targetId: string,
    targetType: string,
    previousValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    if (!ctx.dbUser?.id || !ctx.currentHouseholdId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User context required for audit logging",
      });
    }

    // Log the data change event using the generic audit logger
    await auditLogger.logEvent(
      {
        eventType,
        severity: AuditSeverity.MEDIUM, // Will be overridden by SEVERITY_MAP in logEvent
        userId: ctx.dbUser.id,
        householdId: ctx.currentHouseholdId,
        targetId,
        targetType,
        metadata: {
          previousValues,
          newValues,
          reason,
        },
      },
      correlationId,
    );
  },

  /**
   * Log security events from tRPC context
   */
  async logSecurityEvent(
    ctx: Context,
    _eventType: AuditEventType,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const userAgent = ctx.headers.get("user-agent") || undefined;
    const ipAddress =
      ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      ctx.headers.get("x-real-ip") ||
      "unknown";

    await auditLog.unauthorizedAccess(
      ctx.dbUser?.id,
      ctx.currentHouseholdId || undefined,
      ipAddress,
      userAgent || "unknown",
      metadata,
      correlationId,
    );
  },

  /**
   * Log permission denied events
   */
  async logPermissionDenied(
    ctx: Context,
    resource: string,
    action: string,
    correlationId?: string,
  ): Promise<void> {
    if (!ctx.dbUser?.id || !ctx.currentHouseholdId) {
      return; // Can't audit without user context
    }

    await auditLog.permissionDenied(
      ctx.dbUser.id,
      ctx.currentHouseholdId,
      resource,
      action,
      correlationId,
    );
  },

  /**
   * Create logging context from tRPC context
   */
  async createContextFromTRPC(
    ctx: Context,
    operation: string,
  ): Promise<string> {
    const loggingContext = await getTRPCLoggingContext(
      {
        auth: ctx.stackUser?.id ? { userId: ctx.stackUser.id } : undefined,
        householdId: ctx.currentHouseholdId || undefined,
        loggingContext: undefined,
      },
      operation,
    );
    return loggingContext.correlationId;
  },
};

/**
 * Database operation logger for tRPC procedures
 */
export const trpcDb = {
  /**
   * Log database operations with performance tracking
   */
  async logOperation<T>(
    ctx: Context,
    operation: string,
    tableName: string,
    fn: () => Promise<T>,
    correlationId?: string,
  ): Promise<T> {
    const loggingContext = await getTRPCLoggingContext(
      {
        auth: ctx.stackUser?.id ? { userId: ctx.stackUser.id } : undefined,
        householdId: ctx.currentHouseholdId || undefined,
        loggingContext: undefined,
      },
      `db.${operation}.${tableName}`,
    );
    const finalCorrelationId = correlationId || loggingContext.correlationId;

    return logger.trackOperation(
      `db.${operation}.${tableName}`,
      async () => {
        const result = await fn();

        // Log additional context for database operations
        await logger.debug(
          `Database ${operation} completed`,
          {
            table: tableName,
            operation,
            userId: ctx.dbUser?.id,
            householdId: ctx.currentHouseholdId,
            hasResult: result !== null && result !== undefined,
            resultType: Array.isArray(result) ? "array" : typeof result,
            resultCount: Array.isArray(result) ? result.length : undefined,
          },
          finalCorrelationId,
        );

        return result;
      },
      finalCorrelationId,
    );
  },

  /**
   * Log queries with parameter sanitization
   */
  async logQuery<T>(
    ctx: Context,
    queryName: string,
    parameters: Record<string, unknown>,
    fn: () => Promise<T>,
    correlationId?: string,
  ): Promise<T> {
    const loggingContext = await getTRPCLoggingContext(
      {
        auth: ctx.stackUser?.id ? { userId: ctx.stackUser.id } : undefined,
        householdId: ctx.currentHouseholdId || undefined,
        loggingContext: undefined,
      },
      `query.${queryName}`,
    );
    const finalCorrelationId = correlationId || loggingContext.correlationId;

    return logger.trackOperation(
      `query.${queryName}`,
      async () => {
        await logger.debug(
          `Executing query: ${queryName}`,
          {
            parameters: sanitizeAuditInput(parameters),
            userId: ctx.dbUser?.id,
            householdId: ctx.currentHouseholdId,
          },
          finalCorrelationId,
        );

        const result = await fn();

        await logger.debug(
          `Query completed: ${queryName}`,
          {
            hasResult: result !== null && result !== undefined,
            resultType: Array.isArray(result) ? "array" : typeof result,
            resultCount: Array.isArray(result) ? result.length : undefined,
          },
          finalCorrelationId,
        );

        return result;
      },
      finalCorrelationId,
    );
  },
};

/**
 * Helper to add correlation ID to tRPC error responses
 */
export function enhanceTRPCError(
  error: TRPCError,
  correlationId: string,
): TRPCError {
  // Add correlation ID to error data
  const enhancedError = new TRPCError({
    ...error,
    message: error.message,
    cause: error.cause,
  });

  // Add correlation ID to error for debugging
  (enhancedError as TRPCError & { correlationId?: string }).correlationId =
    correlationId;

  return enhancedError;
}

/**
 * Middleware factory for specific router logging needs
 */
export function createRouterLoggingMiddleware(_routerName: string) {
  return createTRPCLoggingMiddleware({
    logRequests: true,
    logResponses: false,
    logErrors: true,
    logPerformance: true,
    excludePaths: [],
    maxPayloadSize: 1500,
    sensitiveInputs: ["password", "token", "secret", "email"],
  });
}
