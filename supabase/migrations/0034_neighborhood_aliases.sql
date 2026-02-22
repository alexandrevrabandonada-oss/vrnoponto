-- Migration 0034: Neighborhood aliases/synonyms table
-- Maps alias_norm (normalized) → canonical_norm (normalized canonical name)

CREATE TABLE IF NOT EXISTS public.neighborhood_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_norm text NOT NULL UNIQUE,
    canonical_norm text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_aliases_alias ON public.neighborhood_aliases (alias_norm);
CREATE INDEX IF NOT EXISTS idx_neighborhood_aliases_canonical ON public.neighborhood_aliases (canonical_norm);

-- Seed some common aliases for Volta Redonda
INSERT INTO public.neighborhood_aliases (alias_norm, canonical_norm) VALUES
    ('VSC', 'VILA SANTA CECILIA'),
    ('CENTRO', 'CENTRO'),
    ('VILA', 'VILA SANTA CECILIA'),
    ('RETIRO', 'RETIRO'),
    ('ATERRADO', 'ATERRADO'),
    ('NITEROI', 'NITEROI'),
    ('AERO CLUBE', 'AEROCLUBE'),
    ('AERO CLUB', 'AEROCLUBE'),
    ('VOLTA GRANDE IV', 'VOLTA GRANDE 4'),
    ('VOLTA GRANDE 04', 'VOLTA GRANDE 4'),
    ('SAO GERALDO', 'SAO GERALDO'),
    ('JD AMALIA', 'JARDIM AMALIA'),
    ('JARDIM AMALIA II', 'JARDIM AMALIA 2'),
    ('JD AMALIA II', 'JARDIM AMALIA 2')
ON CONFLICT (alias_norm) DO NOTHING;

-- Function to resolve alias → canonical
CREATE OR REPLACE FUNCTION public.apply_neighborhood_alias(norm text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (SELECT canonical_norm FROM public.neighborhood_aliases WHERE alias_norm = norm LIMIT 1),
        norm
    );
$$;
