-- Migration 0045: Stop Suggestions Deduplication
-- Adds confirmations counter, canonical_id, and RPCs for dedup logic

-- 1. New columns
ALTER TABLE public.stop_suggestions
    ADD COLUMN IF NOT EXISTS confirmations int NOT NULL DEFAULT 1;

ALTER TABLE public.stop_suggestions
    ADD COLUMN IF NOT EXISTS canonical_id uuid NULL
    REFERENCES public.stop_suggestions(id) ON DELETE SET NULL;

-- 2. RPC: Find nearby PENDING suggestion within radius and time window
CREATE OR REPLACE FUNCTION public.rpc_find_nearby_pending_suggestion(
    lat double precision,
    lng double precision,
    meters int DEFAULT 30,
    days int DEFAULT 7
)
RETURNS TABLE (id uuid, dist_m int)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        ss.id,
        ROUND(ST_Distance(ss.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography))::int AS dist_m
    FROM public.stop_suggestions ss
    WHERE ss.status = 'PENDING'
      AND ST_DWithin(ss.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, meters)
      AND ss.created_at >= now() - make_interval(days => days)
      AND ss.canonical_id IS NULL  -- only match originals, not dupes
    ORDER BY
        ST_Distance(ss.geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) ASC,
        ss.created_at DESC
    LIMIT 1;
$$;

-- 3. RPC: Increment confirmations on a suggestion
CREATE OR REPLACE FUNCTION public.rpc_increment_suggestion_confirmations(
    suggestion_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count int;
BEGIN
    UPDATE public.stop_suggestions
    SET confirmations = confirmations + 1
    WHERE id = suggestion_id
    RETURNING confirmations INTO new_count;

    RETURN COALESCE(new_count, 0);
END;
$$;
