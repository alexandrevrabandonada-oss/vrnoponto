-- Migration to calculate real headway aggregated by stop, line, day group, and hour
-- Window: Last 30 days
-- Based on 'passed_by' and 'boarding' events only.

CREATE OR REPLACE VIEW public.vw_stopline_headway_hourly_30d AS
SELECT
    stop_id,
    line_id,
    day_group,
    hour,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY headway_min) AS real_p50_headway_min,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY headway_min) AS real_p90_headway_min,
    COUNT(*) AS samples,
    CASE 
        WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN trust_level IN ('L2', 'L3') THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100.0
        ELSE 0.0
    END AS pct_verified
FROM (
    SELECT
        stop_id,
        line_id,
        trust_level,
        CASE
            WHEN EXTRACT(ISODOW FROM occurred_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN 1 AND 5 THEN 'WEEKDAY'
            WHEN EXTRACT(ISODOW FROM occurred_at AT TIME ZONE 'America/Sao_Paulo') = 6 THEN 'SAT'
            ELSE 'SUN'
        END AS day_group,
        EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
        (EXTRACT(EPOCH FROM (occurred_at - LAG(occurred_at) OVER (PARTITION BY stop_id, line_id ORDER BY occurred_at))) / 60.0) AS headway_min
    FROM public.stop_events
    WHERE
        event_type IN ('passed_by', 'boarding') AND
        occurred_at >= (now() - interval '30 days')
) AS sub
WHERE headway_min IS NOT NULL AND headway_min > 0 AND headway_min < 180 -- Filter out extreme anomalies (e.g., > 3 hours gap might mean end of service)
GROUP BY stop_id, line_id, day_group, hour
HAVING COUNT(*) >= 3; -- Ensure statistical relevance with at least 3 samples
