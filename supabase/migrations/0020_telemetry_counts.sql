-- Migration 0020: Telemetria de Conversão do Onboarding
-- Armazena apenas contadores por evento por dia. Sem IP, sem PII.

CREATE TABLE IF NOT EXISTS public.telemetry_counts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key   text NOT NULL,
    count       bigint NOT NULL DEFAULT 0,
    date        date NOT NULL DEFAULT current_date,

    CONSTRAINT telemetry_counts_unique_event_date UNIQUE (event_key, date)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_date ON public.telemetry_counts(event_key, date DESC);

-- RLS
ALTER TABLE public.telemetry_counts ENABLE ROW LEVEL SECURITY;

-- Insert/update público (nenhum dado pessoal armazenado)
CREATE POLICY "Allow public upsert on telemetry_counts"
ON public.telemetry_counts FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
