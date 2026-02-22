-- Migration 0036 (patched): Monthly Neighborhood History Views
-- Fix: official_schedule_hourly has schedule_id (not line_id). Derive line_id from official_schedules.
-- Window: last 12 months (month buckets), aggregated and safe.

CREATE OR REPLACE VIEW public.vw_neighborhood_monthly AS
WITH active_schedules AS (
  SELECT DISTINCT ON (os.line_id)
    os.line_id,
    os.id AS schedule_id
  FROM public.official_schedules os
  WHERE os.doc_type = 'HORARIO'
    AND os.line_id IS NOT NULL
  ORDER BY os.line_id,
           os.valid_from DESC NULLS LAST,
           os.fetched_at DESC NULLS LAST
),
promised AS (
  SELECT
    a.line_id,
    sh.day_group,
    sh.hour,
    sh.promised_headway_min
  FROM active_schedules a
  JOIN public.official_schedule_hourly sh
    ON sh.schedule_id = a.schedule_id
),
monthly_headways AS (
  SELECT
    DATE_TRUNC('month', sub.occurred_at AT TIME ZONE 'America/Sao_Paulo')::date AS month_start,
    sub.stop_id,
    sub.line_id,
    sub.day_group,
    sub.hour,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.headway_min) AS real_p50_headway_min,
    COUNT(*) AS samples,
    (SUM(CASE WHEN sub.trust_level IN ('L2','L3') THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100.0 AS pct_verified
  FROM (
    SELECT
      stop_id,
      line_id,
      trust_level,
      occurred_at,
      CASE
        WHEN EXTRACT(ISODOW FROM occurred_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN 1 AND 5 THEN 'WEEKDAY'
        WHEN EXTRACT(ISODOW FROM occurred_at AT TIME ZONE 'America/Sao_Paulo') = 6 THEN 'SAT'
        ELSE 'SUN'
      END AS day_group,
      EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
      (EXTRACT(EPOCH FROM (occurred_at - LAG(occurred_at) OVER (PARTITION BY stop_id, line_id ORDER BY occurred_at))) / 60.0) AS headway_min
    FROM public.stop_events
    WHERE event_type IN ('passed_by','boarding')
      AND occurred_at >= (DATE_TRUNC('month', now()) - interval '12 months')
  ) sub
  WHERE sub.headway_min IS NOT NULL AND sub.headway_min > 0 AND sub.headway_min < 180
  GROUP BY month_start, stop_id, line_id, day_group, hour
  HAVING COUNT(*) >= 3
),
monthly_metrics AS (
  SELECT
    mh.month_start,
    COALESCE(s.neighborhood_norm, COALESCE(s.neighborhood,'Desconhecido')) AS neighborhood_norm,
    (mh.real_p50_headway_min - p.promised_headway_min) AS delta_min,
    mh.samples,
    mh.pct_verified
  FROM monthly_headways mh
  JOIN public.stops s ON s.id = mh.stop_id
  LEFT JOIN promised p
    ON p.line_id = mh.line_id
   AND p.day_group = mh.day_group
   AND p.hour = mh.hour
)
SELECT
  month_start,
  neighborhood_norm,
  ROUND(AVG(delta_min)::numeric, 1) AS avg_delta_min,
  SUM(samples)::bigint AS samples_total,
  ROUND((SUM(samples * pct_verified) / NULLIF(SUM(samples),0))::numeric, 1) AS pct_verified_avg
FROM monthly_metrics
WHERE delta_min IS NOT NULL
GROUP BY month_start, neighborhood_norm;

CREATE OR REPLACE VIEW public.vw_neighborhood_monthly_change AS
SELECT
  m.month_start,
  m.neighborhood_norm,
  m.avg_delta_min,
  m.samples_total,
  m.pct_verified_avg,
  LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start) AS prev_avg_delta_min,
  ROUND((m.avg_delta_min - LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start))::numeric, 1) AS delta_min,
  CASE
    WHEN LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start) IS NULL THEN NULL
    WHEN LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start) = 0 THEN NULL
    ELSE ROUND(((m.avg_delta_min - LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start))
      / LAG(m.avg_delta_min) OVER (PARTITION BY m.neighborhood_norm ORDER BY m.month_start) * 100.0)::numeric, 1)
  END AS delta_pct
FROM public.vw_neighborhood_monthly m;