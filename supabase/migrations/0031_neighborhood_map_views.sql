-- Migration 0031: Neighborhood map centroids and risk bands
-- Centroid is the average lat/lng of all active stops in the neighborhood

CREATE OR REPLACE VIEW public.vw_neighborhood_map_30d AS
SELECT
    n.neighborhood,
    n.centroid_lat,
    n.centroid_lng,
    COALESCE(d.avg_delta_min, 0) AS avg_delta_min,
    COALESCE(d.stops_count, n.stops_count) AS stops_count,
    COALESCE(d.samples_total, 0) AS samples_total,
    COALESCE(d.pct_verified_avg, 0) AS pct_verified_avg,
    CASE
        WHEN d.avg_delta_min IS NULL OR d.avg_delta_min <= 3 THEN 'OK'
        WHEN d.avg_delta_min <= 8 THEN 'ATTENTION'
        WHEN d.avg_delta_min <= 15 THEN 'BAD'
        ELSE 'CRIT'
    END AS risk_band
FROM (
    SELECT
        COALESCE(neighborhood, 'Desconhecido') AS neighborhood,
        AVG(lat) AS centroid_lat,
        AVG(lng) AS centroid_lng,
        COUNT(*) AS stops_count
    FROM public.stops
    WHERE lat IS NOT NULL AND lng IS NOT NULL AND is_active = true
    GROUP BY neighborhood
    HAVING COUNT(*) >= 2
) n
LEFT JOIN public.vw_neighborhood_detail_30d d ON d.neighborhood = n.neighborhood;
