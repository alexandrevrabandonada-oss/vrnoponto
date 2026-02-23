-- Create mutiroes table
CREATE TABLE IF NOT EXISTS public.mutiroes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    goal INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.mutiroes ENABLE ROW LEVEL SECURITY;

-- Public can read active mutiroes
CREATE POLICY "Public can read active mutiroes" ON public.mutiroes
    FOR SELECT USING (is_active = true);

-- Admin can do everything (replace with your admin role/check)
CREATE POLICY "Admin can service mutiroes" ON public.mutiroes
    FOR ALL USING (true);

-- Ensure only one active mutirao at a time (optional but recommended)
CREATE OR REPLACE FUNCTION check_single_active_mutirao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active THEN
        UPDATE public.mutiroes SET is_active = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_mutirao
BEFORE INSERT OR UPDATE ON public.mutiroes
FOR EACH ROW EXECUTE FUNCTION check_single_active_mutirao();
