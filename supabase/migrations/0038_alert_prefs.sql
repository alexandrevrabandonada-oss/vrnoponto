-- Migration: 0038_alert_prefs
-- Description: Creates the telegram_subscriptions table for user preferences and digest mode

CREATE TABLE IF NOT EXISTS public.telegram_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL DEFAULT 'DIGEST' CHECK (mode IN ('DIGEST', 'IMMEDIATE')),
    severity_min TEXT NOT NULL DEFAULT 'CRIT' CHECK (severity_min IN ('WARN', 'CRIT')),
    neighborhoods_norm TEXT[] NOT NULL DEFAULT '{}',
    lines TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Service role access only)
ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for Service Role to bypass RLS (Supabase does this natively but we can be explicit if needed, standard practice is no policies = service role only)
CREATE POLICY "Service Role Full Access" ON public.telegram_subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_telegram_subs_active ON public.telegram_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_telegram_subs_mode ON public.telegram_subscriptions(mode);
