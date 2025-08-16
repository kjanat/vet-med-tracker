-- Query Performance Monitoring and Optimization Queries
-- This file contains queries for monitoring database performance and identifying bottlenecks

-- =====================================================
-- SLOW QUERY IDENTIFICATION
-- =====================================================

-- Enable pg_stat_statements extension for query monitoring
CREATE
EXTENSION IF NOT EXISTS pg_stat_statements;

-- View for identifying slowest queries
CREATE
OR REPLACE VIEW v_slow_queries AS
SELECT query,
       calls,
       total_exec_time,
       mean_exec_time,
       max_exec_time,
       stddev_exec_time, rows as total_rows, 100.0 * shared_blks_hit / nullif (shared_blks_hit + shared_blks_read, 0) AS hit_percent, total_exec_time / calls as avg_time_ms
FROM pg_stat_statements
WHERE query LIKE '%vetmed_%'
  AND calls
    > 10
ORDER BY total_exec_time DESC;

-- =====================================================
-- INDEX USAGE ANALYSIS
-- =====================================================

-- View for index usage statistics
CREATE
OR REPLACE VIEW v_index_usage AS
SELECT t.tablename,
       i.indexname,
       i.idx_scan                                     as scans,
       i.idx_tup_read                                 as tuples_read,
       i.idx_tup_fetch                                as tuples_fetched,
       t.seq_scan                                     as table_sequential_scans,
       t.seq_tup_read                                 as table_sequential_reads,
       CASE
           WHEN i.idx_scan = 0 THEN 'UNUSED'
           WHEN i.idx_scan < 10 THEN 'LOW_USAGE'
           WHEN i.idx_scan < 100 THEN 'MEDIUM_USAGE'
           ELSE 'HIGH_USAGE'
           END                                        as usage_category,
       pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size
FROM pg_stat_user_indexes i
         JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE i.schemaname = 'public'
  AND t.tablename LIKE 'vetmed_%'
ORDER BY i.idx_scan DESC;

-- =====================================================
-- TABLE BLOAT ANALYSIS
-- =====================================================

-- View for identifying table bloat
CREATE
OR REPLACE VIEW v_table_bloat AS
SELECT schemaname,
       tablename,
       n_live_tup                                                             as live_tuples,
       n_dead_tup                                                             as dead_tuples,
       CASE
           WHEN n_live_tup > 0
               THEN ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
           ELSE 0
           END                                                                as bloat_percentage,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
       last_vacuum,
       last_autovacuum,
       last_analyze,
       last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'vetmed_%'
ORDER BY n_dead_tup DESC;

-- =====================================================
-- CONNECTION AND LOCK MONITORING
-- =====================================================

-- View for active connections and potential blocking
CREATE
OR REPLACE VIEW v_active_connections AS
SELECT pid,
       usename,
       application_name,
       client_addr,
       state,
       query_start,
       now() - query_start as query_duration,
       waiting,
       query
FROM pg_stat_activity
WHERE state != 'idle'
    AND query LIKE '%vetmed_%'
ORDER BY query_start;

-- View for lock conflicts
CREATE
OR REPLACE VIEW v_lock_conflicts AS
SELECT blocked_locks.pid         as blocked_pid,
       blocked_activity.usename  as blocked_user,
       blocking_locks.pid        as blocking_pid,
       blocking_activity.usename as blocking_user,
       blocked_activity.query    as blocked_statement,
       blocking_activity.query   as blocking_statement
FROM pg_catalog.pg_locks blocked_locks
         JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
         JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.DATABASE IS NOT DISTINCT
FROM blocked_locks.DATABASE
    AND blocking_locks.relation IS NOT DISTINCT
FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT
FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT
FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT
FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT
FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT
FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT
FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT
FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity
ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- =====================================================
-- CACHE HIT RATIOS
-- =====================================================

-- View for buffer cache hit ratios
CREATE
OR REPLACE VIEW v_cache_hit_ratios AS
SELECT 'Database' as cache_type,
       ROUND(
               100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2
       )          as hit_ratio
FROM pg_stat_database
WHERE datname = current_database()

UNION ALL

SELECT 'Tables' as cache_type,
       ROUND(
               100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2
       )        as hit_ratio
FROM pg_stat_user_tables

UNION ALL

SELECT 'Indexes' as cache_type,
       ROUND(
               100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0), 2
       )         as hit_ratio
FROM pg_stat_user_indexes;

-- =====================================================
-- QUERY PERFORMANCE ANALYSIS FUNCTIONS
-- =====================================================

-- Function to analyze query performance for a specific time period
CREATE
OR REPLACE FUNCTION analyze_query_performance(
    hours_back INTEGER DEFAULT 24
) 
RETURNS TABLE (
    query_type TEXT,
    avg_execution_time NUMERIC,
    total_calls BIGINT,
    total_time NUMERIC,
    cache_hit_ratio NUMERIC
) AS $$
BEGIN
RETURN QUERY
SELECT CASE
           WHEN pss.query LIKE '%INSERT%' THEN 'INSERT'
           WHEN pss.query LIKE '%UPDATE%' THEN 'UPDATE'
           WHEN pss.query LIKE '%DELETE%' THEN 'DELETE'
           WHEN pss.query LIKE '%SELECT%' THEN 'SELECT'
           ELSE 'OTHER'
           END                                                                                       as query_type,
       ROUND(pss.mean_exec_time::numeric, 2)                                                         as avg_execution_time,
       pss.calls                                                                                     as total_calls,
       ROUND(pss.total_exec_time::numeric, 2)                                                        as total_time,
       ROUND(100.0 * pss.shared_blks_hit / NULLIF(pss.shared_blks_hit + pss.shared_blks_read, 0), 2) as cache_hit_ratio
