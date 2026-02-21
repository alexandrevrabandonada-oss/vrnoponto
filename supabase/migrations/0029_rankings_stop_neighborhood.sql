-- Migration to create Rankings for stops and neighborhoods
-- Window: Last 30 days
-- Relies on vw_stopline_promised_vs_real_30d

-- 1. Worst Stops Ranking
CREATE OR REPLACE VIEW public.vw_worst_stops_30d AS
SELECT
    s.id AS stop_id,
    s.name AS stop_name,
    s.neighborhood,
    MAX(r.delta_min) AS worst_delta_min,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    SUM(r.samples) AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg
FROM public.stops s
JOIN public.vw_stopline_promised_vs_real_30d r ON s.id = r.stop_id
WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
GROUP BY s.id, s.name, s.neighborhood
ORDER BY worst_delta_min DESC NULLS LAST
LIMIT 50;

-- 2. Worst Neighborhoods Ranking
CREATE OR REPLACE VIEW public.vw_worst_neighborhoods_30d AS
SELECT
    COALESCE(neighborhood, 'Desconhecido') AS neighborhood,
    ROUND(AVG(avg_delta_min)::numeric, 1) AS avg_delta_min,
    COUNT(stop_id) AS stops_count,
    SUM(samples_total) AS samples_total
FROM public.vw_worst_stops_30d
GROUP BY neighborhood
ORDER BY avg_delta_min DESC NULLS LAST
LIMIT 50;
