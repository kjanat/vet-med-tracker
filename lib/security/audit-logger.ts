/**
 * Security Audit Logger
 * Comprehensive audit logging for security events and compliance
 */

export interface AuditEvent {
  // Event identification
  id: string;
  timestamp: string;
  type: "security" | "auth" | "data" | "admin" | "error";

  // Event details
  action: string;
  resource?: string;
  outcome: "success" | "failure" | "blocked";

  // User context
  userId?: string;
  sessionId?: string;
  userAgent?: string;

  // Network context
  clientIp?: string;
  country?: string;

  // Request context
  method?: string;
  path?: string;
  query?: Record<string, unknown>;

  // Security context
  riskScore?: number;
  threatIndicators?: string[];

  // Additional context
  metadata?: Record<string, unknown>;
  error?: string;

  // Compliance fields
  severity: "low" | "medium" | "high" | "critical";
  category: string;
}

export interface AuditLogger {
  log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void>;

  logAuth(action: string, context: AuthContext): Promise<void>;

  logDataAccess(action: string, context: DataAccessContext): Promise<void>;

  logSecurityEvent(action: string, context: SecurityContext): Promise<void>;

  query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
}

export interface AuthContext {
  userId?: string;
  outcome: "success" | "failure" | "blocked";
  clientIp?: string;
  userAgent?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}

export interface DataAccessContext {
  userId: string;
  resource: string;
  action: string;
  outcome: "success" | "failure" | "blocked";
  householdId?: string;
  animalId?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityContext {
  threatType: string;
  severity: "low" | "medium" | "high" | "critical";
  clientIp?: string;
  userId?: string;
  outcome: "detected" | "blocked" | "mitigated";
  details?: Record<string, unknown>;
}

export interface AuditQueryFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  type?: string[];
  severity?: string[];
  outcome?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Console-based audit logger for development and basic production use
 */
class ConsoleAuditLogger implements AuditLogger {
  async log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    // In production, this would go to a secure audit log system
    if (process.env.NODE_ENV === "production") {
      // Log to structured format for log aggregation systems
      console.log(
        JSON.stringify({
          event: auditEvent,
          level: "audit",
          service: "vetmed-tracker",
        }),
      );
    } else {
      // More readable format for development
      console.log(
        `[AUDIT] ${auditEvent.timestamp} - ${auditEvent.action} (${auditEvent.outcome})`,
        {
          clientIp: auditEvent.clientIp,
          id: auditEvent.id,
          metadata: auditEvent.metadata,
          severity: auditEvent.severity,
          type: auditEvent.type,
          userId: auditEvent.userId,
        },
      );
    }

    // In a production environment, you would also:
    // 1. Send to external audit logging service (e.g., AWS CloudTrail, Datadog)
    // 2. Store in immutable database
    // 3. Send alerts for high-severity events
    // 4. Implement log rotation and retention policies
  }

  async logAuth(action: string, context: AuthContext): Promise<void> {
    await this.log({
      action,
      category: "authentication",
      clientIp: context.clientIp,
      metadata: context.metadata,
      method: context.method,
      outcome: context.outcome,
      severity: context.outcome === "failure" ? "medium" : "low",
      type: "auth",
      userAgent: context.userAgent,
      userId: context.userId,
    });
  }

  async logDataAccess(
    action: string,
    context: DataAccessContext,
  ): Promise<void> {
    await this.log({
      action,
      category: "data_access",
      metadata: {
        animalId: context.animalId,
        householdId: context.householdId,
        ...context.metadata,
      },
      outcome: context.outcome,
      resource: context.resource,
      severity: context.outcome === "failure" ? "medium" : "low",
      type: "data",
      userId: context.userId,
    });
  }

  async logSecurityEvent(
    action: string,
    context: SecurityContext,
  ): Promise<void> {
    await this.log({
      action,
      category: "security_threat",
      clientIp: context.clientIp,
      metadata: context.details,
      outcome: context.outcome as "success" | "failure",
      severity: context.severity,
      threatIndicators: [context.threatType],
      type: "security",
      userId: context.userId,
    });
  }

