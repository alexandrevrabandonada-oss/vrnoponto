-- Inserindo o bucket "official" na tabela de buckets do Storage do Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('official', 'official', true)
ON CONFLICT (id) DO NOTHING;

-- Deixar a policy de RLS permitindo que qualquer um leia os PDFs (public = true acima já resolve em partes, mas é bom garantir RLS)
CREATE POLICY "Leitura de PDFs oficiais" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'official');

-- Para INSERT/UPDATE/DELETE, apenas o role Service Role (nosso backend next.js protegido) poderá fazer alterações.
-- Como o Storage by default bloqueia operações sem policy (e service_role by-passa RLS), não precisamos 
-- criar uma policy de INSERT, a menos que quiséssemos permitir uploads direto do frontend (o que não faremos).

-- Alterar a tabela official_schedules para suportar os uploads granulares
-- A tabela atual tem departure_time e day_type. Como o MVP é upload de PDF "tabela inteira", 
-- vamos adaptar: tornar departure_time e day_type nulos, e adicionar pdf_url e valid_from.
ALTER TABLE public.official_schedules
ALTER COLUMN departure_time DROP NOT NULL,
ALTER COLUMN day_type DROP NOT NULL,
ADD COLUMN pdf_path TEXT,
ADD COLUMN valid_from DATE;

-- Adicionar um título ou nome para exibição na UI
ALTER TABLE public.official_schedules
ADD COLUMN title VARCHAR DEFAULT 'Tabela de Horários Oficial';
