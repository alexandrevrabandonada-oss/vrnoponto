-- Migration 0035: Normalized neighborhood columns + triggers
-- Adds neighborhood_norm to stops, partners, neighborhood_shapes

-- Helper: basic SQL-side normalization (uppercase + strip accents via translate)
-- Note: Full normalization with abbreviation expansion is done in TS.
-- This trigger provides a baseline; the admin re-normalize endpoint does the full pipeline.
CREATE OR REPLACE FUNCTION public.normalize_neighborhood_basic(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT public.apply_neighborhood_alias(
        TRIM(
            REGEXP_REPLACE(
                UPPER(
                    TRANSLATE(
                        TRIM(COALESCE(raw, '')),
                        'àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
                        'aaaaaaeeeeiiiioooooouuuuyycnAAAAAAEEEEIIIIOOOOOUUUUYYCN'
                    )
                ),
                '[.,\-''"´`]+', ' ', 'g'
            )
        )
    );
$$;

-- 1. stops: add neighborhood_norm
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS neighborhood_norm text;
CREATE INDEX IF NOT EXISTS idx_stops_neighborhood_norm ON public.stops (neighborhood_norm);

-- Backfill existing data
UPDATE public.stops SET neighborhood_norm = public.normalize_neighborhood_basic(neighborhood)
WHERE neighborhood IS NOT NULL AND neighborhood_norm IS NULL;

-- Trigger
CREATE OR REPLACE FUNCTION public.trg_stops_neighborhood_norm()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.neighborhood_norm := public.normalize_neighborhood_basic(NEW.neighborhood);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stops_set_neighborhood_norm ON public.stops;
CREATE TRIGGER trg_stops_set_neighborhood_norm
    BEFORE INSERT OR UPDATE OF neighborhood ON public.stops
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_stops_neighborhood_norm();

-- 2. partners: add neighborhood_norm
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS neighborhood_norm text;
CREATE INDEX IF NOT EXISTS idx_partners_neighborhood_norm ON public.partners (neighborhood_norm);

UPDATE public.partners SET neighborhood_norm = public.normalize_neighborhood_basic(neighborhood)
WHERE neighborhood IS NOT NULL AND neighborhood_norm IS NULL;

CREATE OR REPLACE FUNCTION public.trg_partners_neighborhood_norm()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.neighborhood_norm := public.normalize_neighborhood_basic(NEW.neighborhood);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_set_neighborhood_norm ON public.partners;
CREATE TRIGGER trg_partners_set_neighborhood_norm
    BEFORE INSERT OR UPDATE OF neighborhood ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_partners_neighborhood_norm();

-- 3. neighborhood_shapes: add neighborhood_norm
ALTER TABLE public.neighborhood_shapes ADD COLUMN IF NOT EXISTS neighborhood_norm text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_neighborhood_shapes_norm ON public.neighborhood_shapes (neighborhood_norm);

UPDATE public.neighborhood_shapes SET neighborhood_norm = public.normalize_neighborhood_basic(neighborhood)
WHERE neighborhood IS NOT NULL AND neighborhood_norm IS NULL;

CREATE OR REPLACE FUNCTION public.trg_shapes_neighborhood_norm()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.neighborhood_norm := public.normalize_neighborhood_basic(NEW.neighborhood);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shapes_set_neighborhood_norm ON public.neighborhood_shapes;
CREATE TRIGGER trg_shapes_set_neighborhood_norm
    BEFORE INSERT OR UPDATE OF neighborhood ON public.neighborhood_shapes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_shapes_neighborhood_norm();

-- 4. Update polygon metrics view to prefer neighborhood_norm
CREATE OR REPLACE VIEW public.vw_neighborhood_polygon_metrics_30d AS
SELECT
    ns.neighborhood,
    ns.neighborhood_norm,
    ST_AsGeoJSON(ns.geom)::json AS geojson,
    COALESCE(m.avg_delta_min, 0) AS avg_delta_min,
    COALESCE(m.stops_count, 0) AS stops_count,
    COALESCE(m.samples_total, 0) AS samples_total,
    COALESCE(m.pct_verified_avg, 0) AS pct_verified_avg,
    COALESCE(m.risk_band, 'OK') AS risk_band,
    ns.source,
    ns.updated_at
FROM public.neighborhood_shapes ns
LEFT JOIN public.vw_neighborhood_map_30d m
    ON COALESCE(m.neighborhood, '') = COALESCE(ns.neighborhood_norm, ns.neighborhood, '');
