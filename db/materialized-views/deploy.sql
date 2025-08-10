-- Materialized Views Deployment Script
-- Run this script to deploy all materialized views and supporting infrastructure
-- Estimated deployment time: 2-5 minutes depending on data volume

-- Set deployment parameters
\set ON_ERROR_STOP on
\timing on

BEGIN;

-- Log deployment start
DO $$ 
BEGIN
    RAISE NOTICE 'Starting materialized views deployment at %', NOW();
END $$;

-- Step 1: Create refresh logging table
RAISE NOTICE 'Step 1: Creating refresh log table...';
\i refresh_functions.sql

-- Step 2: Create materialized views
RAISE NOTICE 'Step 2: Creating materialized views...';

-- Create compliance statistics view
\echo 'Creating mv_compliance_stats...'
\i 001_compliance_statistics.sql

-- Create medication usage view  
\echo 'Creating mv_medication_usage...'
\i 002_medication_usage.sql

-- Create inventory consumption view
\echo 'Creating mv_inventory_consumption...'
\i 003_inventory_consumption.sql

-- Create animal health trends view
\echo 'Creating mv_animal_health_trends...'
\i 004_animal_health_trends.sql

-- Step 3: Set up automated refresh (if pg_cron available)
RAISE NOTICE 'Step 3: Setting up automated refresh...';
\i automated_refresh.sql

-- Step 4: Verify deployment
RAISE NOTICE 'Step 4: Verifying deployment...';

-- Check that all views were created successfully
DO $$
DECLARE
    view_count INTEGER;
    expected_views TEXT[] := ARRAY[
        'mv_compliance_stats',
        'mv_medication_usage', 
        'mv_inventory_consumption',
        'mv_animal_health_trends'
    ];
    missing_views TEXT[];
    view_name TEXT;
BEGIN
    -- Check each expected view
    FOREACH view_name IN ARRAY expected_views LOOP
        SELECT COUNT(*)
        INTO view_count
        FROM pg_matviews 
        WHERE matviewname = view_name;
        
        IF view_count = 0 THEN
            missing_views := array_append(missing_views, view_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_views, 1) IS NULL THEN
        RAISE NOTICE 'SUCCESS: All materialized views created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: Missing views: %', array_to_string(missing_views, ', ');
    END IF;
END $$;

-- Check refresh functions
DO $$
DECLARE
    func_count INTEGER;
    expected_functions TEXT[] := ARRAY[
        'refresh_compliance_stats',
        'refresh_medication_usage',
        'refresh_inventory_consumption', 
        'refresh_animal_health_trends',
        'refresh_all_materialized_views',
        'get_mv_refresh_status'
    ];
    missing_functions TEXT[];
    func_name TEXT;
BEGIN
    -- Check each expected function
    FOREACH func_name IN ARRAY expected_functions LOOP
        SELECT COUNT(*)
        INTO func_count
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = func_name;
        
        IF func_count = 0 THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE 'SUCCESS: All refresh functions created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: Missing functions: %', array_to_string(missing_functions, ', ');
    END IF;
END $$;

-- Test initial refresh
RAISE NOTICE 'Step 5: Testing initial refresh...';

DO $$
DECLARE
    result RECORD;
    total_errors INTEGER := 0;
BEGIN
    RAISE NOTICE 'Running initial refresh of all materialized views...';
    
    FOR result IN SELECT * FROM refresh_all_materialized_views() LOOP
        RAISE NOTICE 'View: %, Status: %, Duration: %ms, Rows: %', 
            result.view_name, result.status, result.refresh_duration_ms, result.rows_count;
            
        IF result.status != 'COMPLETED' THEN
            total_errors := total_errors + 1;
        END IF;
    END LOOP;
    
    IF total_errors = 0 THEN
        RAISE NOTICE 'SUCCESS: Initial refresh completed without errors';
    ELSE
        RAISE WARNING 'WARNING: % views failed initial refresh - check logs', total_errors;
    END IF;
END $$;

-- Display deployment summary
DO $$
DECLARE
    view_sizes RECORD;
    total_rows BIGINT := 0;
BEGIN
    RAISE NOTICE '=== DEPLOYMENT SUMMARY ===';
    RAISE NOTICE 'Deployment completed at: %', NOW();
    
    -- Show view sizes
    RAISE NOTICE 'Materialized View Sizes:';
    
    FOR view_sizes IN 
        WITH sizes AS (
            SELECT 'mv_compliance_stats' as name, COUNT(*) as rows FROM mv_compliance_stats
            UNION ALL
            SELECT 'mv_medication_usage' as name, COUNT(*) as rows FROM mv_medication_usage
            UNION ALL  
            SELECT 'mv_inventory_consumption' as name, COUNT(*) as rows FROM mv_inventory_consumption
            UNION ALL
            SELECT 'mv_animal_health_trends' as name, COUNT(*) as rows FROM mv_animal_health_trends
        )
        SELECT name, rows FROM sizes ORDER BY name
    LOOP
        RAISE NOTICE '  - %: % rows', view_sizes.name, view_sizes.rows;
        total_rows := total_rows + view_sizes.rows;
    END LOOP;
    
    RAISE NOTICE 'Total materialized data: % rows', total_rows;
    
    -- Check pg_cron availability
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'Automated refresh: ENABLED (pg_cron available)';
    ELSE
        RAISE NOTICE 'Automated refresh: MANUAL SETUP REQUIRED (pg_cron not available)';
    END IF;
    
    RAISE NOTICE '=========================';
END $$;

COMMIT;

-- Final instructions
\echo ''
\echo '=== POST-DEPLOYMENT SETUP ==='
\echo ''
\echo '1. Monitor refresh performance:'
\echo '   SELECT * FROM get_mv_refresh_status();'
\echo ''
\echo '2. Check refresh logs:'
\echo '   SELECT * FROM mv_refresh_log ORDER BY refresh_started_at DESC LIMIT 10;'
\echo ''
\echo '3. Manual refresh if needed:'
\echo '   SELECT refresh_all_materialized_views();'
\echo ''
\echo '4. If pg_cron is not available, set up external scheduling for:'
\echo '   - refresh_compliance_stats() - every 15 minutes'
\echo '   - refresh_medication_usage() - every 30 minutes'  
\echo '   - refresh_inventory_consumption() - every hour'
\echo '   - refresh_animal_health_trends() - every 4 hours'
\echo ''
\echo '5. Update application endpoints to use optimized routers:'
\echo '   - insights-optimized.ts'
\echo '   - reports-optimized.ts'
\echo '   - admin-mv.ts'
\echo ''
\echo 'Deployment completed successfully!'
\echo ''