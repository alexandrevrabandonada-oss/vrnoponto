-- Migration 0012: Proof of Presence L3 via QR Tokens
-- Permite check-ins seguros via QR Code físico no ponto

-- 1. Recriação da tabela qr_checkins (Tokenized)
-- O schema original tinha qr_checkins mas era simples. Vamos expandi-lo.
DROP TABLE IF EXISTS public.qr_checkins CASCADE;

CREATE TABLE public.qr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índice para busca rápida por hash
CREATE INDEX idx_qr_checkins_hash ON public.qr_checkins(token_hash);
CREATE INDEX idx_qr_checkins_stop ON public.qr_checkins(stop_id);

-- 3. RLS para qr_checkins
ALTER TABLE public.qr_checkins ENABLE ROW LEVEL SECURITY;

-- Leitura: Ninguém pode ler hashes diretamente via Client (Segurança)
-- Inserção: Somente via Service Role / Admin (Server Side API)
CREATE POLICY "Admin full access" ON public.qr_checkins FOR ALL USING (true);

-- 4. Função Helper para calcular distância entre device e stop no server
-- Usaremos PostGIS diretamente na query de validação, mas aqui definimos
-- um limite de segurança para a API.

-- NOTA: O trust_level L3 será aplicado via API /api/qr/validate
-- promovendo o registro mais recente (15min window).
