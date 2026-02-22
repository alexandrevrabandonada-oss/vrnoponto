-- Migration 0031 (patched): Neighborhood map centroids and risk bands
-- Supports stops stored as lat/lng OR PostGIS geom (geography/geometry)

DO $$
DECLARE
  has_lat boolean;
  has_lng boolean;
  has_geom boolean;
  v_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stops' AND column_name='lat'
  ) INTO has_lat;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stops' AND column_name='lng'
  ) INTO has_lng;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stops' AND column_name='geom'
  ) INTO has_geom;

  IF has_lat AND has_lng THEN
    v_sql := $v$
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
          COUNT(*)::int AS stops_count
        FROM public.stops
        GROUP BY COALESCE(neighborhood, 'Desconhecido')
      ) n
      LEFT JOIN public.vw_neighborhood_detail_30d d
        ON d.neighborhood = n.neighborhood;
    $v$;

  ELSIF has_geom THEN
    v_sql := $v$
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
          ST_Y(ST_Centroid(ST_Collect(geom::geometry)))::double precision AS centroid_lat,
          ST_X(ST_Centroid(ST_Collect(geom::geometry)))::double precision AS centroid_lng,
          COUNT(*)::int AS stops_count
        FROM public.stops
        WHERE geom IS NOT NULL
        GROUP BY COALESCE(neighborhood, 'Desconhecido')
      ) n
      LEFT JOIN public.vw_neighborhood_detail_30d d
        ON d.neighborhood = n.neighborhood;
    $v$;

  ELSE
    -- fallback: don't block migrations even if stops has no coordinates
    v_sql := $v$
      CREATE OR REPLACE VIEW public.vw_neighborhood_map_30d AS
      SELECT
        COALESCE(d.neighborhood, 'Desconhecido') AS neighborhood,
        NULL::double precision AS centroid_lat,
        NULL::double precision AS centroid_lng,
        COALESCE(d.avg_delta_min, 0) AS avg_delta_min,
        COALESCE(d.stops_count, 0) AS stops_count,
        COALESCE(d.samples_total, 0) AS samples_total,
        COALESCE(d.pct_verified_avg, 0) AS pct_verified_avg,
        CASE
          WHEN d.avg_delta_min IS NULL OR d.avg_delta_min <= 3 THEN 'OK'
          WHEN d.avg_delta_min <= 8 THEN 'ATTENTION'
          WHEN d.avg_delta_min <= 15 THEN 'BAD'
          ELSE 'CRIT'
        END AS risk_band
      FROM public.vw_neighborhood_detail_30d d;
    $v$;
  END IF;

  EXECUTE v_sql;
END $$;