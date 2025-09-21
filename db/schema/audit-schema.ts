import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

/**
 * Audit logging database schema for HIPAA compliance
 */

// Enums for audit categories
export const actionTypeEnum = pgEnum("action_type", [
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
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "USER",
  "HOUSEHOLD",
  "ANIMAL",
  "MEDICATION",
  "REGIMEN",
  "ADMINISTRATION",
  "SYSTEM",
]);

export const severityLevelEnum = pgEnum("severity_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * Primary audit log table
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    // Action details
    action: actionTypeEnum("action").notNull(),
    clientIp: text("client_ip"),
    cpuUsage: integer("cpu_usage"), // percentage * 100
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dataClassification: text("data_classification"), // 'public', 'internal', 'confidential', 'phi'
    duration: integer("duration"), // milliseconds

    // Request context
    endpoint: text("endpoint"),
    errorMessage: text("error_message"),

    // Compliance tracking
    hipaaLogged: boolean("hipaa_logged").default(false),

    // Household context for multi-tenant filtering
    householdId: uuid("household_id"),
    httpMethod: text("http_method"),
    // Primary identification
    id: uuid("id").primaryKey().defaultRandom(),

    // Performance metrics
    memoryUsage: integer("memory_usage"), // bytes

    // Additional data (encrypted sensitive information)
    metadata: jsonb("metadata"), // Flexible JSON for additional context
    resourceId: uuid("resource_id"),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    sessionId: text("session_id"),
    stackUserId: text("stack_user_id"),

    // Outcome
    success: boolean("success").notNull(),
    userAgent: text("user_agent"),

    // User context
    userId: uuid("user_id"),
  },
  (t) => [
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_at_idx").on(t.createdAt),

    // HIPAA compliance index
    index("audit_logs_hipaa_idx").on(t.hipaaLogged, t.dataClassification),
    index("audit_logs_household_id_idx").on(t.householdId),
    index("audit_logs_resource_action_idx").on(t.resourceType, t.action),
    index("audit_logs_resource_type_idx").on(t.resourceType),
    index("audit_logs_success_idx").on(t.success),
    index("audit_logs_time_range_idx").on(t.createdAt, t.success),

    // Composite indexes for common queries
    index("audit_logs_user_action_idx").on(t.userId, t.action),
    // Performance indexes
    index("audit_logs_user_id_idx").on(t.userId),
  ],
);

/**
 * Security events table
 * Dedicated table for security-related events and threats
 */
export const securityEvents = pgTable(
  "security_events",
  {
    // Alert tracking
    alertSent: boolean("alert_sent").default(false),
    alertSentAt: timestamp("alert_sent_at", { withTimezone: true }),

    // Related audit log entry
    auditLogId: uuid("audit_log_id"),
    clientIp: text("client_ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Event details
    description: text("description"),

    // Event classification
    eventType: text("event_type").notNull(), // 'rate_limit_violation', 'unauthorized_access', etc.
    // Primary identification
    id: uuid("id").primaryKey().defaultRandom(),
    metadata: jsonb("metadata"),
    resolutionNotes: text("resolution_notes"),

    // Resolution tracking
    resolved: boolean("resolved").default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    sessionId: text("session_id"),
    severity: severityLevelEnum("severity").notNull(),
    userAgent: text("user_agent"),

    // User and request context
    userId: uuid("user_id"),
  },
  (t) => [
    // Alert tracking
    index("security_events_alert_idx").on(t.alertSent, t.severity),
    index("security_events_client_ip_idx").on(t.clientIp),
    index("security_events_created_at_idx").on(t.createdAt),
    // Performance indexes
    index("security_events_event_type_idx").on(t.eventType),
    index("security_events_resolved_idx").on(t.resolved),
    index("security_events_severity_idx").on(t.severity),
  ],
);

/**
 * Rate limiting tracking table
 * Stores rate limit violations and patterns
 */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    blockDuration: integer("block_duration"), // milliseconds

    // Block details
    blocked: boolean("blocked").default(false),
    blockUntil: timestamp("block_until", { withTimezone: true }),
    clientIp: text("client_ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endpoint: text("endpoint"),
    // Primary identification
    id: uuid("id").primaryKey().defaultRandom(),

    // Additional context
    isPrivateIP: boolean("is_private_ip").default(false),

    // Rate limit context
    limitKey: text("limit_key").notNull(), // The rate limit key used
    limitThreshold: integer("limit_threshold").notNull(),
    limitType: text("limit_type").notNull(), // 'AUTH', 'MEDICAL', 'READ', etc.
    metadata: jsonb("metadata"),

    // Rate limit metrics
    requestCount: integer("request_count").notNull(),
    userAgent: text("user_agent"),

    // Request details
    userId: uuid("user_id"),
    windowDuration: integer("window_duration").notNull(), // milliseconds
  },
  (t) => [
    index("rate_limit_events_blocked_idx").on(t.blocked),
    index("rate_limit_events_client_ip_idx").on(t.clientIp),
    index("rate_limit_events_created_at_idx").on(t.createdAt),
    index("rate_limit_events_endpoint_idx").on(t.endpoint),
    // Performance indexes
    index("rate_limit_events_limit_key_idx").on(t.limitKey),
    // Analysis indexes
    index("rate_limit_events_limit_type_idx").on(t.limitType),
  ],
);

