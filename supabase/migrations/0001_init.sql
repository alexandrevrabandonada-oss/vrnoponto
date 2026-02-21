-- Habilitar extensão PostGIS (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- ==== 1. TABELAS BASE ====

CREATE TABLE public.lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.line_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    direction VARCHAR NOT NULL, -- inbound, outbound, circular
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR,
    name VARCHAR NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.official_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_variant_id UUID NOT NULL REFERENCES public.line_variants(id) ON DELETE CASCADE,
    departure_time TIME NOT NULL,
    day_type VARCHAR NOT NULL, -- business_day, saturday, sunday, holiday
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==== 2. TABELAS DE EVENTOS E CROWDSOURCING ====

CREATE TABLE public.stop_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
    line_id UUID REFERENCES public.lines(id) ON DELETE CASCADE,
    device_id VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL, -- arrived, boarding, passed_by, delayed
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stop_events_device_id_check CHECK (length(device_id) > 0)
);

CREATE TABLE public.bus_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
    device_id VARCHAR NOT NULL,
    crowding_level INT NOT NULL CHECK (crowding_level BETWEEN 1 AND 5),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bus_ratings_device_id_check CHECK (length(device_id) > 0)
);

CREATE TABLE public.trust_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.stop_events(id) ON DELETE CASCADE,
    device_id VARCHAR NOT NULL,
    is_confirmed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trust_confirmations_device_id_check CHECK (length(device_id) > 0)
);

CREATE TABLE public.qr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
    device_id VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT qr_checkins_device_id_check CHECK (length(device_id) > 0)
);

CREATE TABLE public.admin_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR NOT NULL, -- stop, line
    target_id UUID NOT NULL,
    message TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==== 3. ÍNDICES ====

CREATE INDEX idx_stop_events_stop_line_time ON public.stop_events (stop_id, line_id, occurred_at DESC);
CREATE INDEX idx_bus_ratings_line_time ON public.bus_ratings (line_id, occurred_at DESC);
CREATE INDEX idx_stops_location ON public.stops USING GIST (location);

-- ==== 4. ROW LEVEL SECURITY (RLS) ====

ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_flags ENABLE ROW LEVEL SECURITY;

-- Leitura Pública
CREATE POLICY "Leitura publica de linhas ativas" ON public.lines FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura publica de variantes" ON public.line_variants FOR SELECT USING (true);
CREATE POLICY "Leitura publica de pontos ativos" ON public.stops FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura publica de horarios oficiais" ON public.official_schedules FOR SELECT USING (true);
CREATE POLICY "Leitura publica de alertas administrativos" ON public.admin_flags FOR SELECT USING (expires_at > now());

-- Inserção pelo App (Anônima / Crowdsourcing) com verificação de device_id incluso no schema
CREATE POLICY "Adicionar eventos anonimamente" ON public.stop_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Avaliar onibus anonimamente" ON public.bus_ratings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Confirmar evento anonimamente" ON public.trust_confirmations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Check-in em pontos anonimamente" ON public.qr_checkins FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Leitura de métricas (mesmo na tabela de eventos) muitas vezes é feita via RPC ou Views de Materialized
-- mas vamos permitir que a leitura de eventos recentes seja pública para os painéis
CREATE POLICY "Leitura publica de eventos" ON public.stop_events FOR SELECT USING (true);
CREATE POLICY "Leitura publica de ratings" ON public.bus_ratings FOR SELECT USING (true);

-- ==== 5. VIEWS ====

-- placeholder para view de status recentes
CREATE VIEW public.vw_recent_stop_events AS
SELECT e.id, e.stop_id, e.line_id, e.event_type, e.occurred_at,
       s.name as stop_name, l.code as line_code
FROM public.stop_events e
JOIN public.stops s ON e.stop_id = s.id
JOIN public.lines l ON e.line_id = l.id
WHERE e.occurred_at >= NOW() - INTERVAL '2 hours';
