-- Migration 0043: Push sending logs and deactivation reasons

-- Add deactivation reason to subscriptions
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Create logs table for push sends
CREATE TABLE IF NOT EXISTS push_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT REFERENCES push_subscriptions(device_id) ON DELETE CASCADE,
    send_type TEXT NOT NULL, -- 'IMMEDIATE', 'DIGEST'
    status TEXT NOT NULL, -- 'OK', 'FAIL'
    status_code INTEGER,
    error_message TEXT,
    retries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin status queries
CREATE INDEX IF NOT EXISTS idx_push_send_logs_created_at ON push_send_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_push_send_logs_status ON push_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active_reason ON push_subscriptions(is_active, deactivation_reason);
