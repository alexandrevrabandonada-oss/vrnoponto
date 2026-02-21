-- Migration 0015: Pontos Parceiros e QR Flexível
-- Permite cadastrar estabelecimentos que podem ter seu próprio QR Code.

-- 1. Tabela de parceiros
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT, -- comercio, sindicato, associacao, etc.
    address TEXT,
    neighborhood TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajuste na qr_checkins para suportar parceiros
-- Primeiro, tornamos stop_id opcional
ALTER TABLE public.qr_checkins ALTER COLUMN stop_id DROP NOT NULL;

-- Adicionamos partner_id
ALTER TABLE public.qr_checkins 
    ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE;

-- Adicionamos restrição: deve ter stop_id OU partner_id
ALTER TABLE public.qr_checkins
    ADD CONSTRAINT check_qr_ancora 
    CHECK ((stop_id IS NOT NULL AND partner_id IS NULL) OR (stop_id IS NULL AND partner_id IS NOT NULL));

-- Índices extras
CREATE INDEX IF NOT EXISTS idx_qr_checkins_partner ON public.qr_checkins(partner_id);

-- 3. RLS para partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access partners" ON public.partners FOR ALL USING (true);
CREATE POLICY "Public read active partners" ON public.partners FOR SELECT USING (is_active = true);

-- Comentários
COMMENT ON TABLE public.partners IS 'Locais autorizados (comércio, sindicatos) que podem hospedar QR Codes L3';

-- 4. Função Helper Genérica para cálculo de distância
CREATE OR REPLACE FUNCTION public.get_distance_meters_v2(
    target_location GEOGRAPHY,
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION
) 
RETURNS DOUBLE PRECISION AS $$
BEGIN
    IF target_location IS NULL THEN
        RETURN -1;
    END IF;

    RETURN ST_Distance(target_location, ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
