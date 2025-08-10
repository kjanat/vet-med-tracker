-- Automated Refresh Setup for Materialized Views
-- Uses pg_cron for automated scheduling (requires pg_cron extension)

-- Note: pg_cron extension needs to be enabled by database administrator
-- For Neon, this may need to be requested through support or configured through their UI

-- Enable pg_cron extension if available
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule compliance stats refresh every 15 minutes during business hours (7 AM - 11 PM UTC)
-- This covers most global timezones during active periods
SELECT cron.schedule(
  'refresh-compliance-stats',
  '*/15 7-23 * * *',  -- Every 15 minutes between 7 AM and 11 PM UTC
  'SELECT refresh_compliance_stats();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Schedule medication usage refresh every 30 minutes
SELECT cron.schedule(
  'refresh-medication-usage', 
  '*/30 * * * *',  -- Every 30 minutes
  'SELECT refresh_medication_usage();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Schedule inventory consumption refresh every hour
SELECT cron.schedule(
  'refresh-inventory-consumption',
  '0 * * * *',  -- Every hour on the hour
  'SELECT refresh_inventory_consumption();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Schedule animal health trends refresh every 4 hours  
SELECT cron.schedule(
  'refresh-animal-health-trends',
  '0 */4 * * *',  -- Every 4 hours
  'SELECT refresh_animal_health_trends();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Schedule complete refresh once daily at 2 AM UTC (low usage time)
SELECT cron.schedule(
  'refresh-all-materialized-views',
  '0 2 * * *',  -- Daily at 2 AM UTC
  'SELECT refresh_all_materialized_views();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Schedule log cleanup weekly on Sundays at 1 AM UTC
SELECT cron.schedule(
  'cleanup-mv-refresh-logs',
  '0 1 * * 0',  -- Weekly on Sunday at 1 AM UTC
  'SELECT cleanup_mv_refresh_logs();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- Alternative: Manual trigger-based refresh for environments without pg_cron
-- Create trigger functions to refresh views when base data changes

-- Function to handle administration data changes
CREATE OR REPLACE FUNCTION trigger_compliance_refresh()
RETURNS TRIGGER AS $$
DECLARE
  last_refresh TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only refresh if last refresh was more than 5 minutes ago
  SELECT MAX(refresh_completed_at) INTO last_refresh
  FROM mv_refresh_log 
  WHERE view_name = 'mv_compliance_stats' AND status = 'COMPLETED';
  
  IF last_refresh IS NULL OR last_refresh < NOW() - INTERVAL '5 minutes' THEN
    -- Perform async refresh (in a background job if possible)
    PERFORM pg_notify('mv_refresh_needed', 'compliance_stats');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for administration changes (only for INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS trigger_administration_refresh ON vetmed_administrations;
CREATE TRIGGER trigger_administration_refresh
  AFTER INSERT OR UPDATE OR DELETE
  ON vetmed_administrations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_compliance_refresh();

-- Function to handle inventory changes
CREATE OR REPLACE FUNCTION trigger_inventory_refresh()
RETURNS TRIGGER AS $$
DECLARE
  last_refresh TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT MAX(refresh_completed_at) INTO last_refresh
  FROM mv_refresh_log 
  WHERE view_name = 'mv_inventory_consumption' AND status = 'COMPLETED';
  
  IF last_refresh IS NULL OR last_refresh < NOW() - INTERVAL '15 minutes' THEN
    PERFORM pg_notify('mv_refresh_needed', 'inventory_consumption');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory changes
DROP TRIGGER IF EXISTS trigger_inventory_refresh ON vetmed_inventory_items;
CREATE TRIGGER trigger_inventory_refresh
  AFTER INSERT OR UPDATE OR DELETE
  ON vetmed_inventory_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_inventory_refresh();

-- View to check scheduled jobs (if pg_cron is available)
CREATE OR REPLACE VIEW mv_refresh_schedule AS
SELECT 
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job 
WHERE jobname LIKE '%refresh%' OR jobname LIKE '%materialized%'
ORDER BY jobname;

-- View to monitor refresh performance and health
CREATE OR REPLACE VIEW mv_refresh_health AS
WITH recent_refreshes AS (
  SELECT 
    view_name,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_refreshes,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_refreshes,
    AVG(refresh_duration_ms) as avg_duration_ms,
    MAX(refresh_completed_at) as last_refresh,
    MIN(refresh_started_at) as first_refresh
  FROM mv_refresh_log
  WHERE refresh_started_at >= NOW() - INTERVAL '24 hours'
  GROUP BY view_name
),
view_sizes AS (
  SELECT 'mv_compliance_stats' as view_name, COUNT(*) as row_count FROM mv_compliance_stats
  UNION ALL
  SELECT 'mv_medication_usage' as view_name, COUNT(*) as row_count FROM mv_medication_usage  
  UNION ALL
  SELECT 'mv_inventory_consumption' as view_name, COUNT(*) as row_count FROM mv_inventory_consumption
  UNION ALL
  SELECT 'mv_animal_health_trends' as view_name, COUNT(*) as row_count FROM mv_animal_health_trends
)
SELECT 
  rr.view_name,
  rr.total_attempts,
  rr.successful_refreshes,
  rr.failed_refreshes,
  ROUND(rr.successful_refreshes::NUMERIC / rr.total_attempts * 100, 2) as success_rate_pct,
  rr.avg_duration_ms,
  rr.last_refresh,
  vs.row_count,
  CASE 
    WHEN rr.last_refresh < NOW() - INTERVAL '2 hours' THEN 'STALE'
    WHEN rr.failed_refreshes > rr.successful_refreshes THEN 'FAILING'
    WHEN rr.avg_duration_ms > 30000 THEN 'SLOW'  -- > 30 seconds
    WHEN rr.successful_refreshes > 0 THEN 'HEALTHY'
    ELSE 'UNKNOWN'
  END as health_status
FROM recent_refreshes rr
JOIN view_sizes vs ON rr.view_name = vs.view_name
ORDER BY rr.view_name;

-- Utility function to manually refresh all views (for admin use)
CREATE OR REPLACE FUNCTION manual_refresh_all()
RETURNS TABLE(summary TEXT) AS $$
DECLARE
  result RECORD;
BEGIN
  RETURN QUERY SELECT 'Starting manual refresh of all materialized views...'::TEXT;
  
  FOR result IN SELECT * FROM refresh_all_materialized_views() LOOP
    RETURN QUERY SELECT format('%s: %s (%s ms, %s rows)', 
      result.view_name, 
      result.status, 
      result.refresh_duration_ms,
      result.rows_count)::TEXT;
  END LOOP;
  
  RETURN QUERY SELECT 'Manual refresh completed.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Comments for DBA/Admin setup
/*
SETUP INSTRUCTIONS:

1. Enable pg_cron extension (may require superuser privileges):
   CREATE EXTENSION IF NOT EXISTS pg_cron;

2. If pg_cron is not available, consider:
   - Setting up external cron jobs to call refresh functions
   - Using application-level scheduling (Node.js cron jobs)
   - Implementing event-driven refresh based on data changes

3. Monitor refresh performance:
   SELECT * FROM mv_refresh_health;
   
4. Check scheduled jobs:
   SELECT * FROM mv_refresh_schedule;
   
5. Manual refresh if needed:
   SELECT manual_refresh_all();

6. Troubleshooting:
   - Check mv_refresh_log for errors
   - Verify materialized view unique indexes exist
   - Ensure sufficient database resources during refresh
   - Consider adjusting refresh frequency based on usage patterns

7. Performance tuning:
   - Monitor refresh duration vs data volume
   - Adjust refresh schedules based on application usage patterns
   - Consider partitioning base tables if refresh becomes too slow
*/