-- Migration 0042: Web Push Notifications Schema

-- 1. push_subscriptions
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    UNIQUE(device_id, endpoint)
);

-- 2. push_preferences
CREATE TABLE public.push_preferences (
    device_id TEXT PRIMARY KEY,
    mode TEXT DEFAULT 'DIGEST', -- 'DIGEST' | 'IMMEDIATE'
    severity_min TEXT DEFAULT 'CRIT', -- 'WARN' | 'CRIT'
    neighborhoods_norm TEXT[] DEFAULT '{}',
    lines TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. push_sends (anti-spam)
CREATE TABLE public.push_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    send_type TEXT NOT NULL, -- 'DIGEST_DAILY' | 'ALERT_IMMEDIATE'
    dedupe_key TEXT NOT NULL UNIQUE,
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS and Restrict Access
-- Since sensitive data (endpoint, p256dh, auth) is stored here,
-- we enforce strict RLS. Only Service Role can access.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_sends ENABLE ROW LEVEL SECURITY;

-- No generic policies created means ONLY postgres superuser and service_role can perform CRUD.
-- All client access MUST go through Next.js API Routes using the Service Role Key.
