-- Migration 0024: Structures for caching the Extracted PDF Text to Data (Horários Oificais)
-- This tables stores the outcome of the backend parsing script that extracts 'Promised' trips
-- grouped by day_type and active hours.

-- Tabela de auditoria do parser
CREATE TABLE public.official_schedule_parse_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.official_schedules(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- OK | WARN | FAIL
    parser_version TEXT NOT NULL,
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    meta JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS na tabela de logs (só leitura pública por precaução)
ALTER TABLE public.official_schedule_parse_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica parse_runs" ON public.official_schedule_parse_runs FOR SELECT USING (true);


-- Tabela de Headway Oficial ("O Prometido" da Prefeitura/Operadora)
CREATE TABLE public.official_schedule_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.official_schedules(id) ON DELETE CASCADE,
    day_group TEXT NOT NULL, -- WEEKDAY | SAT | SUN
    hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
    trips INT NOT NULL DEFAULT 0,
    promised_headway_min NUMERIC NULL,
    override_promised_headway_min NUMERIC NULL, -- Para correções manuais do Admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schedule_id, day_group, hour)
);

-- Habilitar RLS e Permissões de Leitura
ALTER TABLE public.official_schedule_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica prometido" ON public.official_schedule_hourly FOR SELECT USING (true);
