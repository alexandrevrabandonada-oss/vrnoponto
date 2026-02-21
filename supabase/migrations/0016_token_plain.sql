-- Migration 0016: Armazenar token plano para kit do parceiro
-- Facilita a geração do kit sem invalidar QRs existentes.

ALTER TABLE public.qr_checkins ADD COLUMN IF NOT EXISTS token_plain TEXT;

COMMENT ON COLUMN public.qr_checkins.token_plain IS 'Token em texto plano para facilitar a exibição em kits e áreas logadas (visto que o QR já é público por natureza)';
