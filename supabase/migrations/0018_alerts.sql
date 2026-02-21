-- Migration 0018: Automated Alerts System
-- Gerado em: 2026-02-21

CREATE TABLE IF NOT EXISTS public.alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type text NOT NULL, -- 'STOP_WAIT' | 'LINE_HEADWAY'
    target_id uuid NOT NULL, -- stop_id ou line_id
    week_start date NOT NULL,
    metric_p50 numeric NOT NULL,
    prev_metric_p50 numeric NULL,
    delta_pct numeric NULL,
    severity text NOT NULL DEFAULT 'INFO', -- 'INFO' | 'WARN' | 'CRIT'
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    meta jsonb DEFAULT '{}'::jsonb,
    
    -- Idempotência: um alerta por tipo/alvo/semana
    CONSTRAINT alerts_type_target_week_unique UNIQUE (alert_type, target_id, week_start)
);

-- RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Select público (alertas ativos)
CREATE POLICY "Allow public select on active alerts" 
ON public.alerts FOR SELECT 
USING (is_active = true);

-- Service role pode tudo
CREATE POLICY "Allow service_role full access on alerts" 
ON public.alerts FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
