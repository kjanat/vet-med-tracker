-- =====================================================
-- VetMed Tracker - Audit Log Table Partitioning
-- =====================================================
-- This migration creates a partitioned version of vetmed_audit_log
-- using range partitioning by timestamp (monthly partitions)
-- with extended retention for compliance requirements

-- Step 1: Create partitioned table structure
-- ==========================================
CREATE TABLE vetmed_audit_log_partitioned (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id uuid NOT NULL,
    household_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    details jsonb,
    ip_address text,
    user_agent text,
    session_id text,
    timestamp timestamp with time zone DEFAULT now() NOT NULL
) PARTITION BY RANGE (timestamp);

-- Step 2: Create initial partition set (previous 12 months + current + next 12 months)
-- ===================================================================================
-- Audit logs require longer retention for compliance

-- Historical partitions (previous 12 months)
CREATE TABLE vetmed_audit_log_2024_01 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2024-02-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_02 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-02-01 00:00:00+00') TO ('2024-03-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_03 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-03-01 00:00:00+00') TO ('2024-04-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_04 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-04-01 00:00:00+00') TO ('2024-05-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_05 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-05-01 00:00:00+00') TO ('2024-06-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_06 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-06-01 00:00:00+00') TO ('2024-07-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_07 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-07-01 00:00:00+00') TO ('2024-08-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_08 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_09 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_10 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_11 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-11-01 00:00:00+00') TO ('2024-12-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2024_12 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- Current month and future partitions
CREATE TABLE vetmed_audit_log_2025_01 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_02 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_03 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_04 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_05 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_06 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_07 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_08 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_09 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_10 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_11 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');

CREATE TABLE vetmed_audit_log_2025_12 
    PARTITION OF vetmed_audit_log_partitioned
    FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- Step 3: Create indexes on partitioned table
-- ===========================================

-- Primary performance indexes
CREATE INDEX audit_partitioned_household_id_idx ON vetmed_audit_log_partitioned 
    USING btree (household_id uuid_ops);

CREATE INDEX audit_partitioned_user_id_idx ON vetmed_audit_log_partitioned 
    USING btree (user_id uuid_ops);

CREATE INDEX audit_partitioned_timestamp_idx ON vetmed_audit_log_partitioned 
    USING btree (timestamp timestamptz_ops DESC);

CREATE INDEX audit_partitioned_resource_idx ON vetmed_audit_log_partitioned 
    USING btree (resource_type text_ops, resource_id uuid_ops);

-- Composite indexes for common audit query patterns
CREATE INDEX audit_partitioned_household_timestamp_idx ON vetmed_audit_log_partitioned 
    USING btree (household_id uuid_ops, timestamp timestamptz_ops DESC);

CREATE INDEX audit_partitioned_user_timestamp_idx ON vetmed_audit_log_partitioned 
    USING btree (user_id uuid_ops, timestamp timestamptz_ops DESC);

CREATE INDEX audit_partitioned_resource_timestamp_idx ON vetmed_audit_log_partitioned 
    USING btree (resource_type text_ops, resource_id uuid_ops, timestamp timestamptz_ops DESC);

CREATE INDEX audit_partitioned_action_timestamp_idx ON vetmed_audit_log_partitioned 
    USING btree (action text_ops, timestamp timestamptz_ops DESC);

-- JSONB indexes for details searching
CREATE INDEX audit_partitioned_details_gin_idx ON vetmed_audit_log_partitioned 
    USING gin (details);

CREATE INDEX audit_partitioned_old_values_gin_idx ON vetmed_audit_log_partitioned 
    USING gin (old_values);

CREATE INDEX audit_partitioned_new_values_gin_idx ON vetmed_audit_log_partitioned 
    USING gin (new_values);

-- Step 4: Add foreign key constraints
-- ===================================

ALTER TABLE vetmed_audit_log_partitioned 
    ADD CONSTRAINT vetmed_audit_log_partitioned_user_id_fk 
    FOREIGN KEY (user_id) REFERENCES vetmed_users(id);

ALTER TABLE vetmed_audit_log_partitioned 
    ADD CONSTRAINT vetmed_audit_log_partitioned_household_id_fk 
    FOREIGN KEY (household_id) REFERENCES vetmed_households(id);

-- Step 5: Create partition-specific indexes for optimal performance
-- ================================================================

DO $$
DECLARE
    partition_name TEXT;
    partition_names TEXT[] := ARRAY[
        'vetmed_audit_log_2024_01', 'vetmed_audit_log_2024_02', 'vetmed_audit_log_2024_03',
        'vetmed_audit_log_2024_04', 'vetmed_audit_log_2024_05', 'vetmed_audit_log_2024_06',
        'vetmed_audit_log_2024_07', 'vetmed_audit_log_2024_08', 'vetmed_audit_log_2024_09',
        'vetmed_audit_log_2024_10', 'vetmed_audit_log_2024_11', 'vetmed_audit_log_2024_12',
        'vetmed_audit_log_2025_01', 'vetmed_audit_log_2025_02', 'vetmed_audit_log_2025_03',
        'vetmed_audit_log_2025_04', 'vetmed_audit_log_2025_05', 'vetmed_audit_log_2025_06',
        'vetmed_audit_log_2025_07', 'vetmed_audit_log_2025_08', 'vetmed_audit_log_2025_09',
        'vetmed_audit_log_2025_10', 'vetmed_audit_log_2025_11', 'vetmed_audit_log_2025_12'
    ];
BEGIN
    FOREACH partition_name IN ARRAY partition_names LOOP
        -- Partition pruning optimization index
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_timestamp_idx ON %I USING btree (timestamp timestamptz_ops DESC)', 
                      partition_name, partition_name);
        
        -- Household-specific queries optimization
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_household_id_idx ON %I USING btree (household_id uuid_ops)', 
                      partition_name, partition_name);
                      
        -- Compliance and forensic analysis optimization
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_action_idx ON %I USING btree (action text_ops)', 
                      partition_name, partition_name);
    END LOOP;
END $$;

-- Step 6: Create statistics for query planning optimization
-- =========================================================
ANALYZE vetmed_audit_log_partitioned;

COMMENT ON TABLE vetmed_audit_log_partitioned IS 
'Partitioned version of vetmed_audit_log table. 
Partitioned by timestamp using monthly range partitions.
Created for improved performance and compliance with audit data retention requirements.
Includes extended retention for compliance and forensic analysis.';

-- Optimization settings for partitioned table
-- More conservative settings for audit data (longer retention, less aggressive cleanup)
ALTER TABLE vetmed_audit_log_partitioned SET (
    autovacuum_enabled = true,
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1,
    -- Less aggressive cleanup for audit data
    autovacuum_vacuum_cost_delay = 20,
    -- Longer retention for audit compliance
    autovacuum_freeze_min_age = 100000000
);