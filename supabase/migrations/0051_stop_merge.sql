-- Migration 0051: Stop Merge Support
-- Adds fields to track merged stops and an RPC to handle the transactional merge.

ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.stops(id) ON DELETE SET NULL;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS merge_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_stops_merged_into_id ON public.stops(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- RPC to merge stops transactionally
CREATE OR REPLACE FUNCTION public.merge_stops(
    from_stop_id UUID,
    to_stop_id UUID,
    reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    moved_events INT := 0;
    moved_checkins INT := 0;
    moved_photos INT := 0;
    moved_alerts INT := 0;
BEGIN
    -- 1. Update stop_events
    UPDATE public.stop_events 
    SET stop_id = to_stop_id 
    WHERE stop_id = from_stop_id;
    GET DIAGNOSTICS moved_events = ROW_COUNT;

    -- 2. Update qr_checkins
    UPDATE public.qr_checkins 
    SET stop_id = to_stop_id 
    WHERE stop_id = from_stop_id;
    GET DIAGNOSTICS moved_checkins = ROW_COUNT;

    -- 3. Update bus_photo_events
    UPDATE public.bus_photo_events 
    SET stop_id = to_stop_id 
    WHERE stop_id = from_stop_id;
    GET DIAGNOSTICS moved_photos = ROW_COUNT;

    -- 4. Update alerts (handling potential duplicate week conflicts)
    -- We delete conflicting alerts from the 'from' stop before moving the rest
    DELETE FROM public.alerts a1
    USING public.alerts a2
    WHERE a1.target_id = from_stop_id
      AND a2.target_id = to_stop_id
      AND a1.alert_type = a2.alert_type
      AND a1.week_start = a2.week_start;

    UPDATE public.alerts 
    SET target_id = to_stop_id 
    WHERE target_id = from_stop_id AND alert_type = 'STOP_WAIT';
    GET DIAGNOSTICS moved_alerts = ROW_COUNT;

    -- 5. Finalize stop status
    UPDATE public.stops 
    SET is_active = false, 
        merged_into_id = to_stop_id, 
        merge_reason = reason 
    WHERE id = from_stop_id;

    RETURN jsonb_build_object(
        'events', moved_events,
        'checkins', moved_checkins,
        'photos', moved_photos,
        'alerts', moved_alerts
    );
END;
$$;