  async query(_filters: AuditQueryFilters): Promise<AuditEvent[]> {
    // In a real implementation, this would query the audit database
    console.warn("Audit query not implemented in console logger");
    return [];
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Global audit logger instance
export const auditLogger: AuditLogger = new ConsoleAuditLogger();

/**
 * Security event types and helpers
 */
export const SecurityEvents = {
  // Authorization events
  ACCESS_DENIED: "access_denied",
  ACCOUNT_LOCKED: "account_locked",
  CONFIGURATION_CHANGED: "configuration_changed",
  CSRF_ATTEMPT: "csrf_attempt",

  // Data events
  DATA_CREATED: "data_created",
  DATA_DELETED: "data_deleted",
  DATA_EXPORTED: "data_exported",
  DATA_READ: "data_read",
  DATA_UPDATED: "data_updated",
  ERROR_THRESHOLD_EXCEEDED: "error_threshold_exceeded",
  HOUSEHOLD_CREATED: "household_created",
  HOUSEHOLD_UPDATED: "household_updated",
  LOGIN_FAILURE: "login_failure",
  // Authentication events
  LOGIN_SUCCESS: "login_success",
  LOGOUT: "logout",
  MALICIOUS_INPUT_DETECTED: "malicious_input_detected",
  PRIVILEGE_ESCALATION_ATTEMPT: "privilege_escalation_attempt",

  // Security threats
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  ROLE_CHANGED: "role_changed",

  // System events
  SERVICE_STARTED: "service_started",
  SERVICE_STOPPED: "service_stopped",
  SESSION_EXPIRED: "session_expired",
  SQL_INJECTION_ATTEMPT: "sql_injection_attempt",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  UNAUTHORIZED_RESOURCE_ACCESS: "unauthorized_resource_access",

  // Admin events
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  USER_UPDATED: "user_updated",
  XSS_ATTEMPT: "xss_attempt",
} as const;

/**
 * Helper functions for common audit scenarios
 */
export const auditHelpers = {
  // Log data access events
  async logDataAccess(
    action: string,
    userId: string,
    resource: string,
    success: boolean,
    metadata?: Record<string, unknown>,
  ) {
    await auditLogger.logDataAccess(action, {
      action,
      metadata,
      outcome: success ? "success" : "failure",
      resource,
      userId,
    });
  },
  // Log authentication events
  async logLogin(
    userId: string,
    clientIp: string,
    success: boolean,
    userAgent?: string,
  ) {
    await auditLogger.logAuth(
      success ? SecurityEvents.LOGIN_SUCCESS : SecurityEvents.LOGIN_FAILURE,
      {
        clientIp,
        method: "POST",
        outcome: success ? "success" : "failure",
        userAgent,
        userId,
      },
    );
  },

  // Log privilege escalation attempts
  async logPrivilegeEscalation(
    userId: string,
    attemptedAction: string,
    requiredRole: string,
    currentRole: string,
    clientIp?: string,
  ) {
    await auditLogger.logSecurityEvent(
      SecurityEvents.PRIVILEGE_ESCALATION_ATTEMPT,
      {
        clientIp,
        details: {
          attemptedAction,
          currentRole,
          requiredRole,
        },
        outcome: "blocked",
        severity: "high",
        threatType: "privilege_escalation",
        userId,
      },
    );
  },

  // Log rate limiting events
  async logRateLimitExceeded(
    clientIp: string,
    endpoint: string,
    userId?: string,
  ) {
    await auditLogger.logSecurityEvent(SecurityEvents.RATE_LIMIT_EXCEEDED, {
      clientIp,
      details: { endpoint },
      outcome: "blocked",
      severity: "medium",
      threatType: "rate_limiting",
      userId,
    });
  },

  // Log security threats
  async logThreat(
    threatType: string,
    severity: "low" | "medium" | "high" | "critical",
    clientIp?: string,
    userId?: string,
    details?: Record<string, unknown>,
  ) {
    await auditLogger.logSecurityEvent(threatType, {
      clientIp,
      details,
      outcome: "detected",
      severity,
      threatType,
      userId,
    });
  },

  // Log input validation failures
  async logValidationFailure(
    input: string,
    validationType: string,
    clientIp?: string,
    userId?: string,
  ) {
    await auditLogger.logSecurityEvent(
      SecurityEvents.MALICIOUS_INPUT_DETECTED,
      {
        clientIp,
        details: {
          // Don't log the actual input to prevent log injection
          inputHash: Buffer.from(input).toString("base64").slice(0, 16),
          inputLength: input.length,
          validationType,
        },
        outcome: "blocked",
        severity: "high",
        threatType: validationType,
        userId,
      },
    );
  },
};

/**
 * Audit middleware for tRPC
 */
export function createAuditMiddleware() {
  // biome-ignore lint/suspicious/noExplicitAny: tRPC middleware requires any type for compatibility
  return async function auditMiddleware(opts: any) {
    const { ctx, next, path, type } = opts;
    const startTime = Date.now();
    const userId = ctx.dbUser?.id;
    const _clientIp = "unknown"; // Headers not available in this context

    try {
      const result = await next();

      // Log successful data access
      await auditLogger.logDataAccess(`trpc_${type}`, {
        action: type,
        householdId: ctx.currentHouseholdId ?? undefined,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
        outcome: "success",
        resource: path,
        userId: userId || "anonymous",
      });

      return result;
    } catch (error) {
      // Log failed data access
      await auditLogger.logDataAccess(`trpc_${type}`, {
        action: type,
        householdId: ctx.currentHouseholdId ?? undefined,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
        },
        outcome: "failure",
        resource: path,
        userId: userId || "anonymous",
      });

      throw error;
    }
  };
}
