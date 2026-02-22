-- Migration 0032: Neighborhood polygon shapes table (PostGIS)
-- Requires PostGIS extension on the Supabase instance

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.neighborhood_shapes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood text NOT NULL UNIQUE,
    geom geography(MULTIPOLYGON, 4326) NOT NULL,
    source text NULL,
    updated_at timestamptz DEFAULT now()
);

-- Spatial index for fast geo queries
CREATE INDEX IF NOT EXISTS idx_neighborhood_shapes_geom ON public.neighborhood_shapes USING GIST (geom);

-- Text index for fast lookups by name
CREATE INDEX IF NOT EXISTS idx_neighborhood_shapes_name ON public.neighborhood_shapes (neighborhood);
