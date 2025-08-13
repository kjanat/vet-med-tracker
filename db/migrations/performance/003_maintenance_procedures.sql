-- Database Maintenance and Optimization Procedures
-- Automated maintenance tasks for optimal performance

-- =====================================================
-- AUTOMATED VACUUM AND ANALYZE PROCEDURES
-- =====================================================

-- Function to perform intelligent maintenance based on table activity
CREATE
OR REPLACE FUNCTION perform_intelligent_maintenance()
RETURNS TABLE (
    table_name TEXT,
    maintenance_action TEXT,
    before_size TEXT,
    after_size TEXT,
    improvement TEXT
) AS $$
DECLARE
rec RECORD;
    before_size
BIGINT;
    after_size
BIGINT;
    bloat_threshold
NUMERIC := 20.0;
BEGIN
    -- Check each vetmed table for maintenance needs
FOR rec IN
SELECT t.tablename,
       s.n_live_tup,
       s.n_dead_tup,
       CASE
           WHEN s.n_live_tup > 0
               THEN ROUND(100.0 * s.n_dead_tup / (s.n_live_tup + s.n_dead_tup), 2)
           ELSE 0
           END as bloat_pct,
       s.last_vacuum,
       s.last_autovacuum,
       s.last_analyze,
       s.last_autoanalyze
FROM pg_tables t
         JOIN pg_stat_user_tables s ON t.tablename = s.relname
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'vetmed_%'
ORDER BY s.n_dead_tup DESC
    LOOP
-- Get current size
SELECT pg_total_relation_size(rec.tablename)
INTO before_size;

-- Determine maintenance action needed
IF
rec.bloat_pct > bloat_threshold OR rec.n_dead_tup > 1000 THEN
            -- High bloat - perform VACUUM FULL (use with caution in production)
            EXECUTE format('VACUUM ANALYZE %I', rec.tablename);

SELECT pg_total_relation_size(rec.tablename)
INTO after_size;

RETURN QUERY SELECT
                rec.tablename,
                'VACUUM ANALYZE'::TEXT,
                pg_size_pretty(before_size),
                pg_size_pretty(after_size),
                CASE 
                    WHEN after_size < before_size 
                    THEN format('Reduced by %s', pg_size_pretty(before_size - after_size))
                    ELSE 'No size reduction'
END;
                
        ELSIF
rec.last_analyze IS NULL OR rec.last_analyze < NOW() - INTERVAL '7 days' THEN
            -- Needs fresh statistics
            EXECUTE format('ANALYZE %I', rec.tablename);

RETURN QUERY SELECT
                rec.tablename,
                'ANALYZE'::TEXT,
                pg_size_pretty(before_size),
                pg_size_pretty(before_size),
                'Statistics updated'::TEXT;
END IF;
END LOOP;
    
    RETURN;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- INDEX MAINTENANCE AND OPTIMIZATION
-- =====================================================

-- Function to rebuild indexes with low efficiency
CREATE
OR REPLACE FUNCTION rebuild_inefficient_indexes()
RETURNS TABLE (
    index_name TEXT,
    action TEXT,
    size_before TEXT,
    size_after TEXT,
    result TEXT
) AS $$
DECLARE
idx_rec RECORD;
    size_before
BIGINT;
    size_after
BIGINT;
BEGIN
    -- Find indexes with poor performance characteristics
FOR idx_rec IN
SELECT i.indexname,
       i.tablename,
       i.idx_scan,
       i.idx_tup_read,
       i.idx_tup_fetch,
       pg_relation_size(i.indexrelid) as index_size
FROM pg_stat_user_indexes i
         JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE i.schemaname = 'public'
  AND i.tablename LIKE 'vetmed_%'
  AND (
    -- High bloat indicators
    (i.idx_tup_read > 0 AND i.idx_tup_fetch::float / i.idx_tup_read < 0.1)
        OR
        -- Large unused indexes
    (i.idx_scan = 0 AND pg_relation_size(i.indexrelid) > 10485760) -- 10MB
    )
    LOOP
        size_before := pg_relation_size(idx_rec.indexname);

IF
idx_rec.idx_scan = 0 AND NOT idx_rec.indexname LIKE '%_pkey' THEN
            -- Consider dropping unused non-primary indexes
            RETURN QUERY
SELECT idx_rec.indexname,
       'RECOMMEND DROP'::TEXT, pg_size_pretty(size_before),
       '0 bytes'::TEXT, format('Unused index consuming %s', pg_size_pretty(size_before));

ELSIF
idx_rec.idx_tup_read > 0 AND idx_rec.idx_tup_fetch::float / idx_rec.idx_tup_read < 0.1 THEN
            -- Low fetch ratio indicates potential bloat
            EXECUTE format('REINDEX INDEX %I', idx_rec.indexname);
            
            size_after
:= pg_relation_size(idx_rec.indexname);