FROM pg_stat_statements pss
WHERE pss.query LIKE '%vetmed_%'
  AND pss.calls > 0
ORDER BY pss.total_exec_time DESC;
END;
$$
LANGUAGE plpgsql;

-- Function to get table size and growth information
CREATE
OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    total_size TEXT,
    table_size TEXT,
    index_size TEXT,
    row_count BIGINT,
    size_bytes BIGINT
) AS $$
BEGIN
RETURN QUERY
SELECT t.tablename::text as table_name, pg_size_pretty(pg_total_relation_size(t.schemaname || '.' || t.tablename)) as total_size,
       pg_size_pretty(pg_relation_size(t.schemaname || '.' || t.tablename)) as table_size,
       pg_size_pretty(pg_indexes_size(t.schemaname || '.' || t.tablename))  as index_size,
       s.n_live_tup                                                         as row_count,
       pg_total_relation_size(t.schemaname || '.' || t.tablename)           as size_bytes
FROM pg_tables t
         JOIN pg_stat_user_tables s ON t.tablename = s.relname
WHERE t.schemaname = 'public'
  AND t.tablename LIKE 'vetmed_%'
ORDER BY pg_total_relation_size(t.schemaname || '.' || t.tablename) DESC;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- =====================================================

-- Function to automatically reindex tables with high bloat
CREATE
OR REPLACE FUNCTION auto_maintenance_check()
RETURNS TEXT AS $$
DECLARE
rec RECORD;
    maintenance_log
TEXT := '';
    bloat_threshold
NUMERIC := 25.0; -- 25% bloat threshold
BEGIN
    -- Check for tables with high bloat
FOR rec IN
SELECT tablename, bloat_percentage
FROM v_table_bloat
WHERE bloat_percentage > bloat_threshold LOOP
        maintenance_log := maintenance_log || 'HIGH BLOAT DETECTED: ' || rec.tablename || 
                          ' (' || rec.bloat_percentage || '%)' || chr(10);

-- Log recommendation (don't auto-execute REINDEX in production)
maintenance_log
:= maintenance_log || 'RECOMMEND: REINDEX TABLE ' || rec.tablename || chr(10);
END LOOP;
    
    -- Check for unused indexes
FOR rec IN
SELECT indexname, tablename
FROM v_index_usage
WHERE usage_category = 'UNUSED'
  AND indexname NOT LIKE '%_pkey' LOOP
        maintenance_log := maintenance_log || 'UNUSED INDEX: ' || rec.indexname || 
                          ' on table ' || rec.tablename || chr(10);
maintenance_log
:= maintenance_log || 'RECOMMEND: Consider dropping if truly unused' || chr(10);
END LOOP;
    
    -- Check cache hit ratios
FOR rec IN
SELECT cache_type, hit_ratio
FROM v_cache_hit_ratios
WHERE hit_ratio < 95.0 LOOP
        maintenance_log := maintenance_log || 'LOW CACHE HIT RATIO: ' || rec.cache_type || 
                          ' (' || rec.hit_ratio || '%)' || chr(10);
END LOOP;
    
    IF
maintenance_log = '' THEN
        RETURN 'All systems performing within normal parameters';
ELSE
        RETURN maintenance_log;
END IF;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE BASELINES
-- =====================================================

-- Create a baseline performance snapshot
CREATE
OR REPLACE FUNCTION create_performance_baseline()
RETURNS JSON AS $$
DECLARE
baseline JSON;
BEGIN
SELECT json_build_object(
               'timestamp', now(),
               'database_size', pg_size_pretty(pg_database_size(current_database())),
               'table_sizes', (SELECT json_agg(row_to_json(t)) FROM get_table_sizes() t),
               'cache_ratios', (SELECT json_agg(row_to_json(c)) FROM v_cache_hit_ratios c),
               'index_usage',
               (SELECT json_agg(row_to_json(i)) FROM v_index_usage i WHERE usage_category = 'HIGH_USAGE'),
               'connection_count', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')
       )
INTO baseline;

RETURN baseline;
END;
$$
LANGUAGE plpgsql;

-- =====================================================
-- EXAMPLE USAGE QUERIES
-- =====================================================

-- Example: Check current performance status
-- SELECT * FROM auto_maintenance_check();

-- Example: Get slow queries
-- SELECT * FROM v_slow_queries LIMIT 10;

-- Example: Check index usage
-- SELECT * FROM v_index_usage WHERE usage_category IN ('UNUSED', 'LOW_USAGE');

-- Example: Monitor cache hit ratios
-- SELECT * FROM v_cache_hit_ratios;

-- Example: Create performance baseline
-- SELECT create_performance_baseline();

-- Example: Analyze query performance for last 24 hours
-- SELECT * FROM analyze_query_performance(24);