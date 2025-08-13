-- Comprehensive Database Performance Optimization for VetMed Tracker
-- Indexes designed for high-frequency query patterns and optimal performance

-- =====================================================
-- CORE BUSINESS LOGIC INDEXES
-- =====================================================

-- Critical index for administration queries with time-based filtering
-- Supports: admin.list(), insights queries, compliance reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_household_animal_time
    ON vetmed_administrations(household_id, animal_id, recorded_at DESC)
    WHERE household_id IS NOT NULL;

-- High-performance index for due medications (regimens.listDue)
-- Includes scheduled_for for optimal time-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_regimen_scheduled_recorded
    ON vetmed_administrations(regimen_id, scheduled_for, recorded_at DESC)
    WHERE scheduled_for IS NOT NULL;

-- Covering index for administration status analytics
-- Supports compliance calculations and insights
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_status_analytics
    ON vetmed_administrations(household_id, status, recorded_at)
    INCLUDE (regimen_id, animal_id, scheduled_for)
    WHERE status IN ('ON_TIME', 'LATE', 'VERY_LATE', 'MISSED');

-- =====================================================
-- REGIMEN & MEDICATION MANAGEMENT INDEXES
-- =====================================================

-- Primary index for active regimens by household and animal
-- Critical for regimen management and due medication queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_household_animal_active
    ON vetmed_regimens(household_id, animal_id, active)
    WHERE deleted_at IS NULL AND active = true;

-- Schedule type filtering for fixed vs PRN regimens
-- Supports regimens.listDue() time calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_schedule_active
    ON vetmed_regimens(schedule_type, active, start_date, end_date)
    WHERE deleted_at IS NULL;

-- Animal-household relationship for security and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_household_active
    ON vetmed_animals(household_id, id)
    WHERE deleted_at IS NULL;

-- =====================================================
-- INVENTORY MANAGEMENT INDEXES
-- =====================================================

-- Primary inventory lookup by household and medication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_household_medication_active
    ON vetmed_inventory_items(household_id, medication_id, in_use)
    WHERE deleted_at IS NULL;

-- Expiration tracking for low inventory alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_expiration_tracking
    ON vetmed_inventory_items(household_id, expires_on ASC, units_remaining)
    WHERE deleted_at IS NULL AND in_use = true;

