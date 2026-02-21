-- Criar uma linha de teste
INSERT INTO public.lines (id, code, name, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'P200', 'Vila Rica / Centro', true)
ON CONFLICT (id) DO NOTHING;

-- Criar variantes para a linha
INSERT INTO public.line_variants (id, line_id, name, direction)
VALUES 
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Ida', 'inbound'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Volta', 'outbound')
ON CONFLICT (id) DO NOTHING;

-- Criar um ponto de teste
INSERT INTO public.stops (id, code, name, location, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'PT-001', 'Ponto Central', ST_GeomFromText('POINT(-44.1041 -22.5230)', 4326), true)
ON CONFLICT (id) DO NOTHING;
