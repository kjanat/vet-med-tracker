import { LogLevel, logger } from "./logger";

/**
 * Audit event types for VetMed Tracker
 */
export enum AuditEventType {
  // Authentication & Authorization
  USER_LOGIN = "user.login",
  USER_LOGOUT = "user.logout",
  USER_REGISTER = "user.register",

  // User Management
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",

  // Household Management
  HOUSEHOLD_CREATED = "household.created",
  HOUSEHOLD_UPDATED = "household.updated",
  HOUSEHOLD_DELETED = "household.deleted",
  HOUSEHOLD_MEMBER_ADDED = "household.member.added",
  HOUSEHOLD_MEMBER_REMOVED = "household.member.removed",
  HOUSEHOLD_MEMBER_ROLE_CHANGED = "household.member.role_changed",

  // Animal Management
  ANIMAL_CREATED = "animal.created",
  ANIMAL_UPDATED = "animal.updated",
  ANIMAL_DELETED = "animal.deleted",

  // Medication Management
  REGIMEN_CREATED = "regimen.created",
  REGIMEN_UPDATED = "regimen.updated",
  REGIMEN_DELETED = "regimen.deleted",
  REGIMEN_COMPLETED = "regimen.completed",

  // Administration Events (Critical)
  MEDICATION_ADMINISTERED = "medication.administered",
  MEDICATION_MISSED = "medication.missed",
  MEDICATION_ADMINISTRATION_CORRECTED = "medication.administration.corrected",
  MEDICATION_ADMINISTRATION_DELETED = "medication.administration.deleted",

  // Inventory Management
  INVENTORY_ITEM_ADDED = "inventory.item.added",
  INVENTORY_ITEM_UPDATED = "inventory.item.updated",
  INVENTORY_ITEM_DELETED = "inventory.item.deleted",
  INVENTORY_ITEM_ASSIGNED = "inventory.item.assigned",
  INVENTORY_ITEM_UNASSIGNED = "inventory.item.unassigned",

  // High-Risk Events
  HIGH_RISK_MEDICATION_ADMINISTERED = "high_risk.medication.administered",
  CO_SIGN_REQUIRED = "co_sign.required",
  CO_SIGN_COMPLETED = "co_sign.completed",
  CO_SIGN_FAILED = "co_sign.failed",

  // Security Events
  UNAUTHORIZED_ACCESS_ATTEMPT = "security.unauthorized_access",
  PERMISSION_DENIED = "security.permission_denied",
  SUSPICIOUS_ACTIVITY = "security.suspicious_activity",

  // Data Privacy Events
  DATA_EXPORT_REQUESTED = "data.export.requested",
  DATA_EXPORT_COMPLETED = "data.export.completed",
  DATA_DELETION_REQUESTED = "data.deletion.requested",
  DATA_DELETION_COMPLETED = "data.deletion.completed",

  // System Events
  SYSTEM_BACKUP_CREATED = "system.backup.created",
  SYSTEM_RESTORE_COMPLETED = "system.restore.completed",
  SYSTEM_MAINTENANCE_STARTED = "system.maintenance.started",
  SYSTEM_MAINTENANCE_COMPLETED = "system.maintenance.completed",
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Audit event data structure
 */
export interface AuditEvent {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  householdId?: string;
  animalId?: string;
  targetId?: string; // ID of the resource being acted upon
  targetType?: string; // Type of resource (regimen, administration, etc.)
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string; // For deletions or corrections
}

/**
 * Audit configuration
 */
export interface AuditConfig {
  enableDataChangeTracking: boolean;
  trackPreviousValues: boolean;
  enableGeoLocation: boolean;
  enableUserAgentTracking: boolean;
  requireReasonForDeletion: boolean;
  criticalEventsOnly: boolean;
  retentionDays?: number;
}

/**
 * Default audit configuration
 */
const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enableDataChangeTracking: true,
  trackPreviousValues: true,
  enableGeoLocation: false, // Privacy consideration
  enableUserAgentTracking: true,
  requireReasonForDeletion: true,
  criticalEventsOnly: false,
};

/**
 * Audit event severity mapping
 */