-- Low inventory analysis (supports insights.generateLowInventorySuggestions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock_analysis
    ON vetmed_inventory_items(household_id, in_use, units_remaining, quantity_units)
    WHERE deleted_at IS NULL AND in_use = true AND units_remaining IS NOT NULL;

-- =====================================================
-- HOUSEHOLD & USER MANAGEMENT INDEXES
-- =====================================================

-- User household memberships for authorization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_user_household
    ON vetmed_memberships(user_id, household_id, role);

-- User authentication lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_stack_email_lookup
    ON vetmed_users(stack_user_id, email)
    WHERE stack_user_id IS NOT NULL;

-- =====================================================
-- TEXT SEARCH INDEXES (GIN)
-- =====================================================

-- Full-text search for medication catalog
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medications_fulltext_search
    ON vetmed_medication_catalog
    USING gin(to_tsvector('english',
    coalesce (generic_name, '') || ' ' ||
    coalesce (brand_name, '') || ' ' ||
    coalesce (strength, '') || ' ' ||
    coalesce (common_dosing, '')
    ));

-- Trigram search for fuzzy medication matching
CREATE
EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medications_trigram_search
    ON vetmed_medication_catalog
    USING gin((generic_name || ' ' || coalesce (brand_name, '')) gin_trgm_ops);

-- Animal name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_name_search
    ON vetmed_animals
    USING gin(name gin_trgm_ops);

-- =====================================================
-- JSONB INDEXES FOR FLEXIBLE DATA
-- =====================================================

-- User preferences and notification settings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_preferences_gin
    ON vetmed_users USING gin(profile_data)
    WHERE profile_data IS NOT NULL;

-- Notification data for filtering and routing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_data_gin
    ON vetmed_notifications USING gin(data)
    WHERE data IS NOT NULL;

-- Audit log details for advanced searching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_details_gin
    ON vetmed_audit_log USING gin(details)
    WHERE details IS NOT NULL;

-- =====================================================
-- TIME-BASED ANALYTICS INDEXES
-- =====================================================

-- Comprehensive compliance analysis index
-- Supports complex timezone-aware queries in insights
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_compliance_analysis
    ON vetmed_administrations(
    household_id,
    regimen_id,
    (scheduled_for AT TIME ZONE 'UTC'),
    status,
    recorded_at DESC
    )
    WHERE scheduled_for IS NOT NULL AND status != 'PRN';

-- Daily/weekly patterns analysis
-- Optimized for day-of-week and hour extraction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_pattern_analysis
    ON vetmed_administrations(
    household_id,
    date_trunc('day', recorded_at AT TIME ZONE 'UTC'),
    extract ('hour' from recorded_at AT TIME ZONE 'UTC'),
    status
    )
    WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days';

-- =====================================================
-- NOTIFICATION & ALERT INDEXES
-- =====================================================

-- Unread notifications by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
    ON vetmed_notifications(user_id, created_at DESC)
    WHERE read = false AND dismissed = false;

-- Notification queue processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_queue_processing
    ON vetmed_notification_queue(scheduled_for ASC, attempts)
    WHERE sent_at IS NULL AND failed_at IS NULL;

-- =====================================================
-- AUDIT & SECURITY INDEXES
-- =====================================================

-- Audit trail queries by resource and user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource_time
    ON vetmed_audit_log(resource_type, resource_id, timestamp DESC)
    WHERE resource_id IS NOT NULL;

-- User activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_activity
    ON vetmed_audit_log(user_id, household_id, timestamp DESC);

-- =====================================================
-- SPECIALIZED COMPOSITE INDEXES
-- =====================================================

-- Bulk administration operations (admin.recordBulk)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_bulk_operations
    ON vetmed_regimens(medication_id, active, schedule_type)
    INCLUDE (animal_id, dose, route)
    WHERE deleted_at IS NULL AND active = true;

-- Multi-animal regimen lookup (regimens.listByAnimals)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_multi_animal_lookup
    ON vetmed_regimens(animal_id, active)
    INCLUDE (id, medication_id, dose, route, schedule_type, times_local)
    WHERE deleted_at IS NULL AND active = true;

-- Co-sign request processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cosign_requests_processing
    ON vetmed_cosign_requests(cosigner_id, status, expires_at)
    WHERE status = 'pending';

-- =====================================================
-- PARTIAL INDEXES FOR SOFT DELETES
-- =====================================================

-- These indexes exclude soft-deleted records for better performance

-- Active animals only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_active_only
    ON vetmed_animals(household_id, species, name)
    WHERE deleted_at IS NULL;

-- Active regimens only  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_active_only
    ON vetmed_regimens(animal_id, medication_id, start_date)
    WHERE deleted_at IS NULL AND active = true;

-- Active inventory only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_active_only
    ON vetmed_inventory_items(household_id, assigned_animal_id, expires_on)
    WHERE deleted_at IS NULL;

-- =====================================================
-- STATISTICS AND MAINTENANCE
-- =====================================================

-- Update table statistics for optimal query planning
ANALYZE
vetmed_administrations;
ANALYZE
vetmed_regimens;
ANALYZE
vetmed_animals;
ANALYZE
vetmed_inventory_items;
ANALYZE
vetmed_medication_catalog;
ANALYZE
vetmed_users;
ANALYZE
vetmed_households;
ANALYZE
vetmed_memberships;
ANALYZE
vetmed_notifications;
ANALYZE
vetmed_audit_log;

-- Index statistics
SELECT schemaname,
       tablename,
       indexname,
       idx_blks_read,
       idx_blks_hit,
       ROUND(
               CASE
                   WHEN (idx_blks_hit + idx_blks_read) = 0 THEN 0
                   ELSE (idx_blks_hit::float / (idx_blks_hit + idx_blks_read)) * 100
                   END, 2
       ) as cache_hit_ratio
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'vetmed_%'
ORDER BY cache_hit_ratio ASC, idx_blks_read DESC;