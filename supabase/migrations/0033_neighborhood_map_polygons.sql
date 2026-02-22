-- Migration 0033: Combined view joining polygon shapes with neighborhood metrics
-- Returns GeoJSON geometry string alongside all metrics for the map layer

CREATE OR REPLACE VIEW public.vw_neighborhood_polygon_metrics_30d AS
SELECT
    ns.neighborhood,
    ST_AsGeoJSON(ns.geom)::json AS geojson,
    COALESCE(m.avg_delta_min, 0) AS avg_delta_min,
    COALESCE(m.stops_count, 0) AS stops_count,
    COALESCE(m.samples_total, 0) AS samples_total,
    COALESCE(m.pct_verified_avg, 0) AS pct_verified_avg,
    COALESCE(m.risk_band, 'OK') AS risk_band,
    ns.source,
    ns.updated_at
FROM public.neighborhood_shapes ns
LEFT JOIN public.vw_neighborhood_map_30d m ON m.neighborhood = ns.neighborhood;
