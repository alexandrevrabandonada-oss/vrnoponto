-- Migration to calculate Promised vs Real headway at the STOP level
-- Window: Last 30 days
-- Joins the real hourly headways with the official schedule

CREATE OR REPLACE VIEW public.vw_stopline_promised_vs_real_30d AS
SELECT
    r.stop_id,
    r.line_id,
    r.day_group,
    r.hour,
    p.promised_headway_min,
    r.real_p50_headway_min,
    ROUND((r.real_p50_headway_min - p.promised_headway_min)::numeric, 1) AS delta_min,
    CASE
        WHEN p.promised_headway_min > 0 THEN ROUND(((r.real_p50_headway_min - p.promised_headway_min) / p.promised_headway_min * 100.0)::numeric, 1)
        ELSE NULL
    END AS delta_pct,
    r.samples,
    r.pct_verified,
    CASE 
        WHEN p.promised_headway_min IS NULL THEN 'NO_PROMISE'
        ELSE 'OK'
    END AS meta
FROM public.vw_stopline_headway_hourly_30d r
LEFT JOIN (
    -- Get the active (most recent) schedule for each line
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
) p ON r.line_id = p.line_id AND r.day_group = p.day_group AND r.hour = p.hour
ORDER BY delta_min DESC NULLS LAST;
