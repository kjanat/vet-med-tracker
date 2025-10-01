-- Materialized View Refresh Functions and Automation
-- Implements CONCURRENTLY refresh with monitoring and error handling

-- Create a refresh log table to track refresh performance
CREATE TABLE IF NOT EXISTS mv_refresh_log
(
    id
    SERIAL
    PRIMARY
    KEY,
    view_name
    VARCHAR
(
    100
) NOT NULL,
    refresh_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    refresh_completed_at TIMESTAMP
                                 WITH TIME ZONE,
                                     refresh_duration_ms INTEGER,
                                     rows_affected INTEGER,
                                     status VARCHAR (20) DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED
    error_message TEXT,
    refresh_type VARCHAR
(
    20
) DEFAULT 'CONCURRENT' -- CONCURRENT, FULL
    );

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS mv_refresh_log_view_name_idx ON mv_refresh_log (view_name, refresh_started_at DESC);

-- Function to refresh compliance statistics with monitoring
CREATE
OR REPLACE FUNCTION refresh_compliance_stats()
RETURNS TABLE(
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_count BIGINT,
  status TEXT
) AS $$
DECLARE
start_time TIMESTAMP WITH TIME ZONE;
  end_time
TIMESTAMP WITH TIME ZONE;
  log_id
INTEGER;
  row_count
BIGINT;
  error_msg
TEXT;
BEGIN
  start_time
:= NOW();
  
  -- Insert log entry
INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_type)
VALUES ('mv_compliance_stats', start_time, 'CONCURRENT') RETURNING id
INTO log_id;

BEGIN
    -- Refresh the materialized view concurrently
    REFRESH
MATERIALIZED VIEW CONCURRENTLY mv_compliance_stats;
    
    -- Get row count
SELECT COUNT(*)
INTO row_count
FROM mv_compliance_stats;

end_time
:= NOW();
    
    -- Update log with success
UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        rows_affected = row_count,
        status = 'COMPLETED'
WHERE id = log_id;

-- Return success result
RETURN QUERY SELECT
      'mv_compliance_stats'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      row_count,
      'COMPLETED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    end_time
:= NOW();
    
    -- Log the error
UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        status = 'FAILED',
        error_message = error_msg
WHERE id = log_id;

-- Return error result
RETURN QUERY SELECT
      'mv_compliance_stats'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      0::BIGINT,
      'FAILED'::TEXT;

RAISE
NOTICE 'Failed to refresh mv_compliance_stats: %', error_msg;
END;
END;
$$
LANGUAGE plpgsql;

-- Function to refresh medication usage with monitoring
CREATE
OR REPLACE FUNCTION refresh_medication_usage()
RETURNS TABLE(
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_count BIGINT,
  status TEXT
) AS $$
DECLARE
start_time TIMESTAMP WITH TIME ZONE;
  end_time
TIMESTAMP WITH TIME ZONE;
  log_id
INTEGER;
  row_count
BIGINT;
  error_msg
TEXT;
BEGIN
  start_time
:= NOW();

INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_type)
VALUES ('mv_medication_usage', start_time, 'CONCURRENT') RETURNING id
INTO log_id;

BEGIN
    REFRESH
MATERIALIZED VIEW CONCURRENTLY mv_medication_usage;

SELECT COUNT(*)
INTO row_count
FROM mv_medication_usage;
end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        rows_affected = row_count,
        status = 'COMPLETED'
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_medication_usage'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      row_count,
      'COMPLETED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        status = 'FAILED',
        error_message = error_msg
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_medication_usage'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      0::BIGINT,
      'FAILED'::TEXT;

RAISE
NOTICE 'Failed to refresh mv_medication_usage: %', error_msg;
END;
END;
$$
LANGUAGE plpgsql;

-- Function to refresh inventory consumption with monitoring
CREATE
OR REPLACE FUNCTION refresh_inventory_consumption()
RETURNS TABLE(
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_count BIGINT,
  status TEXT
) AS $$
DECLARE
start_time TIMESTAMP WITH TIME ZONE;
  end_time
TIMESTAMP WITH TIME ZONE;
  log_id
INTEGER;
  row_count
BIGINT;
  error_msg
TEXT;
BEGIN
  start_time
:= NOW();

INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_type)
VALUES ('mv_inventory_consumption', start_time, 'CONCURRENT') RETURNING id
INTO log_id;

BEGIN
    REFRESH
MATERIALIZED VIEW CONCURRENTLY mv_inventory_consumption;

SELECT COUNT(*)
INTO row_count
FROM mv_inventory_consumption;
end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        rows_affected = row_count,
        status = 'COMPLETED'
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_inventory_consumption'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      row_count,
      'COMPLETED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        status = 'FAILED',
        error_message = error_msg
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_inventory_consumption'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      0::BIGINT,
      'FAILED'::TEXT;

