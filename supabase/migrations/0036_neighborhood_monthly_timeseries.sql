-- Migration 0036: Monthly Neighborhood History Views
-- Aggregates performance metrics by month for the last 12 months

-- 1. Base view for monthly stop-line performance
-- This mirrors vw_stopline_headway_hourly_30d but buckets by month
CREATE OR REPLACE VIEW public.vw_neighborhood_monthly AS
WITH monthly_headways AS (
    SELECT
        DATE_TRUNC('month', sub.occurred_at AT TIME ZONE 'America/Sao_Paulo')::date AS month_start,
        sub.stop_id,
        sub.line_id,
        sub.day_group,
        sub.hour,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.headway_min) AS real_p50_headway_min,
        COUNT(*) AS samples,
        (SUM(CASE WHEN sub.trust_level IN ('L2', 'L3') THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100.0 AS pct_verified
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
        WHERE event_type IN ('passed_by', 'boarding')
          AND occurred_at >= (DATE_TRUNC('month', now()) - interval '12 months')
    ) AS sub
    WHERE sub.headway_min IS NOT NULL AND sub.headway_min > 0 AND sub.headway_min < 180
    GROUP BY month_start, stop_id, line_id, day_group, hour
    HAVING COUNT(*) >= 3
),
monthly_metrics AS (
    SELECT 
        mh.month_start,
        s.neighborhood_norm,
        mh.real_p50_headway_min - p.promised_headway_min AS delta_min,
        mh.samples,
        mh.pct_verified
    FROM monthly_headways mh
    JOIN public.stops s ON s.id = mh.stop_id
    LEFT JOIN (
        -- Get the active (most recent) schedule for each line
        -- Using latest for all months as an approximation if historical schedules are complex
        SELECT 
            sh.line_id,
            sh.day_group,
            sh.hour,
            COALESCE(sh.override_promised_headway_min, sh.promised_headway_min) AS promised_headway_min
        FROM public.official_schedule_hourly sh
        INNER JOIN (
            SELECT line_variant_id AS line_id, MAX(created_at) AS max_created_at
            FROM public.official_schedules
            WHERE doc_type = 'HORARIO'
            GROUP BY line_variant_id
        ) latest_schedules ON sh.schedule_id = (
            SELECT id FROM public.official_schedules os 
            WHERE os.line_variant_id = latest_schedules.line_id AND os.created_at = latest_schedules.max_created_at
            LIMIT 1
        )
    ) p ON mh.line_id = p.line_id AND mh.day_group = p.day_group AND mh.hour = p.hour
    WHERE p.promised_headway_min IS NOT NULL
)
SELECT
    month_start,
    COALESCE(neighborhood_norm, 'DESCONHECIDO') AS neighborhood_norm,
    ROUND(AVG(delta_min)::numeric, 1) AS avg_delta_min,
    SUM(samples)::bigint AS samples_total,
    ROUND((SUM(samples * pct_verified) / NULLIF(SUM(samples), 0))::numeric, 1) AS pct_verified_avg
FROM monthly_metrics
GROUP BY month_start, neighborhood_norm
HAVING SUM(samples) >= 20;

-- 2. View for month-over-month changes
CREATE OR REPLACE VIEW public.vw_neighborhood_monthly_change AS
SELECT
    m1.month_start,
    m1.neighborhood_norm,
    m1.avg_delta_min AS cur_avg_delta_min,
    m2.avg_delta_min AS prev_avg_delta_min,
    ROUND((m1.avg_delta_min - m2.avg_delta_min)::numeric, 1) AS delta_change_min,
    CASE 
        WHEN m2.avg_delta_min > 0 THEN ROUND(((m1.avg_delta_min - m2.avg_delta_min) / m2.avg_delta_min * 100.0)::numeric, 1)
        ELSE NULL 
    END AS delta_change_pct,
    m1.samples_total,
    m1.pct_verified_avg
FROM public.vw_neighborhood_monthly m1
LEFT JOIN public.vw_neighborhood_monthly m2 
    ON m1.neighborhood_norm = m2.neighborhood_norm 
    AND m2.month_start = (m1.month_start - interval '1 month');
