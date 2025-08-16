-- Compliance Statistics Materialized View
-- Optimizes compliance reporting and dashboard analytics
-- Expected performance improvement: >70% for compliance queries

CREATE
MATERIALIZED VIEW mv_compliance_stats AS
SELECT household_id,
       animal_id,
       regimen_id,
       DATE_TRUNC('day', recorded_at) as day,
  EXTRACT('dow' FROM recorded_at) as day_of_week,
  EXTRACT('hour' FROM recorded_at) as hour_of_day,
  
  -- Status counts
  COUNT(*) as total_doses,
  COUNT(*) FILTER (WHERE status = 'ON_TIME') as on_time_count,
  COUNT(*) FILTER (WHERE status = 'LATE') as late_count,
  COUNT(*) FILTER (WHERE status = 'VERY_LATE') as very_late_count,
  COUNT(*) FILTER (WHERE status = 'MISSED') as missed_count,
  COUNT(*) FILTER (WHERE status = 'PRN') as prn_count,
  
  -- Calculated percentages (stored as integers for performance)
  ROUND(
    COUNT(*) FILTER (WHERE status = 'ON_TIME')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as on_time_rate,
  
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('ON_TIME', 'LATE', 'VERY_LATE'))::numeric / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as compliance_rate,
  
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('LATE', 'VERY_LATE'))::numeric / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as late_rate,
  
  ROUND(
    COUNT(*) FILTER (WHERE status = 'MISSED')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as missed_rate,
  
  -- Timing analysis
  AVG(
    CASE 
      WHEN scheduled_for IS NOT NULL AND status != 'PRN' 
      THEN EXTRACT('epoch' FROM (recorded_at - scheduled_for)) / 60 
    END
  ) as avg_delay_minutes,
  
  -- Data freshness
  NOW() as last_updated

FROM vetmed_administrations
WHERE
    recorded_at >= CURRENT_DATE - INTERVAL '180 days'
  AND scheduled_for IS NOT NULL -- Exclude PRN from compliance calculations
GROUP BY
    household_id,
    animal_id,
    regimen_id,
    DATE_TRUNC('day', recorded_at),
    EXTRACT ('dow' FROM recorded_at),
    EXTRACT ('hour' FROM recorded_at)
WITH DATA;

-- Create indexes for optimal query performance
CREATE UNIQUE INDEX mv_compliance_stats_pkey
    ON mv_compliance_stats (household_id, animal_id, regimen_id, day, day_of_week, hour_of_day);

CREATE INDEX mv_compliance_stats_household_idx
    ON mv_compliance_stats (household_id);

CREATE INDEX mv_compliance_stats_animal_idx
    ON mv_compliance_stats (animal_id);

CREATE INDEX mv_compliance_stats_day_idx
    ON mv_compliance_stats (day DESC);

CREATE INDEX mv_compliance_stats_compliance_rate_idx
    ON mv_compliance_stats (compliance_rate DESC) WHERE compliance_rate < 90;

CREATE INDEX mv_compliance_stats_heatmap_idx
    ON mv_compliance_stats (day_of_week, hour_of_day, household_id);

-- Performance hint: This view supports the following query patterns:
-- 1. Compliance heatmaps (day_of_week + hour_of_day grouping)
-- 2. Animal compliance trends (animal_id + day filtering)
-- 3. Household compliance dashboard (household_id aggregations)
-- 4. Problem identification (low compliance_rate filtering)
-- 5. Time-based analysis (day range queries)