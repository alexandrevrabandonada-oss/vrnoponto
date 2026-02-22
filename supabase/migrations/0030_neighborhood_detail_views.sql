-- VRNP PATCH: no window func in HAVING
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
WITH base AS (
  SELECT
    COALESCE(s.neighborhood, 'Desconhecido') AS neighborhood,
    s.id AS stop_id,
    s.name AS stop_name,
    MAX(r.delta_min) AS worst_delta_min,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    SUM(r.samples)::bigint AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg
  FROM public.vw_stopline_promised_vs_real_30d r
  JOIN public.stops s ON s.id = r.stop_id
  WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
  GROUP BY COALESCE(s.neighborhood, 'Desconhecido'), s.id, s.name
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY neighborhood ORDER BY worst_delta_min DESC NULLS LAST) AS rn
  FROM base
)
SELECT
  neighborhood,
  stop_id,
  stop_name,
  worst_delta_min,
  avg_delta_min,
  samples_total,
  pct_verified_avg
FROM ranked
WHERE rn <= 20;

-- 3. Top lines per neighborhood

CREATE OR REPLACE VIEW public.vw_neighborhood_top_lines_30d AS
WITH base AS (
  SELECT
    COALESCE(s.neighborhood, 'Desconhecido') AS neighborhood,
    l.id AS line_id,
    l.code AS line_code,
    l.name AS line_name,
    NULL::text AS operator,
    ROUND(AVG(r.delta_min)::numeric, 1) AS avg_delta_min,
    SUM(r.samples)::bigint AS samples_total,
    ROUND((SUM(r.samples * r.pct_verified) / NULLIF(SUM(r.samples), 0))::numeric, 1) AS pct_verified_avg
  FROM public.vw_stopline_promised_vs_real_30d r
  JOIN public.stops s ON s.id = r.stop_id
  JOIN public.lines l ON l.id = r.line_id
  WHERE r.meta = 'OK' AND r.delta_min IS NOT NULL
  GROUP BY COALESCE(s.neighborhood, 'Desconhecido'), l.id, l.code, l.name
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY neighborhood ORDER BY avg_delta_min DESC NULLS LAST) AS rn
  FROM base
)
SELECT neighborhood, line_id, line_code, line_name, operator, avg_delta_min, samples_total, pct_verified_avg
FROM ranked
WHERE rn <= 10;