const SEVERITY_MAP: Record<AuditEventType, AuditSeverity> = {
  // Low severity events
  [AuditEventType.USER_LOGIN]: AuditSeverity.LOW,
  [AuditEventType.USER_LOGOUT]: AuditSeverity.LOW,
  [AuditEventType.ANIMAL_UPDATED]: AuditSeverity.LOW,
  [AuditEventType.REGIMEN_UPDATED]: AuditSeverity.LOW,

  // Medium severity events
  [AuditEventType.USER_REGISTER]: AuditSeverity.MEDIUM,
  [AuditEventType.USER_CREATED]: AuditSeverity.MEDIUM,
  [AuditEventType.USER_UPDATED]: AuditSeverity.MEDIUM,
  [AuditEventType.HOUSEHOLD_CREATED]: AuditSeverity.MEDIUM,
  [AuditEventType.HOUSEHOLD_UPDATED]: AuditSeverity.MEDIUM,
  [AuditEventType.HOUSEHOLD_MEMBER_ADDED]: AuditSeverity.MEDIUM,
  [AuditEventType.HOUSEHOLD_MEMBER_ROLE_CHANGED]: AuditSeverity.MEDIUM,
  [AuditEventType.ANIMAL_CREATED]: AuditSeverity.MEDIUM,
  [AuditEventType.REGIMEN_CREATED]: AuditSeverity.MEDIUM,
  [AuditEventType.REGIMEN_COMPLETED]: AuditSeverity.MEDIUM,
  [AuditEventType.MEDICATION_ADMINISTERED]: AuditSeverity.MEDIUM,
  [AuditEventType.INVENTORY_ITEM_ADDED]: AuditSeverity.MEDIUM,
  [AuditEventType.INVENTORY_ITEM_UPDATED]: AuditSeverity.MEDIUM,
  [AuditEventType.INVENTORY_ITEM_ASSIGNED]: AuditSeverity.MEDIUM,
  [AuditEventType.CO_SIGN_COMPLETED]: AuditSeverity.MEDIUM,

  // High severity events
  [AuditEventType.USER_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.HOUSEHOLD_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.HOUSEHOLD_MEMBER_REMOVED]: AuditSeverity.HIGH,
  [AuditEventType.ANIMAL_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.REGIMEN_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.MEDICATION_MISSED]: AuditSeverity.HIGH,
  [AuditEventType.MEDICATION_ADMINISTRATION_CORRECTED]: AuditSeverity.HIGH,
  [AuditEventType.MEDICATION_ADMINISTRATION_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.INVENTORY_ITEM_DELETED]: AuditSeverity.HIGH,
  [AuditEventType.INVENTORY_ITEM_UNASSIGNED]: AuditSeverity.HIGH,
  [AuditEventType.HIGH_RISK_MEDICATION_ADMINISTERED]: AuditSeverity.HIGH,
  [AuditEventType.CO_SIGN_REQUIRED]: AuditSeverity.HIGH,
  [AuditEventType.CO_SIGN_FAILED]: AuditSeverity.HIGH,
  [AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT]: AuditSeverity.HIGH,
  [AuditEventType.PERMISSION_DENIED]: AuditSeverity.HIGH,
  [AuditEventType.DATA_EXPORT_REQUESTED]: AuditSeverity.HIGH,
  [AuditEventType.DATA_DELETION_REQUESTED]: AuditSeverity.HIGH,

  // Critical severity events
  [AuditEventType.SUSPICIOUS_ACTIVITY]: AuditSeverity.CRITICAL,
  [AuditEventType.DATA_EXPORT_COMPLETED]: AuditSeverity.CRITICAL,
  [AuditEventType.DATA_DELETION_COMPLETED]: AuditSeverity.CRITICAL,
  [AuditEventType.SYSTEM_BACKUP_CREATED]: AuditSeverity.CRITICAL,
  [AuditEventType.SYSTEM_RESTORE_COMPLETED]: AuditSeverity.CRITICAL,
  [AuditEventType.SYSTEM_MAINTENANCE_STARTED]: AuditSeverity.CRITICAL,
  [AuditEventType.SYSTEM_MAINTENANCE_COMPLETED]: AuditSeverity.CRITICAL,
};

/**
 * Audit Logger class
 */
export class AuditLogger {
  private config: AuditConfig;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  /**
   * Log an audit event
   */
  async logEvent(event: AuditEvent, correlationId?: string): Promise<void> {
    const severity = SEVERITY_MAP[event.eventType] || AuditSeverity.MEDIUM;

    // Skip non-critical events if configured
    if (this.config.criticalEventsOnly && severity !== AuditSeverity.CRITICAL) {
      return;
    }

    // Create audit entry with proper typing
    const auditEntry: Record<string, unknown> = {
      eventType: event.eventType,
      severity,
      userId: event.userId,
      householdId: event.householdId,
      animalId: event.animalId,
      targetId: event.targetId,
      targetType: event.targetType,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      reason: event.reason,
      audit: true,
      ...event.metadata,
    };

    // Add data change tracking
    if (this.config.enableDataChangeTracking) {
      if (event.previousValues) {
        auditEntry.previousValues = event.previousValues;
      }
      if (event.newValues) {
        auditEntry.newValues = event.newValues;
      }
    }

    // Map severity to log level
    const logLevel = this.severityToLogLevel(severity);

    // Log the audit event
    if (logLevel === LogLevel.ERROR || logLevel === LogLevel.FATAL) {
      await logger.error(
        `Audit: ${event.eventType}`,
        undefined,
        auditEntry,
        correlationId,
      );
    } else {
      await logger.info(`Audit: ${event.eventType}`, auditEntry, correlationId);
    }
  }