RETURN QUERY SELECT
                idx_rec.indexname,
                'REINDEXED'::TEXT,
                pg_size_pretty(size_before),
                pg_size_pretty(size_after),
                CASE 
                    WHEN size_after < size_before 
                    THEN format('Reduced by %s', pg_size_pretty(size_before - size_after))
                    ELSE 'No significant change'
END;
END IF;
END LOOP;
    
    RETURN;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- QUERY PERFORMANCE MONITORING
-- =====================================================

-- Function to identify and log slow queries
CREATE
OR REPLACE FUNCTION monitor_slow_queries(
    threshold_ms NUMERIC DEFAULT 100
)
RETURNS TABLE (
    query_hash TEXT,
    query_text TEXT,
    avg_time_ms NUMERIC,
    total_calls BIGINT,
    total_time_ms NUMERIC,
    hit_ratio NUMERIC
) AS $$
BEGIN
RETURN QUERY
SELECT encode(sha256(pss.query::bytea), 'hex') as query_hash, LEFT (pss.query, 200) as query_text, ROUND(pss.mean_exec_time:: numeric, 2) as avg_time_ms, pss.calls as total_calls, ROUND(pss.total_exec_time:: numeric, 2) as total_time_ms, ROUND(
    CASE
    WHEN (pss.shared_blks_hit + pss.shared_blks_read) > 0
    THEN 100.0 * pss.shared_blks_hit / (pss.shared_blks_hit + pss.shared_blks_read)
    ELSE 0
    END, 2
    ) as hit_ratio
FROM pg_stat_statements pss
WHERE pss.mean_exec_time
    > threshold_ms
  AND pss.calls
    > 10
  AND pss.query LIKE '%vetmed_%'
ORDER BY pss.total_exec_time DESC
    LIMIT 20;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- CONNECTION AND LOCK MONITORING
-- =====================================================

-- Function to detect blocking queries and deadlocks
CREATE
OR REPLACE FUNCTION detect_blocking_queries()
RETURNS TABLE (
    blocked_pid INTEGER,
    blocked_user TEXT,
    blocked_query TEXT,
    blocking_pid INTEGER,
    blocking_user TEXT,
    blocking_query TEXT,
    block_duration INTERVAL
) AS $$
BEGIN
RETURN QUERY
SELECT blocked_activity.pid     as blocked_pid,
       blocked_activity.usename as blocked_user, LEFT (blocked_activity.query, 100) as blocked_query, blocking_activity.pid as blocking_pid, blocking_activity.usename as blocking_user, LEFT (blocking_activity.query, 100) as blocking_query, NOW() - blocked_activity.query_start as block_duration
FROM pg_stat_activity blocked_activity
    JOIN pg_locks blocked_locks
ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_locks blocking_locks ON (
    blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
    )
    JOIN pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
WHERE NOT blocked_locks.granted
  AND blocked_activity.query LIKE '%vetmed_%'
ORDER BY block_duration DESC;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATED PERFORMANCE OPTIMIZATION
-- =====================================================

-- Comprehensive performance optimization procedure
CREATE
OR REPLACE FUNCTION optimize_database_performance()
RETURNS JSON AS $$
DECLARE
optimization_report JSON;
    maintenance_results
JSON;
    index_results
JSON;
    slow_queries
JSON;
    blocking_queries
JSON;
BEGIN
    -- Perform table maintenance
SELECT json_agg(row_to_json(t))
INTO maintenance_results
FROM perform_intelligent_maintenance() t;

-- Rebuild inefficient indexes
SELECT json_agg(row_to_json(i))
INTO index_results
FROM rebuild_inefficient_indexes() i;

-- Identify slow queries
SELECT json_agg(row_to_json(s))
INTO slow_queries
FROM monitor_slow_queries(100) s;

-- Check for blocking queries
SELECT json_agg(row_to_json(b))
INTO blocking_queries
FROM detect_blocking_queries() b;

-- Compile comprehensive report
SELECT json_build_object(
               'timestamp', NOW(),
               'maintenance_performed', COALESCE(maintenance_results, '[]'::json),
               'index_optimization', COALESCE(index_results, '[]'::json),
               'slow_queries_detected', COALESCE(slow_queries, '[]'::json),
               'blocking_queries_detected', COALESCE(blocking_queries, '[]'::json),
               'recommendations', json_build_array(
                       CASE
                           WHEN json_array_length(COALESCE(slow_queries, '[]'::json)) > 5
                               THEN 'High number of slow queries detected - review query optimization'
                           ELSE NULL
                           END,
                       CASE
                           WHEN json_array_length(COALESCE(blocking_queries, '[]'::json)) > 0
                               THEN 'Blocking queries detected - review transaction management'
                           ELSE NULL
                           END,
                       'Regular maintenance completed successfully'
                                  )
       )
INTO optimization_report;

RETURN optimization_report;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE ALERTING
-- =====================================================

