import { sql } from "drizzle-orm";
import { dbPooled as db } from "@/db/drizzle";

/**
 * Create audit and security tables for HIPAA compliance
 *
 * This migration creates:
 * - audit_logs: Comprehensive audit trail
 * - security_events: Security incident tracking
 * - rate_limit_events: Rate limiting violations
 * - data_access_logs: PHI/PII access tracking
 * - performance_metrics: System performance monitoring
 */

export async function up(): Promise<void> {
  console.log("Creating audit and security tables...");

  // Create enums
  await db.execute(sql`
    CREATE TYPE action_type AS ENUM (
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE',
      'AUTHENTICATE', 'AUTHORIZE', 'IMPORT', 'EXPORT'
    )
  `);

  await db.execute(sql`
    CREATE TYPE resource_type AS ENUM (
      'USER', 'HOUSEHOLD', 'ANIMAL', 'MEDICATION',
      'REGIMEN', 'ADMINISTRATION', 'SYSTEM'
    )
  `);

  await db.execute(sql`
    CREATE TYPE severity_level AS ENUM (
      'low', 'medium', 'high', 'critical'
    )
  `);

  // Create audit_logs table
  await db.execute(sql`
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

      -- User context
      user_id UUID,
      session_id TEXT,
      stack_user_id TEXT,

      -- Action details
      action action_type NOT NULL,
      resource_type resource_type NOT NULL,
      resource_id UUID,

      -- Request context
      endpoint TEXT,
      http_method TEXT,
      client_ip TEXT,
      user_agent TEXT,

      -- Outcome
      success BOOLEAN NOT NULL,
      error_message TEXT,
      duration INTEGER,

      -- Additional data
      metadata JSONB,

      -- Performance metrics
      memory_usage INTEGER,
      cpu_usage INTEGER,

      -- Household context
      household_id UUID,

      -- Compliance tracking
      hipaa_logged BOOLEAN DEFAULT false,
      data_classification TEXT
    )
  `);

  // Create security_events table
  await db.execute(sql`
    CREATE TABLE security_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

      -- Event classification
      event_type TEXT NOT NULL,
      severity severity_level NOT NULL,

      -- User and request context
      user_id UUID,
      session_id TEXT,
      client_ip TEXT NOT NULL,
      user_agent TEXT,

      -- Event details
      description TEXT,
      metadata JSONB,

      -- Resolution tracking
      resolved BOOLEAN DEFAULT false,
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolved_by UUID,
      resolution_notes TEXT,

      -- Related audit log entry
      audit_log_id UUID,

      -- Alert tracking
      alert_sent BOOLEAN DEFAULT false,
      alert_sent_at TIMESTAMP WITH TIME ZONE
    )
  `);

  // Create rate_limit_events table
  await db.execute(sql`
    CREATE TABLE rate_limit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

      -- Rate limit context
      limit_key TEXT NOT NULL,
      limit_type TEXT NOT NULL,
      endpoint TEXT,

      -- Request details
      user_id UUID,
      client_ip TEXT NOT NULL,
      user_agent TEXT,

      -- Rate limit metrics
      request_count INTEGER NOT NULL,
      limit_threshold INTEGER NOT NULL,
      window_duration INTEGER NOT NULL,

      -- Block details
      blocked BOOLEAN DEFAULT false,
      block_duration INTEGER,
      block_until TIMESTAMP WITH TIME ZONE,

      -- Additional context
      is_private_ip BOOLEAN DEFAULT false,
      metadata JSONB
    )
  `);

  // Create data_access_logs table
  await db.execute(sql`
    CREATE TABLE data_access_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

      -- User context
      user_id UUID NOT NULL,
      session_id TEXT,

      -- Data context
      data_type TEXT NOT NULL,
      resource_id UUID,
      household_id UUID,
      animal_id UUID,

      -- Access details
      access_type TEXT NOT NULL,
      fields_accessed JSONB,

      -- Request context
      client_ip TEXT NOT NULL,
      user_agent TEXT,
      referrer TEXT,

      -- HIPAA compliance
      purpose TEXT,
      authorized BOOLEAN NOT NULL DEFAULT true,

      -- Additional metadata
      metadata JSONB
    )
  `);

  // Create performance_metrics table
  await db.execute(sql`
    CREATE TABLE performance_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

      -- Endpoint information
      endpoint TEXT NOT NULL,
      http_method TEXT,

      -- Performance data
      duration INTEGER NOT NULL,
      memory_usage INTEGER,
      cpu_usage INTEGER,

      -- User context
      user_id UUID,
      client_ip TEXT,

      -- Outcome
      success BOOLEAN NOT NULL,
      error_type TEXT,

      -- Additional metrics
      db_query_count INTEGER,
      db_query_duration INTEGER,
      cache_hits INTEGER,
      cache_misses INTEGER,

      -- Metadata
      metadata JSONB
    )
  `);

  console.log("Creating indexes for audit tables...");

  // Audit logs indexes
  await db.execute(
    sql`CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_action_idx ON audit_logs (action)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_resource_type_idx ON audit_logs (resource_type)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_success_idx ON audit_logs (success)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_household_id_idx ON audit_logs (household_id)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_user_action_idx ON audit_logs (user_id, action)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_resource_action_idx ON audit_logs (resource_type, action)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_time_range_idx ON audit_logs (created_at, success)`,
  );
  await db.execute(
    sql`CREATE INDEX audit_logs_hipaa_idx ON audit_logs (hipaa_logged, data_classification)`,
  );

  // Security events indexes
  await db.execute(
    sql`CREATE INDEX security_events_event_type_idx ON security_events (event_type)`,
  );
  await db.execute(
    sql`CREATE INDEX security_events_severity_idx ON security_events (severity)`,
  );
  await db.execute(
    sql`CREATE INDEX security_events_created_at_idx ON security_events (created_at)`,
  );
  await db.execute(
    sql`CREATE INDEX security_events_client_ip_idx ON security_events (client_ip)`,
  );
  await db.execute(
    sql`CREATE INDEX security_events_resolved_idx ON security_events (resolved)`,
  );
  await db.execute(
    sql`CREATE INDEX security_events_alert_idx ON security_events (alert_sent, severity)`,
  );

  // Rate limit events indexes
  await db.execute(
    sql`CREATE INDEX rate_limit_events_limit_key_idx ON rate_limit_events (limit_key)`,
  );
  await db.execute(
    sql`CREATE INDEX rate_limit_events_client_ip_idx ON rate_limit_events (client_ip)`,
  );
  await db.execute(
    sql`CREATE INDEX rate_limit_events_created_at_idx ON rate_limit_events (created_at)`,
  );
  await db.execute(
    sql`CREATE INDEX rate_limit_events_blocked_idx ON rate_limit_events (blocked)`,
  );
  await db.execute(
    sql`CREATE INDEX rate_limit_events_limit_type_idx ON rate_limit_events (limit_type)`,
  );
  await db.execute(
    sql`CREATE INDEX rate_limit_events_endpoint_idx ON rate_limit_events (endpoint)`,
  );

  // Data access logs indexes
  await db.execute(
    sql`CREATE INDEX data_access_logs_user_id_idx ON data_access_logs (user_id)`,
  );
  await db.execute(
    sql`CREATE INDEX data_access_logs_data_type_idx ON data_access_logs (data_type)`,
  );
  await db.execute(
    sql`CREATE INDEX data_access_logs_created_at_idx ON data_access_logs (created_at)`,
  );
  await db.execute(
    sql`CREATE INDEX data_access_logs_household_id_idx ON data_access_logs (household_id)`,
  );
  await db.execute(
    sql`CREATE INDEX data_access_logs_authorized_idx ON data_access_logs (authorized)`,
  );
  await db.execute(
    sql`CREATE INDEX data_access_logs_access_type_idx ON data_access_logs (access_type)`,
  );

  // Performance metrics indexes
  await db.execute(
    sql`CREATE INDEX performance_metrics_endpoint_idx ON performance_metrics (endpoint)`,
  );
  await db.execute(
    sql`CREATE INDEX performance_metrics_created_at_idx ON performance_metrics (created_at)`,
  );
  await db.execute(
    sql`CREATE INDEX performance_metrics_duration_idx ON performance_metrics (duration)`,
  );
  await db.execute(
    sql`CREATE INDEX performance_metrics_success_idx ON performance_metrics (success)`,
  );
  await db.execute(
    sql`CREATE INDEX performance_metrics_slow_queries_idx ON performance_metrics (duration, success)`,
  );

  console.log("Audit tables created successfully!");
}

export async function down(): Promise<void> {
  console.log("Dropping audit and security tables...");

  await db.execute(sql`DROP TABLE IF EXISTS performance_metrics CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS data_access_logs CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS rate_limit_events CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS security_events CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS audit_logs CASCADE`);

  await db.execute(sql`DROP TYPE IF EXISTS severity_level CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS resource_type CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS action_type CASCADE`);

  console.log("Audit tables dropped successfully!");
}

// Self-executing migration for manual runs
if (import.meta.main) {
  await up();
}
