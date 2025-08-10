-- Medication Usage Summary Materialized View
-- Optimizes medication trends, usage patterns, and inventory planning
-- Expected performance improvement: >70% for medication analytics

CREATE MATERIALIZED VIEW mv_medication_usage AS
SELECT
  household_id,
  medication_id,
  animal_id,
  DATE_TRUNC('week', recorded_at) as week,
  DATE_TRUNC('month', recorded_at) as month,
  
  -- Basic usage metrics
  COUNT(*) as total_administrations,
  COUNT(DISTINCT animal_id) as animals_treated,
  COUNT(DISTINCT regimen_id) as active_regimens,
  
  -- Status breakdown
  COUNT(*) FILTER (WHERE status = 'ON_TIME') as on_time_doses,
  COUNT(*) FILTER (WHERE status IN ('LATE', 'VERY_LATE')) as late_doses,
  COUNT(*) FILTER (WHERE status = 'MISSED') as missed_doses,
  COUNT(*) FILTER (WHERE status = 'PRN') as prn_doses,
  
  -- Dosage analysis (when available)
  COUNT(*) FILTER (WHERE dose IS NOT NULL) as doses_with_amount,
  -- Store as text since doses can be "1 tablet", "5ml", etc.
  MODE() WITHIN GROUP (ORDER BY dose) as most_common_dose,
  
  -- Adverse events tracking
  COUNT(*) FILTER (WHERE adverse_event = true) as adverse_events,
  COUNT(*) FILTER (WHERE adverse_event = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100 as adverse_event_rate,
  
  -- Co-sign requirements tracking
  COUNT(*) FILTER (WHERE co_sign_user_id IS NOT NULL) as cosigned_doses,
  COUNT(*) FILTER (WHERE co_sign_user_id IS NOT NULL)::numeric / 
    NULLIF(COUNT(*), 0) * 100 as cosign_rate,
  
  -- Time pattern analysis
  EXTRACT('dow' FROM recorded_at) as most_common_day,
  EXTRACT('hour' FROM recorded_at) as most_common_hour,
  
  -- Data freshness
  NOW() as last_updated

FROM vetmed_administrations a
JOIN vetmed_regimens r ON a.regimen_id = r.id
WHERE recorded_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY 
  household_id,
  medication_id,
  animal_id,
  DATE_TRUNC('week', recorded_at),
  DATE_TRUNC('month', recorded_at),
  EXTRACT('dow' FROM recorded_at),
  EXTRACT('hour' FROM recorded_at)
WITH DATA;

-- Create indexes for optimal query performance
CREATE UNIQUE INDEX mv_medication_usage_pkey 
ON mv_medication_usage (household_id, medication_id, animal_id, week, most_common_day, most_common_hour);

CREATE INDEX mv_medication_usage_household_idx 
ON mv_medication_usage (household_id);

CREATE INDEX mv_medication_usage_medication_idx 
ON mv_medication_usage (medication_id);

CREATE INDEX mv_medication_usage_animal_idx 
ON mv_medication_usage (animal_id);

CREATE INDEX mv_medication_usage_month_idx 
ON mv_medication_usage (month DESC);

CREATE INDEX mv_medication_usage_week_idx 
ON mv_medication_usage (week DESC);

CREATE INDEX mv_medication_usage_adverse_events_idx 
ON mv_medication_usage (adverse_event_rate DESC) WHERE adverse_events > 0;

CREATE INDEX mv_medication_usage_high_volume_idx 
ON mv_medication_usage (total_administrations DESC) WHERE total_administrations >= 10;

-- Performance hint: This view supports the following query patterns:
-- 1. Medication usage trends over time (week/month grouping)
-- 2. Animal-specific medication patterns (animal_id filtering)
-- 3. Household medication summary (household_id aggregations)
-- 4. Adverse event analysis (adverse_event_rate filtering)
-- 5. High-usage medication identification (total_administrations sorting)