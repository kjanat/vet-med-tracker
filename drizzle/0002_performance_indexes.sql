-- Performance optimization indexes for query-heavy operations
-- Based on analysis of server/api/routers/reports.ts and insights.ts

-- Index for administrations filtering by recorded_at, animal_id, household_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_perf_lookup 
ON administrations (recorded_at, animal_id, household_id);

-- Index for administrations timezone-aware date grouping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_date_status 
ON administrations (animal_id, household_id, recorded_at, status);

-- Index for regimens filtering by household_id and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_household_active 
ON regimens (household_id, active, animal_id);

-- Index for regimens schedule type filtering (PRN exclusion)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regimens_schedule_type 
ON regimens (schedule_type, household_id, active);

-- Index for animals filtering by household_id and timezone operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_animals_household_timezone 
ON animals (household_id, timezone);

-- Composite index for compliance calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_administrations_compliance 
ON administrations (regimen_id, scheduled_for, status, recorded_at);

-- Index for inventory queries with itemIds filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_household 
ON inventory_items (household_id, id, active);