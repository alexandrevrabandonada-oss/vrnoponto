-- Migration 0007: Official Schedules Crawler Additions
-- Adiciona campos na tabela `official_schedules` para suportar o scraper automatizado de PDFs.

-- Extensão pgcrypto para UUID e funções HASH (neste caso o HASH vai ser gerado pelo JS/Node, mas pgcrypto é útil)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN source_url text;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    
    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN source_hash text;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN doc_type text;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN operator text;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN line_code text;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN fetched_at timestamptz DEFAULT now();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.official_schedules ADD COLUMN meta jsonb DEFAULT '{}'::jsonb;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Drop constraints/indexes silently se for rodado multiplas vezes no Supabase diffs manuais
DROP INDEX IF EXISTS idx_official_schedules_source_url;
DROP INDEX IF EXISTS idx_official_schedules_doc_type_code;
DROP INDEX IF EXISTS idx_official_schedules_fetched_at;

-- Adiciona a restrição 'UNIQUE' ao source_url caso não exista
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'uq_official_schedules_source_url'
    ) THEN
        ALTER TABLE public.official_schedules
        ADD CONSTRAINT uq_official_schedules_source_url UNIQUE (source_url);
    END IF;
END $$;

-- Cria os índices otimizados para as buscas
CREATE INDEX idx_official_schedules_source_url ON public.official_schedules(source_url);
CREATE INDEX idx_official_schedules_doc_type_code ON public.official_schedules(line_code, doc_type);
CREATE INDEX idx_official_schedules_fetched_at ON public.official_schedules(fetched_at DESC);
