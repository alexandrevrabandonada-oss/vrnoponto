-- Migration 0043 (patched): push send logs
-- Fix: push_subscriptions.device_id is not unique (a device can have multiple endpoints).
-- Use subscription_id (FK to push_subscriptions.id) and keep device_id as plain text.

CREATE TABLE IF NOT EXISTS public.push_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NULL REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  device_id text NOT NULL,
  send_type text NOT NULL, -- 'IMMEDIATE', 'DIGEST'
  status text NOT NULL, -- 'OK', 'FAIL'
  status_code integer,
  error_message text,
  retries integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_send_logs_created_at
  ON public.push_send_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_send_logs_device_id
  ON public.push_send_logs (device_id);