  /**
   * Log user authentication events
   */
  async logUserAuth(
    eventType:
      | AuditEventType.USER_LOGIN
      | AuditEventType.USER_LOGOUT
      | AuditEventType.USER_REGISTER,
    userId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId,
        metadata,
      },
      correlationId,
    );
  }

  /**
   * Log medication administration events (critical)
   */
  async logMedicationAdministration(
    eventType:
      | AuditEventType.MEDICATION_ADMINISTERED
      | AuditEventType.HIGH_RISK_MEDICATION_ADMINISTERED,
    userId: string,
    householdId: string,
    animalId: string,
    regimenId: string,
    administrationId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId,
        householdId,
        animalId,
        targetId: administrationId,
        targetType: "administration",
        metadata: {
          regimenId,
          ...metadata,
        },
      },
      correlationId,
    );
  }

  /**
   * Log data modification events with change tracking
   */
  async logDataChange(
    eventType: AuditEventType,
    userId: string,
    householdId: string,
    targetId: string,
    targetType: string,
    previousValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    reason?: string,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId,
        householdId,
        targetId,
        targetType,
        previousValues,
        newValues,
        reason,
      },
      correlationId,
    );
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    userId?: string,
    householdId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId: userId || "unknown",
        householdId,
        ipAddress,
        userAgent,
        metadata,
      },
      correlationId,
    );
  }

  /**
   * Log co-sign events for high-risk medications
   */
  async logCoSignEvent(
    eventType:
      | AuditEventType.CO_SIGN_REQUIRED
      | AuditEventType.CO_SIGN_COMPLETED
      | AuditEventType.CO_SIGN_FAILED,
    userId: string,
    householdId: string,
    animalId: string,
    administrationId: string,
    coSignerUserId?: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId,
        householdId,
        animalId,
        targetId: administrationId,
        targetType: "administration",
        metadata: {
          coSignerUserId,
          ...metadata,
        },
      },
      correlationId,
    );
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    eventType: AuditEventType,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await this.logEvent(
      {
        eventType,
        severity: SEVERITY_MAP[eventType],
        userId: "system",
        metadata,
      },
      correlationId,
    );
  }

  /**
   * Convert audit severity to log level
   */
  private severityToLogLevel(severity: AuditSeverity): LogLevel {
    switch (severity) {
      case AuditSeverity.LOW:
        return LogLevel.DEBUG;
      case AuditSeverity.MEDIUM:
        return LogLevel.INFO;
      case AuditSeverity.HIGH:
        return LogLevel.WARN;
      case AuditSeverity.CRITICAL:
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Convenience functions for common audit events
export const auditLog = {
  // Authentication
  userLogin: (
    userId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logUserAuth(
      AuditEventType.USER_LOGIN,
      userId,
      metadata,
      correlationId,
    ),

  userLogout: (
    userId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logUserAuth(
      AuditEventType.USER_LOGOUT,
      userId,
      metadata,
      correlationId,
    ),

  // Medication administration (critical events)
  medicationGiven: (
    userId: string,
    householdId: string,
    animalId: string,
    regimenId: string,
    administrationId: string,
    isHighRisk: boolean = false,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logMedicationAdministration(
      isHighRisk
        ? AuditEventType.HIGH_RISK_MEDICATION_ADMINISTERED
        : AuditEventType.MEDICATION_ADMINISTERED,
      userId,
      householdId,
      animalId,
      regimenId,
      administrationId,
      metadata,
      correlationId,
    ),

  // Co-signing
  coSignRequired: (
    userId: string,
    householdId: string,
    animalId: string,
    administrationId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logCoSignEvent(
      AuditEventType.CO_SIGN_REQUIRED,
      userId,
      householdId,
      animalId,
      administrationId,
      undefined,
      metadata,
      correlationId,
    ),

  coSignCompleted: (
    userId: string,
    coSignerUserId: string,
    householdId: string,
    animalId: string,
    administrationId: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logCoSignEvent(
      AuditEventType.CO_SIGN_COMPLETED,
      userId,
      householdId,
      animalId,
      administrationId,
      coSignerUserId,
      metadata,
      correlationId,
    ),

  // Security events
  unauthorizedAccess: (
    userId: string | undefined,
    householdId: string | undefined,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) =>
    auditLogger.logSecurityEvent(
      AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      userId,
      householdId,
      ipAddress,
      userAgent,
      metadata,
      correlationId,
    ),

  permissionDenied: (
    userId: string,
    householdId: string,
    resource: string,
    action: string,
    correlationId?: string,
  ) =>
    auditLogger.logSecurityEvent(
      AuditEventType.PERMISSION_DENIED,
      userId,
      householdId,
      undefined,
      undefined,
      { resource, action },
      correlationId,
    ),
};
