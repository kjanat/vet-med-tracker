export interface AuditLogEntry {
  id?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // In a real implementation, this would save to database
    console.log("Audit log:", logEntry);
  }

  static async logUserAction(
    userId: string,
    action: string,
    resource: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await AuditLogger.log({
      action,
      details,
      resource,
      userId,
    });
  }

  static async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
  ): Promise<void> {
    await AuditLogger.log({
      action: "READ",
      resource,
      resourceId,
      userId,
    });
  }
}

// Export aliases for tRPC compatibility
interface TRPCAuditEvent {
  action: string;
  endpoint: string;
  resourceType: string;
  success: boolean;
  timestamp: Date;
  userId?: string;
  duration?: number;
  errorMessage?: string;
}

export async function logAuditEvent(event: TRPCAuditEvent): Promise<void> {
  console.log("[AUDIT]", {
    action: event.action,
    duration: event.duration,
    endpoint: event.endpoint,
    error: event.errorMessage,
    success: event.success,
    timestamp: event.timestamp.toISOString(),
    userId: event.userId,
  });
}

export const auditHelpers = {
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
  ): Promise<void> {
    console.log("[DATA_ACCESS]", {
      metadata,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
      userId,
    });
  },
  async logThreat(
    type: string,
    severity: string,
    clientIp?: string,
    userId?: string,
    metadata?: any,
  ): Promise<void> {
    console.log("[SECURITY]", {
      clientIp,
      metadata,
      severity,
      timestamp: new Date().toISOString(),
      type,
      userId,
    });
  },

  async logValidationFailure(
    type: string,
    details: any,
    clientIp?: string,
    userId?: string,
  ): Promise<void> {
    console.log("[VALIDATION_FAILURE]", {
      clientIp,
      details,
      timestamp: new Date().toISOString(),
      type,
      userId,
    });
  },
};
