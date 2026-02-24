-- Atualizar RPC para incluir neighborhood
CREATE OR REPLACE FUNCTION public.rpc_nearest_stops(
    lat double precision,
    lng double precision,
    lim int DEFAULT 3
)
RETURNS TABLE (
    id uuid,
    name varchar,
    neighborhood text,
    distance_m int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        s.id,
        s.name,
        s.neighborhood,
        ROUND(ST_Distance(s.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)))::int AS distance_m
    FROM 
        public.stops s
    WHERE 
        s.is_active = true
    ORDER BY 
        s.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    LIMIT lim;
$$;
