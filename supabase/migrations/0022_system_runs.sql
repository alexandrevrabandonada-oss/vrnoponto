-- Migration 0022: System Runs Log
-- Rastreia a saúde e histórico de execuções de cronjobs e rotinas manuais do sistema

CREATE TABLE IF NOT EXISTS public.system_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job TEXT NOT NULL CHECK (job IN ('sync_official', 'run_alerts', 'bulletin_card', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('OK', 'WARN', 'FAIL', 'RUNNING')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_runs_job_finished_desc
    ON public.system_runs (job, finished_at DESC NULLS LAST);

-- RLS
ALTER TABLE public.system_runs ENABLE ROW LEVEL SECURITY;

-- Admins (via painel Supabase / Server) acessam tudo
CREATE POLICY "Admins full access system_runs" ON public.system_runs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
