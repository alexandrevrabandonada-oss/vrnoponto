-- Função RPC para buscar pontos mais próximos
-- Retorna os 'lim' pontos (limite) ativos mais próximos da coordenada dada
CREATE OR REPLACE FUNCTION public.rpc_nearest_stops(
    lat double precision,
    lng double precision,
    lim int DEFAULT 3
)
RETURNS TABLE (
    id uuid,
    name varchar,
    distance_m int
)
LANGUAGE sql
SECURITY DEFINER -- Permite ler stops mesmo que o RLS estivesse mais restrito, ideal p/ API publica
AS $$
    SELECT 
        s.id,
        s.name,
        -- Converter a distância retornada (em metros devido ao tipo geography) para inteiro
        ROUND(ST_Distance(s.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)))::int AS distance_m
    FROM 
        public.stops s
    WHERE 
        s.is_active = true
    ORDER BY 
        -- Ordena pela distância (PostGIS otimiza isso usando o índice espacial se existir GIST)
        s.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    LIMIT lim;
$$;
