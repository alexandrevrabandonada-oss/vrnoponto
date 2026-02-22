-- Migration 0037: Telegram Notifications Tracking
-- Track which alerts have been sent to Telegram to avoid duplication/spam

CREATE TABLE IF NOT EXISTS public.alert_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel text NOT NULL DEFAULT 'telegram',
    alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    sent_at timestamptz DEFAULT now(),
    status text NOT NULL, -- 'OK' | 'FAIL'
    error text NULL,
    
    -- Ensure we don't send the same alert to the same channel twice
    CONSTRAINT alert_notifications_channel_alert_unique UNIQUE (channel, alert_id)
);

-- RLS
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Allow service_role full access on alert_notifications" 
ON public.alert_notifications FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Index for status and sent_at for admin dash
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON public.alert_notifications (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON public.alert_notifications (status);

-- RPC for fetching unsent alerts with details (names, neighborhood)
CREATE OR REPLACE FUNCTION public.get_unsent_telegram_alerts(lim int)
RETURNS TABLE (
    id uuid,
    alert_type text,
    target_id uuid,
    severity text,
    delta_pct numeric,
    metric_p50 numeric,
    prev_metric_p50 numeric,
    target_name text,
    line_code text,
    neighborhood text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.alert_type,
        a.target_id,
        a.severity,
        a.delta_pct,
        a.metric_p50,
        a.prev_metric_p50,
        COALESCE(s.name, l.name) as target_name,
        l.code as line_code,
        s.neighborhood
    FROM public.alerts a
    LEFT JOIN public.stops s ON a.alert_type = 'STOP_WAIT' AND a.target_id = s.id
    LEFT JOIN public.lines l ON (a.alert_type = 'LINE_HEADWAY' AND a.target_id = l.id)
                          OR (a.alert_type = 'STOP_WAIT' AND s.id IS NOT NULL AND FALSE) -- Just for schema clarity
    WHERE a.is_active = true
      AND a.severity IN ('WARN', 'CRIT')
      AND NOT EXISTS (
          SELECT 1 FROM public.alert_notifications an 
          WHERE an.alert_id = a.id AND an.channel = 'telegram' AND an.status = 'OK'
      )
    ORDER BY 
        CASE a.severity WHEN 'CRIT' THEN 1 WHEN 'WARN' THEN 2 ELSE 3 END,
        a.created_at DESC
    LIMIT lim;
END;
$$;
