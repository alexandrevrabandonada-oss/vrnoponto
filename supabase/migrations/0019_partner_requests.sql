-- Migration 0019: Funil de Adesão de Pontos Parceiros
-- Tabela para registrar pedidos públicos de adesão

CREATE TABLE IF NOT EXISTS public.partner_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    contact_name    text,
    contact_phone   text,
    contact_instagram text,
    neighborhood    text,
    address         text,
    category        text,
    lat             numeric,
    lng             numeric,
    message         text,
    status          text NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    rejection_reason text,
    created_at      timestamptz DEFAULT now(),
    resolved_at     timestamptz,

    CONSTRAINT partner_requests_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Índice para listagem admin
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON public.partner_requests(status, created_at DESC);

-- RLS
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode submeter um pedido (anon OK)
CREATE POLICY "Allow public insert on partner_requests"
ON public.partner_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Somente service_role pode ler e gerenciar (admin usa service_role key)
CREATE POLICY "Allow service_role full access on partner_requests"
ON public.partner_requests FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