-- Function to check critical performance thresholds
CREATE
OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    metric_value TEXT,
    threshold TEXT
) AS $$
DECLARE
cache_hit_ratio NUMERIC;
    active_connections
INTEGER;
    long_running_queries
INTEGER;
    table_bloat_count
INTEGER;
BEGIN
    -- Check cache hit ratio
SELECT ROUND(
               100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2
       )
INTO cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

IF
cache_hit_ratio < 90 THEN
        RETURN QUERY
SELECT 'CACHE_HIT_RATIO'::TEXT, 'WARNING'::TEXT, 'Database cache hit ratio is below optimal threshold'::TEXT, cache_hit_ratio::TEXT || '%', '90%'::TEXT;
END IF;
    
    -- Check active connections
SELECT count(*)
INTO active_connections
FROM pg_stat_activity
WHERE state = 'active'
  AND backend_type = 'client backend';

IF
active_connections > 50 THEN
        RETURN QUERY
SELECT 'HIGH_CONNECTION_COUNT'::TEXT, 'WARNING'::TEXT, 'High number of active database connections'::TEXT, active_connections::TEXT, '50'::TEXT;
END IF;
    
    -- Check for long-running queries
SELECT count(*)
INTO long_running_queries
FROM pg_stat_activity
WHERE state = 'active'
  AND NOW() - query_start > INTERVAL '5 minutes'
  AND backend_type = 'client backend';

IF
long_running_queries > 0 THEN
        RETURN QUERY
SELECT 'LONG_RUNNING_QUERIES'::TEXT, 'CRITICAL'::TEXT, 'Long-running queries detected (>5 minutes)'::TEXT, long_running_queries::TEXT, '0'::TEXT;
END IF;
    
    -- Check table bloat
SELECT count(*)
INTO table_bloat_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'vetmed_%'
  AND n_live_tup > 0
  AND ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) > 25;

IF
table_bloat_count > 0 THEN
        RETURN QUERY
SELECT 'TABLE_BLOAT'::TEXT, 'WARNING'::TEXT, 'Tables with high bloat detected'::TEXT, table_bloat_count::TEXT || ' tables', '0 tables'::TEXT;
END IF;
    
    RETURN;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED MAINTENANCE SETUP
-- =====================================================

-- Create a maintenance log table
CREATE TABLE IF NOT EXISTS vetmed_maintenance_log
(
    id
    SERIAL
    PRIMARY
    KEY,
    maintenance_type
    TEXT
    NOT
    NULL,
    started_at
    TIMESTAMP
    WITH
    TIME
    ZONE
    DEFAULT
    NOW
(
),
    completed_at TIMESTAMP WITH TIME ZONE,
                               status TEXT DEFAULT 'RUNNING',
                               report JSON,
                               error_message TEXT
                               );

-- Function to log maintenance operations
CREATE
OR REPLACE FUNCTION log_maintenance_operation(
    maintenance_type TEXT,
    maintenance_report JSON DEFAULT NULL,
    error_msg TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
log_id UUID := gen_random_uuid();
    operation_status
TEXT := CASE WHEN error_msg IS NULL THEN 'COMPLETED' ELSE 'FAILED'
END;
BEGIN
INSERT INTO vetmed_maintenance_log (id, maintenance_type, completed_at, status, report, error_message)
VALUES (log_id, maintenance_type, NOW(), operation_status, maintenance_report, error_msg);

RETURN log_id;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- EXAMPLE USAGE AND SCHEDULING
-- =====================================================

/*
-- Example: Run comprehensive optimization
SELECT optimize_database_performance();

-- Example: Check for performance alerts
SELECT * FROM check_performance_alerts();

-- Example: Monitor slow queries
SELECT * FROM monitor_slow_queries(50); -- Queries slower than 50ms

-- Example: Check for blocking queries
SELECT * FROM detect_blocking_queries();

-- Example: Perform maintenance on specific table
SELECT * FROM perform_intelligent_maintenance();

-- Example: Rebuild inefficient indexes
SELECT * FROM rebuild_inefficient_indexes();

-- For production scheduling, consider using pg_cron extension:
-- SELECT cron.schedule('database-optimization', '0 2 * * 0', 'SELECT optimize_database_performance();');
-- SELECT cron.schedule('performance-alerts', '*/
15 * * * *', '
SELECT check_performance_alerts();
');
*/

-- Create indexes on maintenance log for efficient querying
CREATE INDEX IF NOT EXISTS idx_maintenance_log_type_started 
ON vetmed_maintenance_log(maintenance_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_log_status_completed 
ON vetmed_maintenance_log(status, completed_at DESC);

-- Final optimization - update statistics for all new objects
ANALYZE;

-- Log the completion of this maintenance script
SELECT log_maintenance_operation(
    'PERFORMANCE_OPTIMIZATION_SETUP',
    json_build_object(
        'indexes_created', 'comprehensive_performance_indexes',
        'procedures_installed', 'maintenance_and_monitoring',
        'status', 'ready_for_production'
    )
);