/**
 * Data access log table
 * Tracks access to sensitive medical data for HIPAA compliance
 */
export const dataAccessLogs = pgTable(
  "data_access_logs",
  {
    // Access details
    accessType: text("access_type").notNull(), // 'view', 'edit', 'delete', 'export'
    animalId: uuid("animal_id"),
    authorized: boolean("authorized").notNull().default(true),

    // Request context
    clientIp: text("client_ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Data context
    dataType: text("data_type").notNull(), // 'medical_record', 'prescription', 'animal_data'
    fieldsAccessed: jsonb("fields_accessed"), // Array of field names accessed
    householdId: uuid("household_id"),
    // Primary identification
    id: uuid("id").primaryKey().defaultRandom(),

    // Additional metadata
    metadata: jsonb("metadata"),

    // HIPAA compliance
    purpose: text("purpose"), // Business reason for access
    referrer: text("referrer"),
    resourceId: uuid("resource_id"),
    sessionId: text("session_id"),
    userAgent: text("user_agent"),

    // User context
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    index("data_access_logs_access_type_idx").on(t.accessType),
    // HIPAA compliance indexes
    index("data_access_logs_authorized_idx").on(t.authorized),
    index("data_access_logs_created_at_idx").on(t.createdAt),
    index("data_access_logs_data_type_idx").on(t.dataType),
    index("data_access_logs_household_id_idx").on(t.householdId),
    // Performance indexes
    index("data_access_logs_user_id_idx").on(t.userId),
  ],
);

/**
 * Performance metrics table
 * Tracks system performance for monitoring and optimization
 */
export const performanceMetrics = pgTable(
  "performance_metrics",
  {
    cacheHits: integer("cache_hits"),
    cacheMisses: integer("cache_misses"),
    clientIp: text("client_ip"),
    cpuUsage: integer("cpu_usage"), // percentage * 100
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Additional metrics
    dbQueryCount: integer("db_query_count"),
    dbQueryDuration: integer("db_query_duration"), // milliseconds

    // Performance data
    duration: integer("duration").notNull(), // milliseconds

    // Endpoint information
    endpoint: text("endpoint").notNull(),
    errorType: text("error_type"),
    httpMethod: text("http_method"),
    // Primary identification
    id: uuid("id").primaryKey().defaultRandom(),
    memoryUsage: integer("memory_usage"), // bytes

    // Metadata
    metadata: jsonb("metadata"),

    // Outcome
    success: boolean("success").notNull(),

    // User context
    userId: uuid("user_id"),
  },
  (t) => [
    index("performance_metrics_created_at_idx").on(t.createdAt),
    index("performance_metrics_duration_idx").on(t.duration),
    // Performance indexes
    index("performance_metrics_endpoint_idx").on(t.endpoint),
    // Analysis indexes
    index("performance_metrics_slow_queries_idx").on(t.duration, t.success),
    index("performance_metrics_success_idx").on(t.success),
  ],
);

// Zod schemas for validation
export const AuditLogSchema = createSelectSchema(auditLogs);

// Type exports
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

export type RateLimitEvent = typeof rateLimitEvents.$inferSelect;
export type InsertRateLimitEvent = typeof rateLimitEvents.$inferInsert;

export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type InsertDataAccessLog = typeof dataAccessLogs.$inferInsert;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = typeof performanceMetrics.$inferInsert;
