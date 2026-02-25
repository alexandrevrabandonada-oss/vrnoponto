-- Migration 0050: Operator Tokens
-- Temporary access for field operators to suggest stops

CREATE TABLE IF NOT EXISTS public.operator_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    label TEXT, -- Name of the operator or event
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for fast lookup
CREATE INDEX idx_operator_tokens_token ON public.operator_tokens (token);

-- RLS: Service role only (server side)
ALTER TABLE public.operator_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage operator tokens" ON public.operator_tokens;
CREATE POLICY "Service role manage operator tokens"
    ON public.operator_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
