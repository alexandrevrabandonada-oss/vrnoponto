-- Migration for Backfilling empty neighborhood mappings using PostGIS geofences

CREATE OR REPLACE FUNCTION public.rpc_backfill_neighborhoods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated integer;
BEGIN
    UPDATE public.stops s
    SET 
        neighborhood = ns.neighborhood,
        updated_at = NOW()
    FROM public.neighborhood_shapes ns
    WHERE 
        ST_Contains(ns.geom, s.location)
        And (s.neighborhood IS NULL OR s.neighborhood = '');

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'updated', v_updated);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
