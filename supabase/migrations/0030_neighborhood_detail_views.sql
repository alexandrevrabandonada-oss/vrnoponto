-- Migration 0030: Neighborhood detail views for /bairros dashboard
-- Built on top of vw_stopline_promised_vs_real_30d + stops

-- 1. Neighborhood summary
CREATE OR REPLACE VIEW public.vw_neighborhood_detail_30d AS
SELECT
    COALESCE(s.neighborhood, 'Desconhecido') AS neighborhood,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    COUNT(DISTINCT r.stop_id) AS stops_count,
    SUM(r.samples)::bigint AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg
FROM public.vw_stopline_promised_vs_real_30d r
JOIN public.stops s ON s.id = r.stop_id
WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
GROUP BY s.neighborhood
ORDER BY avg_delta_min DESC NULLS LAST;

-- 2. Top stops per neighborhood
CREATE OR REPLACE VIEW public.vw_neighborhood_top_stops_30d AS
SELECT
    COALESCE(s.neighborhood, 'Desconhecido') AS neighborhood,
    s.id AS stop_id,
    s.name AS stop_name,
    MAX(r.delta_min) AS worst_delta_min,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    SUM(r.samples)::bigint AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(s.neighborhood, 'Desconhecido') ORDER BY MAX(r.delta_min) DESC NULLS LAST) AS rn
FROM public.vw_stopline_promised_vs_real_30d r
JOIN public.stops s ON s.id = r.stop_id
WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
GROUP BY s.neighborhood, s.id, s.name
HAVING ROW_NUMBER() OVER (PARTITION BY COALESCE(s.neighborhood, 'Desconhecido') ORDER BY MAX(r.delta_min) DESC NULLS LAST) <= 20;

-- 3. Top lines per neighborhood
CREATE OR REPLACE VIEW public.vw_neighborhood_top_lines_30d AS
SELECT
    COALESCE(s.neighborhood, 'Desconhecido') AS neighborhood,
    r.line_id,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    SUM(r.samples)::bigint AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(s.neighborhood, 'Desconhecido') ORDER BY AVG(r.delta_min) DESC NULLS LAST) AS rn
FROM public.vw_stopline_promised_vs_real_30d r
JOIN public.stops s ON s.id = r.stop_id
WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
GROUP BY s.neighborhood, r.line_id
HAVING ROW_NUMBER() OVER (PARTITION BY COALESCE(s.neighborhood, 'Desconhecido') ORDER BY AVG(r.delta_min) DESC NULLS LAST) <= 10;
