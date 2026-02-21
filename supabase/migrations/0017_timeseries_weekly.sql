-- Migration 0017: Weekly Timeseries Views
-- Gerado em: 2026-02-21

-- 1. Visão Semanal de Espera por Ponto (Últimos 90 dias)
CREATE OR REPLACE VIEW public.vw_stop_wait_weekly AS
WITH weekly_waits AS (
    SELECT 
        e.stop_id,
        date_trunc('week', e.occurred_at)::date AS week_start,
        e.occurred_at AS arrived_at,
        LEAD(e.occurred_at) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_at,
        LEAD(e.event_type) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_event
    FROM public.stop_events e
    WHERE e.event_type IN ('arrived', 'boarding', 'passed_by')
      AND e.occurred_at >= NOW() - INTERVAL '90 days'
)
SELECT 
    stop_id,
    week_start,
    COUNT(*) as samples,
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60))::numeric, 1) AS p50_wait_min,
    ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60))::numeric, 1) AS p90_wait_min
FROM weekly_waits
WHERE concluded_event IN ('boarding', 'passed_by')
  AND EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60 BETWEEN 0 AND 180
GROUP BY stop_id, week_start
HAVING COUNT(*) >= 3;

-- 2. Visão Semanal de Headway por Linha (Últimos 90 dias)
CREATE OR REPLACE VIEW public.vw_line_headway_weekly AS
WITH bus_arrivals AS (
    SELECT 
        line_id,
        stop_id,
        date_trunc('week', occurred_at)::date AS week_start,
        occurred_at
    FROM public.stop_events
    WHERE event_type IN ('boarding', 'passed_by') 
      AND line_id IS NOT NULL
      AND occurred_at >= NOW() - INTERVAL '90 days'
),
headway_deltas AS (
    SELECT 
        line_id,
        week_start,
        EXTRACT(EPOCH FROM (occurred_at - LAG(occurred_at) OVER (PARTITION BY line_id, stop_id ORDER BY occurred_at)))/60 AS headway_min
    FROM bus_arrivals
)
SELECT 
    line_id,
    week_start,
    COUNT(*) as samples,
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY headway_min))::numeric, 1) AS p50_headway_min,
    ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY headway_min))::numeric, 1) AS p90_headway_min
FROM headway_deltas
WHERE headway_min BETWEEN 2 AND 180
GROUP BY line_id, week_start
HAVING COUNT(*) >= 3;
