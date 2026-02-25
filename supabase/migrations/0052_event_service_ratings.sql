-- Create event_service_ratings table
CREATE TABLE IF NOT EXISTS public.event_service_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id text NOT NULL,
    client_event_id uuid NOT NULL,
    event_id uuid NULL,
    rating text NOT NULL CHECK (rating IN ('GOOD', 'REGULAR', 'BAD')),
    rating_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_device_client_event UNIQUE (device_id, client_event_id)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_ratings_device_at ON public.event_service_ratings (device_id, rating_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_event_id ON public.event_service_ratings (event_id);

-- Enable RLS
ALTER TABLE public.event_service_ratings ENABLE ROW LEVEL SECURITY;

-- Privacy-first: Deny public SELECT
-- Note: By default, if no policies are created, all access is denied except for the service_role.
-- We explicitly do not create a SELECT policy for public/authenticated users.

-- If we want to allow INSERT via client (since it's a rating collected from device), 
-- we need to decide if it's via service_role (server-side) or client-side.
-- The user mentioned: "criar policy que permita INSERT/UPDATE apenas via service role (ou nenhuma policy e deixar apenas via service role)."
-- I will leave it with no policies, so it's service-role only.
