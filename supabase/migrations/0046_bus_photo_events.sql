-- Migration 0046: Optional Bus Photo Proof flow (offline-first friendly)
-- Adds proof table + private storage bucket.

CREATE TABLE IF NOT EXISTS public.bus_photo_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    device_id TEXT NOT NULL CHECK (length(device_id) > 0),
    stop_id UUID NULL REFERENCES public.stops(id) ON DELETE SET NULL,
    line_id UUID NULL REFERENCES public.lines(id) ON DELETE SET NULL,
    event_id UUID NULL REFERENCES public.stop_events(id) ON DELETE SET NULL,
    lat DOUBLE PRECISION NULL,
    lng DOUBLE PRECISION NULL,
    photo_path TEXT NOT NULL,
    ai_text TEXT NULL,
    ai_line_guess TEXT NULL,
    ai_confidence INT NULL CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    user_confirmed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_bus_photo_events_created_at
    ON public.bus_photo_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bus_photo_events_event_id
    ON public.bus_photo_events(event_id);

CREATE INDEX IF NOT EXISTS idx_bus_photo_events_stop_line
    ON public.bus_photo_events(stop_id, line_id);

ALTER TABLE public.bus_photo_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public read bus photo events" ON public.bus_photo_events;
CREATE POLICY "No public read bus photo events"
    ON public.bus_photo_events
    FOR SELECT
    USING (false);

DROP POLICY IF EXISTS "No public insert bus photo events" ON public.bus_photo_events;
CREATE POLICY "No public insert bus photo events"
    ON public.bus_photo_events
    FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "Service role full access bus photo events" ON public.bus_photo_events;
CREATE POLICY "Service role full access bus photo events"
    ON public.bus_photo_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Private bucket for proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof', 'proof', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Service role manage proof objects" ON storage.objects;
CREATE POLICY "Service role manage proof objects"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'proof')
    WITH CHECK (bucket_id = 'proof');
