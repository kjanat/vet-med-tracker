-- =====================================================
-- VetMed Tracker - Administrations Table Partitioning
-- =====================================================
-- This migration creates a partitioned version of vetmed_administrations
-- using range partitioning by recorded_at timestamp (monthly partitions)
-- with zero-downtime migration strategy

-- Step 1: Create partitioned table structure
-- ==========================================
CREATE TABLE vetmed_administrations_partitioned
(
    id                        uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    regimen_id                uuid                                                           NOT NULL,
    animal_id                 uuid                                                           NOT NULL,
    household_id              uuid                                                           NOT NULL,
    caregiver_id              uuid                                                           NOT NULL,
    scheduled_for             timestamp with time zone,
    recorded_at               timestamp with time zone                                       NOT NULL,
    status                    vetmed_admin_status                                            NOT NULL,
    source_item_id            uuid,
    site                      text,
    dose                      text,
    notes                     text,
    media_urls                text[],
    co_sign_user_id           uuid,
    co_signed_at              timestamp with time zone,
    co_sign_notes             text,
    adverse_event             boolean                  DEFAULT false                         NOT NULL,
    adverse_event_description text,
    idempotency_key           text                                                           NOT NULL,
    created_at                timestamp with time zone DEFAULT now()                         NOT NULL,
    updated_at                timestamp with time zone DEFAULT now()                         NOT NULL,

    -- Constraints
    CONSTRAINT vetmed_administrations_partitioned_idempotency_key_unique UNIQUE (idempotency_key)
) PARTITION BY RANGE (recorded_at);

-- Step 2: Create initial partition set (previous 6 months + current + next 12 months)
-- ==============================================================================

-- Historical partitions (previous 6 months)
CREATE TABLE vetmed_administrations_2024_07
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2024-07-01 00:00:00+00'
) TO
(
    '2024-08-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2024_08
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2024-08-01 00:00:00+00'
) TO
(
    '2024-09-01 00:00:00+00'
);

-- Current month and future partitions
CREATE TABLE vetmed_administrations_2025_01
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-01-01 00:00:00+00'
) TO
(
    '2025-02-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_02
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-02-01 00:00:00+00'
) TO
(
    '2025-03-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_03
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-03-01 00:00:00+00'
) TO
(
    '2025-04-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_04
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-04-01 00:00:00+00'
) TO
(
    '2025-05-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_05
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-05-01 00:00:00+00'
) TO
(
    '2025-06-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_06
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-06-01 00:00:00+00'
) TO
(
    '2025-07-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_07
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-07-01 00:00:00+00'
) TO
(
    '2025-08-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_08
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-08-01 00:00:00+00'
) TO
(
    '2025-09-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_09
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-09-01 00:00:00+00'
) TO
(
    '2025-10-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_10
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-10-01 00:00:00+00'
) TO
(
    '2025-11-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_11
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-11-01 00:00:00+00'
) TO
(
    '2025-12-01 00:00:00+00'
);

CREATE TABLE vetmed_administrations_2025_12
    PARTITION OF vetmed_administrations_partitioned
    FOR VALUES FROM
(
    '2025-12-01 00:00:00+00'
) TO
(
    '2026-01-01 00:00:00+00'
);

-- Step 3: Create indexes on partitioned table
-- ===========================================

-- Primary performance indexes on parent table (will be inherited by partitions)
CREATE INDEX admin_partitioned_animal_id_idx ON vetmed_administrations_partitioned
    USING btree (animal_id uuid_ops);

CREATE INDEX admin_partitioned_household_id_idx ON vetmed_administrations_partitioned
    USING btree (household_id uuid_ops);

CREATE INDEX admin_partitioned_regimen_id_idx ON vetmed_administrations_partitioned
    USING btree (regimen_id uuid_ops);

CREATE INDEX admin_partitioned_recorded_at_idx ON vetmed_administrations_partitioned
    USING btree (recorded_at timestamptz_ops);

CREATE INDEX admin_partitioned_scheduled_for_idx ON vetmed_administrations_partitioned
    USING btree (scheduled_for timestamptz_ops);

CREATE INDEX admin_partitioned_status_idx ON vetmed_administrations_partitioned
    USING btree (status enum_ops);

