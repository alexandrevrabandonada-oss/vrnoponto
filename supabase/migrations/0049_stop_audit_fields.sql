-- Migration 0049: Stop Audit Fields
-- Adding columns for registration source and attribution

ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS created_by_device_id text;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS gps_accuracy_m int;

-- Ensure created_at exists (it should from 0001_init.sql)
-- ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
