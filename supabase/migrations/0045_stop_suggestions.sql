-- Migration 0044: Stop Suggestions table
-- Allows users to suggest new bus stops when none are found nearby

CREATE TABLE public.stop_suggestions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    status          text NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    name_suggested  text NOT NULL,
    notes           text,
    geom            geography(POINT, 4326) NOT NULL,
    neighborhood_text text,
    source          text NOT NULL DEFAULT 'user',
    admin_note      text,
    decided_at      timestamptz
);

-- Spatial index for proximity queries
CREATE INDEX idx_stop_suggestions_geom ON public.stop_suggestions USING GIST (geom);

-- Index for admin listing by status
CREATE INDEX idx_stop_suggestions_status ON public.stop_suggestions (status, created_at DESC);

-- Enable RLS
ALTER TABLE public.stop_suggestions ENABLE ROW LEVEL SECURITY;

-- Public INSERT allowed (anonymous users can suggest stops)
CREATE POLICY "Sugestao publica de pontos"
    ON public.stop_suggestions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- No public SELECT (suggestions are only visible to admins via service role / API)
-- service_role bypasses RLS automatically