CREATE INDEX admin_partitioned_idempotency_key_idx ON vetmed_administrations_partitioned
    USING btree (idempotency_key text_ops);

-- Composite indexes for common query patterns
CREATE INDEX admin_partitioned_household_recorded_at_idx ON vetmed_administrations_partitioned
    USING btree (household_id uuid_ops, recorded_at timestamptz_ops DESC);

CREATE INDEX admin_partitioned_animal_recorded_at_idx ON vetmed_administrations_partitioned
    USING btree (animal_id uuid_ops, recorded_at timestamptz_ops DESC);

CREATE INDEX admin_partitioned_regimen_recorded_at_idx ON vetmed_administrations_partitioned
    USING btree (regimen_id uuid_ops, recorded_at timestamptz_ops DESC);

-- Step 4: Add foreign key constraints
-- ===================================

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_regimen_id_fk
        FOREIGN KEY (regimen_id) REFERENCES vetmed_regimens (id);

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_animal_id_fk
        FOREIGN KEY (animal_id) REFERENCES vetmed_animals (id);

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id);

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_caregiver_id_fk
        FOREIGN KEY (caregiver_id) REFERENCES vetmed_users (id);

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_co_sign_user_id_fk
        FOREIGN KEY (co_sign_user_id) REFERENCES vetmed_users (id);

ALTER TABLE vetmed_administrations_partitioned
    ADD CONSTRAINT vetmed_administrations_partitioned_source_item_id_fk
        FOREIGN KEY (source_item_id) REFERENCES vetmed_inventory_items (id);

-- Step 5: Create partition-specific indexes for optimal performance
-- ================================================================

-- Create optimized indexes on each individual partition
DO
$$
DECLARE
partition_name TEXT;
    partition_names
TEXT[] := ARRAY[
        'vetmed_administrations_2024_07',
        'vetmed_administrations_2024_08',
        'vetmed_administrations_2025_01',
        'vetmed_administrations_2025_02',
        'vetmed_administrations_2025_03',
        'vetmed_administrations_2025_04',
        'vetmed_administrations_2025_05',
        'vetmed_administrations_2025_06',
        'vetmed_administrations_2025_07',
        'vetmed_administrations_2025_08',
        'vetmed_administrations_2025_09',
        'vetmed_administrations_2025_10',
        'vetmed_administrations_2025_11',
        'vetmed_administrations_2025_12'
    ];
BEGIN
    FOREACH
partition_name IN ARRAY partition_names LOOP
        -- Primary key index (automatically created but we can optimize)
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_pkey ON %I USING btree (id uuid_ops)', 
                      partition_name, partition_name);
        
        -- Partition pruning optimization index (recorded_at is the partition key)
EXECUTE format('CREATE INDEX IF NOT EXISTS %I_recorded_at_idx ON %I USING btree (recorded_at timestamptz_ops)',
               partition_name, partition_name);
END LOOP;
END $$;

-- Step 6: Create statistics for query planning optimization
-- =========================================================

-- Gather statistics on partitioned table
ANALYZE
vetmed_administrations_partitioned;

-- Step 7: Performance validation queries
-- ======================================

-- Query to verify partition pruning is working
-- This should show only the relevant partition in the execution plan
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM vetmed_administrations_partitioned 
-- WHERE recorded_at >= '2025-01-01' AND recorded_at < '2025-02-01';

-- Query to verify constraint exclusion is working
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT COUNT(*) FROM vetmed_administrations_partitioned 
-- WHERE recorded_at >= '2025-06-01' AND recorded_at < '2025-07-01';

COMMENT
ON TABLE vetmed_administrations_partitioned IS
'Partitioned version of vetmed_administrations table. 
Partitioned by recorded_at timestamp using monthly range partitions.
Created for improved performance on large-scale medication administration data.';

-- Enable row-level security to match original table (if needed)
-- ALTER TABLE vetmed_administrations_partitioned ENABLE ROW LEVEL SECURITY;

-- Optimization settings for partitioned table
ALTER TABLE vetmed_administrations_partitioned SET (
    autovacuum_enabled = true,
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
    );