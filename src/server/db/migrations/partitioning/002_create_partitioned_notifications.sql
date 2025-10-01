-- =====================================================
-- VetMed Tracker - Notifications Table Partitioning
-- =====================================================
-- This migration creates a partitioned version of vetmed_notifications
-- using range partitioning by created_at timestamp (monthly partitions)

-- Step 1: Create partitioned table structure
-- ==========================================
CREATE TABLE vetmed_notifications_partitioned
(
    id           uuid                     DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    user_id      uuid                                                           NOT NULL,
    household_id uuid                                                           NOT NULL,
    type         text                                                           NOT NULL,
    title        text                                                           NOT NULL,
    message      text                                                           NOT NULL,
    priority     text                     DEFAULT 'medium'                      NOT NULL,
    read         boolean                  DEFAULT false                         NOT NULL,
    dismissed    boolean                  DEFAULT false                         NOT NULL,
    action_url   text,
    data         jsonb,
    created_at   timestamp with time zone DEFAULT now()                         NOT NULL,
    read_at      timestamp with time zone,
    dismissed_at timestamp with time zone
) PARTITION BY RANGE (created_at);

-- Step 2: Create initial partition set (previous 6 months + current + next 12 months)
-- ==============================================================================

-- Historical partitions (previous 6 months)
CREATE TABLE vetmed_notifications_2024_07
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2024-07-01 00:00:00+00'
) TO
(
    '2024-08-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2024_08
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2024-08-01 00:00:00+00'
) TO
(
    '2024-09-01 00:00:00+00'
);

-- Current month and future partitions
CREATE TABLE vetmed_notifications_2025_01
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-01-01 00:00:00+00'
) TO
(
    '2025-02-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_02
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-02-01 00:00:00+00'
) TO
(
    '2025-03-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_03
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-03-01 00:00:00+00'
) TO
(
    '2025-04-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_04
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-04-01 00:00:00+00'
) TO
(
    '2025-05-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_05
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-05-01 00:00:00+00'
) TO
(
    '2025-06-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_06
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-06-01 00:00:00+00'
) TO
(
    '2025-07-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_07
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-07-01 00:00:00+00'
) TO
(
    '2025-08-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_08
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-08-01 00:00:00+00'
) TO
(
    '2025-09-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_09
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-09-01 00:00:00+00'
) TO
(
    '2025-10-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_10
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-10-01 00:00:00+00'
) TO
(
    '2025-11-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_11
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-11-01 00:00:00+00'
) TO
(
    '2025-12-01 00:00:00+00'
);

CREATE TABLE vetmed_notifications_2025_12
    PARTITION OF vetmed_notifications_partitioned
    FOR VALUES FROM
(
    '2025-12-01 00:00:00+00'
) TO
(
    '2026-01-01 00:00:00+00'
);

-- Step 3: Create indexes on partitioned table
-- ===========================================

-- Primary performance indexes
CREATE INDEX notification_partitioned_user_read_idx ON vetmed_notifications_partitioned
    USING btree (user_id uuid_ops, read bool_ops);

CREATE INDEX notification_partitioned_household_idx ON vetmed_notifications_partitioned
    USING btree (household_id uuid_ops);

CREATE INDEX notification_partitioned_created_at_idx ON vetmed_notifications_partitioned
    USING btree (created_at timestamptz_ops DESC);

CREATE INDEX notification_partitioned_type_idx ON vetmed_notifications_partitioned
    USING btree (type text_ops);

-- Composite indexes for common query patterns
CREATE INDEX notification_partitioned_user_created_at_idx ON vetmed_notifications_partitioned
    USING btree (user_id uuid_ops, created_at timestamptz_ops DESC);

CREATE INDEX notification_partitioned_household_created_at_idx ON vetmed_notifications_partitioned
    USING btree (household_id uuid_ops, created_at timestamptz_ops DESC);

CREATE INDEX notification_partitioned_user_unread_idx ON vetmed_notifications_partitioned
    USING btree (user_id uuid_ops, created_at timestamptz_ops DESC)
    WHERE read = false AND dismissed = false;

CREATE INDEX notification_partitioned_priority_unread_idx ON vetmed_notifications_partitioned
    USING btree (priority text_ops, created_at timestamptz_ops DESC)
    WHERE read = false AND dismissed = false;

-- Step 4: Add foreign key constraints
-- ===================================

ALTER TABLE vetmed_notifications_partitioned
    ADD CONSTRAINT vetmed_notifications_partitioned_user_id_fk
        FOREIGN KEY (user_id) REFERENCES vetmed_users (id) ON DELETE CASCADE;

ALTER TABLE vetmed_notifications_partitioned
    ADD CONSTRAINT vetmed_notifications_partitioned_household_id_fk
        FOREIGN KEY (household_id) REFERENCES vetmed_households (id) ON DELETE CASCADE;

-- Step 5: Create partition-specific indexes for optimal performance
-- ================================================================

DO
$$
DECLARE
partition_name TEXT;
    partition_names
TEXT[] := ARRAY[
        'vetmed_notifications_2024_07',
        'vetmed_notifications_2024_08',
        'vetmed_notifications_2025_01',
        'vetmed_notifications_2025_02',
        'vetmed_notifications_2025_03',
        'vetmed_notifications_2025_04',
        'vetmed_notifications_2025_05',
        'vetmed_notifications_2025_06',
        'vetmed_notifications_2025_07',
        'vetmed_notifications_2025_08',
        'vetmed_notifications_2025_09',
        'vetmed_notifications_2025_10',
        'vetmed_notifications_2025_11',
        'vetmed_notifications_2025_12'
    ];
BEGIN
    FOREACH
partition_name IN ARRAY partition_names LOOP
        -- Partition pruning optimization index
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I_created_at_idx ON %I USING btree (created_at timestamptz_ops DESC)', 
                      partition_name, partition_name);
        
        -- User-specific queries optimization
EXECUTE format('CREATE INDEX IF NOT EXISTS %I_user_id_idx ON %I USING btree (user_id uuid_ops)',
               partition_name, partition_name);
END LOOP;
END $$;

-- Step 6: Create statistics for query planning optimization
-- =========================================================
ANALYZE
vetmed_notifications_partitioned;

COMMENT
ON TABLE vetmed_notifications_partitioned IS
'Partitioned version of vetmed_notifications table. 
Partitioned by created_at timestamp using monthly range partitions.
Created for improved performance on high-volume notification data.';

-- Optimization settings for partitioned table
ALTER TABLE vetmed_notifications_partitioned SET (
    autovacuum_enabled = true,
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    -- More aggressive cleanup for notification data
    autovacuum_vacuum_cost_delay = 10
    );