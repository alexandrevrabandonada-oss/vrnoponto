-- Migration: 0040_invite_ab
-- Description: Partner Invite A/B Testing schema

CREATE TABLE public.invite_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(10) NOT NULL UNIQUE, -- 'A', 'B', etc
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow public reads (since the UI needs to fetch active variants)
ALTER TABLE public.invite_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active variants"
    ON public.invite_variants FOR SELECT
    USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Allow service role full access"
    ON public.invite_variants FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Statistics Table
CREATE TABLE public.invite_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    variant_key VARCHAR(10) NOT NULL REFERENCES public.invite_variants(key) ON DELETE CASCADE,
    impressions INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(day, variant_key)
);

ALTER TABLE public.invite_impressions ENABLE ROW LEVEL SECURITY;

-- Admins can access
CREATE POLICY "Allow service role full access"
    ON public.invite_impressions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create a secure RPC to increment stats so the edge functions can just fire and forget
CREATE OR REPLACE FUNCTION increment_invite_stat(
    p_variant_key VARCHAR(10),
    p_stat_type VARCHAR(10) -- 'impression' or 'click'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as DB owner
AS $$
DECLARE
    v_day DATE := CURRENT_DATE;
BEGIN
    IF p_stat_type = 'impression' THEN
        INSERT INTO public.invite_impressions (day, variant_key, impressions, clicks)
        VALUES (v_day, p_variant_key, 1, 0)
        ON CONFLICT (day, variant_key) 
        DO UPDATE SET impressions = invite_impressions.impressions + 1;
    ELSIF p_stat_type = 'click' THEN
        INSERT INTO public.invite_impressions (day, variant_key, impressions, clicks)
        VALUES (v_day, p_variant_key, 0, 1)
        ON CONFLICT (day, variant_key) 
        DO UPDATE SET clicks = invite_impressions.clicks + 1;
    END IF;
END;
$$;

-- Grant execute to anyone (the Edge API will call it, but just in case anon needs it, though we will route via API)
GRANT EXECUTE ON FUNCTION increment_invite_stat TO anon;
GRANT EXECUTE ON FUNCTION increment_invite_stat TO authenticated;
GRANT EXECUTE ON FUNCTION increment_invite_stat TO service_role;

-- Seed initial texts
INSERT INTO public.invite_variants (key, title, message)
VALUES 
    ('A', 'Seja um Parceiro', 'O VR no Ponto precisa de ajuda. Se sua loja tem vista para a rua, ceda um espacinho pro nosso QR Code e ajude os trabalhadores a voltarem mais cedo pra casa!'),
    ('B', 'Movimente sua calçada', 'Aumente o fluxo da sua loja sem gastar nada. Ceda um espaço pro QR Code do VR no Ponto na sua calçada e os passageiros virarão seus clientes enquanto esperam o ônibus.');
