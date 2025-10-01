/**
 * Performance Optimization Database Indexes
 * Wave 2B: Core Web Vitals Optimization
 *
 * Adds composite indexes for dashboard query optimization
 * and improved query performance for high-frequency operations
 */

import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function performanceOptimizationIndexes(
  db: PostgresJsDatabase<Record<string, unknown>>,
) {
  console.log("🚀 Creating performance optimization indexes...");

  // 1. Dashboard Query Optimization Indexes
  console.log("📊 Adding dashboard composite indexes...");

  // Household + Date Range composite index for dashboard queries
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "dashboard_household_date_idx"
    ON "vetmed_administrations" ("household_id", "recorded_at", "status")
    WHERE "status" IN ('ON_TIME', 'LATE', 'VERY_LATE', 'MISSED')
  `);

  // Animal + Regimen + Date composite for animal-specific dashboards
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "animal_regimen_date_idx"
    ON "vetmed_administrations" ("animal_id", "regimen_id", "recorded_at")
    INCLUDE ("dose", "notes", "status")
  `);

  // 2. Pending Medications Query Optimization
  console.log("💊 Adding pending medications indexes...");

  // Active regimens with household for pending meds calculation
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "active_regimens_household_idx"
    ON "vetmed_regimens" ("active", "household_id", "start_date", "end_date")
    WHERE "active" = true AND "deleted_at" IS NULL AND "paused_at" IS NULL
    INCLUDE ("animal_id", "schedule_type", "times_local", "cutoff_minutes")
  `);

  // Animal timezone lookup optimization
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "animal_household_timezone_idx"
    ON "vetmed_animals" ("household_id", "timezone")
    WHERE "deleted_at" IS NULL
    INCLUDE ("id", "name", "species")
  `);

  // 3. User Authentication & Membership Optimization
  console.log("👤 Adding user authentication indexes...");

  // Stack user ID lookup optimization
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_stack_id_active_idx"
    ON "vetmed_users" ("stack_user_id")
    WHERE "stack_user_id" IS NOT NULL
    INCLUDE ("id", "email", "name", "preferences")
  `);

  // Household membership with role optimization
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "membership_user_household_role_idx"
    ON "vetmed_memberships" ("user_id", "household_id", "role")
    INCLUDE ("created_at", "updated_at")
  `);

  // 4. Notification System Optimization
  console.log("🔔 Adding notification system indexes...");

  // Pending notifications for scheduler
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "notifications_pending_scheduled_idx"
    ON "vetmed_notification_queue" ("scheduled_for", "sent_at")
    WHERE "sent_at" IS NULL AND "failed_at" IS NULL
    INCLUDE ("id", "user_id", "household_id", "type", "title", "body")
  `);

  // User notifications with read status
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_notifications_read_idx"
    ON "vetmed_notifications" ("user_id", "read", "created_at" DESC)
    INCLUDE ("id", "title", "message", "type", "priority")
  `);

  // 5. Inventory Management Optimization
  console.log("📦 Adding inventory management indexes...");

  // Active inventory by household with expiration
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "inventory_household_active_expires_idx"
    ON "vetmed_inventory_items" ("household_id", "in_use", "expires_on")
    WHERE "deleted_at" IS NULL
    INCLUDE ("id", "medication_name", "units_remaining", "assigned_animal_id")
  `);

  // Low stock monitoring
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "inventory_low_stock_idx"
    ON "vetmed_inventory_items" ("household_id", "units_remaining")
    WHERE "deleted_at" IS NULL AND "in_use" = true
    INCLUDE ("medication_name", "assigned_animal_id", "expires_on")
  `);

  // 6. Audit and Security Optimization
  console.log("🔐 Adding audit and security indexes...");

  // Recent audit logs by household
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_household_recent_idx"
    ON "vetmed_audit_log" ("household_id", "timestamp" DESC)
    WHERE "timestamp" > NOW() - INTERVAL '30 days'
    INCLUDE ("action", "resource_type", "user_id", "success")
  `);

  // Security events monitoring
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "security_events_recent_idx"
    ON "vetmed_security_events" ("created_at" DESC, "severity", "resolved")
    WHERE "created_at" > NOW() - INTERVAL '7 days'
    INCLUDE ("event_type", "client_ip", "user_id")
  `);

  // 7. Medication Catalog Optimization
  console.log("💉 Adding medication catalog indexes...");

  // Generic name search with dosage info
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "medication_catalog_search_idx"
    ON "vetmed_medication_catalog" USING gin(to_tsvector('english', "generic_name" || ' ' || COALESCE("brand_name", '')))
    INCLUDE ("form", "route", "dosage_typical_mg_kg", "unit_type")
  `);

  // Dosage calculation optimization
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "medication_dosage_range_idx"
    ON "vetmed_medication_catalog" ("form", "route")
    INCLUDE ("dosage_min_mg_kg", "dosage_max_mg_kg", "dosage_typical_mg_kg", "unit_type")
  `);

  console.log("✅ Performance optimization indexes created successfully!");

  // Add index usage statistics query for monitoring
  console.log("📈 Creating index monitoring view...");
  await db.execute(sql`
    CREATE OR REPLACE VIEW vetmed_index_usage_stats AS
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch,
      idx_scan,
      CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
      END as usage_category
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' AND tablename LIKE 'vetmed_%'
    ORDER BY idx_scan DESC;
  `);

  console.log("🎯 Index monitoring view created for performance tracking!");
}

export async function revertPerformanceOptimizationIndexes(
  db: PostgresJsDatabase<Record<string, unknown>>,
) {
  console.log("🔄 Reverting performance optimization indexes...");

  // Drop all performance optimization indexes
  const indexes = [
    "dashboard_household_date_idx",
    "animal_regimen_date_idx",
    "active_regimens_household_idx",
    "animal_household_timezone_idx",
    "users_stack_id_active_idx",
    "membership_user_household_role_idx",
    "notifications_pending_scheduled_idx",
    "user_notifications_read_idx",
    "inventory_household_active_expires_idx",
    "inventory_low_stock_idx",
    "audit_household_recent_idx",
    "security_events_recent_idx",
    "medication_catalog_search_idx",
    "medication_dosage_range_idx",
  ];

  for (const indexName of indexes) {
    await db.execute(
      sql`DROP INDEX CONCURRENTLY IF EXISTS "${sql.raw(indexName)}"`,
    );
  }

  // Drop monitoring view
  await db.execute(sql`DROP VIEW IF EXISTS vetmed_index_usage_stats`);

  console.log("✅ Performance optimization indexes reverted successfully!");
}
