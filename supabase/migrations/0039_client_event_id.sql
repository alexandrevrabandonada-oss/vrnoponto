-- Migration: 0039_client_event_id
-- Description: Add client_event_id to stop_events for offline queue idempotency

ALTER TABLE public.stop_events
ADD COLUMN IF NOT EXISTS client_event_id VARCHAR(36);

-- Backfill existing rows with their primary key UUIDs so the unique constraint doesn't fail on historic rows
-- OR we can just allow NULL initially, but given it's a new check, let's keep it clean
-- A unique partial index is safer than a strict UNIQUE constraint for retro-compatibility.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stop_events_client_event_id 
ON public.stop_events(client_event_id) 
WHERE client_event_id IS NOT NULL;