RAISE
NOTICE 'Failed to refresh mv_inventory_consumption: %', error_msg;
END;
END;
$$
LANGUAGE plpgsql;

-- Function to refresh animal health trends with monitoring
CREATE
OR REPLACE FUNCTION refresh_animal_health_trends()
RETURNS TABLE(
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_count BIGINT,
  status TEXT
) AS $$
DECLARE
start_time TIMESTAMP WITH TIME ZONE;
  end_time
TIMESTAMP WITH TIME ZONE;
  log_id
INTEGER;
  row_count
BIGINT;
  error_msg
TEXT;
BEGIN
  start_time
:= NOW();

INSERT INTO mv_refresh_log (view_name, refresh_started_at, refresh_type)
VALUES ('mv_animal_health_trends', start_time, 'CONCURRENT') RETURNING id
INTO log_id;

BEGIN
    REFRESH
MATERIALIZED VIEW CONCURRENTLY mv_animal_health_trends;

SELECT COUNT(*)
INTO row_count
FROM mv_animal_health_trends;
end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        rows_affected = row_count,
        status = 'COMPLETED'
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_animal_health_trends'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      row_count,
      'COMPLETED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    end_time
:= NOW();

UPDATE mv_refresh_log
SET refresh_completed_at = end_time,
    refresh_duration_ms  = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
        status = 'FAILED',
        error_message = error_msg
WHERE id = log_id;

RETURN QUERY SELECT
      'mv_animal_health_trends'::TEXT,
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
      0::BIGINT,
      'FAILED'::TEXT;

RAISE
NOTICE 'Failed to refresh mv_animal_health_trends: %', error_msg;
END;
END;
$$
LANGUAGE plpgsql;

-- Master function to refresh all materialized views
CREATE
OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(
  view_name TEXT,
  refresh_duration_ms INTEGER,
  rows_count BIGINT,
  status TEXT
) AS $$
BEGIN
  -- Refresh in order of dependencies and data freshness requirements
RETURN QUERY SELECT * FROM refresh_compliance_stats();
RETURN QUERY SELECT * FROM refresh_medication_usage();
RETURN QUERY SELECT * FROM refresh_inventory_consumption();
RETURN QUERY SELECT * FROM refresh_animal_health_trends();
END;
$$
LANGUAGE plpgsql;

-- Function to get refresh status and performance metrics
CREATE
OR REPLACE FUNCTION get_mv_refresh_status()
RETURNS TABLE(
  view_name TEXT,
  last_refresh TIMESTAMP WITH TIME ZONE,
  avg_duration_ms INTEGER,
  success_rate NUMERIC,
  last_error TEXT,
  rows_count BIGINT
) AS $$
BEGIN
RETURN QUERY WITH latest_refresh AS (
    SELECT DISTINCT ON (rl.view_name)
      rl.view_name,
      rl.refresh_completed_at,
      rl.refresh_duration_ms,
      rl.status,
      rl.error_message,
      rl.rows_affected
    FROM mv_refresh_log rl
    ORDER BY rl.view_name, rl.refresh_started_at DESC
  ),
  stats AS (
    SELECT 
      rl.view_name,
      AVG(rl.refresh_duration_ms)::INTEGER as avg_duration_ms,
      COUNT(*) FILTER (WHERE rl.status = 'COMPLETED')::NUMERIC / COUNT(*)::NUMERIC * 100 as success_rate
    FROM mv_refresh_log rl
    WHERE rl.refresh_started_at >= NOW() - INTERVAL '7 days'
    GROUP BY rl.view_name
  )
SELECT lr.view_name,
       lr.refresh_completed_at,
       s.avg_duration_ms,
       s.success_rate,
       CASE WHEN lr.status = 'FAILED' THEN lr.error_message ELSE NULL END,
       lr.rows_affected
FROM latest_refresh lr
         LEFT JOIN stats s ON lr.view_name = s.view_name
ORDER BY lr.view_name;
END;
$$
LANGUAGE plpgsql;

-- Utility function to cleanup old refresh logs (keep last 30 days)
CREATE
OR REPLACE FUNCTION cleanup_mv_refresh_logs()
RETURNS INTEGER AS $$
DECLARE
deleted_count INTEGER;
BEGIN
DELETE
FROM mv_refresh_log
WHERE refresh_started_at < NOW() - INTERVAL '30 days';

GET DIAGNOSTICS deleted_count = ROW_COUNT;
RETURN deleted_count;
END;
$$
LANGUAGE plpgsql;