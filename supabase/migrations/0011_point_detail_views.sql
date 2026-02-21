-- Migration 0011: Point Detail and Trend Views
-- Provê dados para a página de auditoria popular por ponto de ônibus

-- 1. Visão de Wait por Linha e Ponto (Janela de 30 Dias)
CREATE OR REPLACE VIEW public.vw_point_lines_30d AS
WITH recent_waits AS (
    SELECT 
        e.stop_id,
        e.line_id,
        e.occurred_at AS arrived_at,
        LEAD(e.occurred_at) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_at,
        LEAD(e.event_type) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_event
    FROM public.stop_events e
    WHERE e.event_type IN ('arrived', 'boarding', 'passed_by')
      AND e.occurred_at >= NOW() - INTERVAL '30 days'
)
SELECT 
    rw.stop_id,
    rw.line_id,
    l.code AS line_code,
    l.name AS line_name,
    COUNT(rw.stop_id) as samples,
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rw.concluded_at - rw.arrived_at))/60))::numeric, 1) AS p50_wait_min
FROM recent_waits rw
JOIN public.lines l ON rw.line_id = l.id
WHERE rw.concluded_event IN ('boarding', 'passed_by')
  AND EXTRACT(EPOCH FROM (rw.concluded_at - rw.arrived_at))/60 BETWEEN 0 AND 180
GROUP BY rw.stop_id, rw.line_id, l.code, l.name
HAVING COUNT(rw.stop_id) >= 1;

-- 2. Visão de Detalhe do Ponto com Tendência (7d vs 7d anterior)
CREATE OR REPLACE VIEW public.vw_point_detail_30d AS
WITH wait_events AS (
    SELECT 
        e.stop_id,
        e.occurred_at,
        EXTRACT(EPOCH FROM (LEAD(e.occurred_at) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) - e.occurred_at))/60 as wait_min,
        LEAD(e.event_type) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_event
    FROM public.stop_events e
    WHERE e.event_type IN ('arrived', 'boarding', 'passed_by')
      AND e.occurred_at >= NOW() - INTERVAL '30 days'
),
valid_waits AS (
    SELECT * FROM wait_events 
    WHERE concluded_event IN ('boarding', 'passed_by') 
      AND wait_min BETWEEN 0 AND 180
),
current_7d AS (
    SELECT 
        stop_id,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY wait_min) as p50
    FROM valid_waits
    WHERE occurred_at >= NOW() - INTERVAL '7 days'
    GROUP BY stop_id
    HAVING COUNT(*) >= 3
),
previous_7d AS (
    SELECT 
        stop_id,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY wait_min) as p50
    FROM valid_waits
    WHERE occurred_at >= NOW() - INTERVAL '14 days' AND occurred_at < NOW() - INTERVAL '7 days'
    GROUP BY stop_id
    HAVING COUNT(*) >= 3
)
SELECT 
    v30.stop_id,
    v30.p50_wait_min,
    v30.p90_wait_min,
    v30.samples,
    CASE 
        WHEN p7_old.p50 IS NULL OR p7_old.p50 = 0 THEN NULL
        ELSE ROUND(((p7_new.p50 - p7_old.p50) / p7_old.p50 * 100)::numeric, 1)
    END AS delta_7d_pct
FROM public.vw_stop_wait_30d v30
LEFT JOIN current_7d p7_new ON v30.stop_id = p7_new.stop_id
LEFT JOIN previous_7d p7_old ON v30.stop_id = p7_old.stop_id;
