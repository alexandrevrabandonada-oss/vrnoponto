-- Migration 0013: Distance Helper RPC
-- Permite calcular a distância em metros entre um ponto de ônibus e o usuário

CREATE OR REPLACE FUNCTION public.get_distance_meters(
    stop_id UUID,
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION
) 
RETURNS DOUBLE PRECISION AS $$
DECLARE
    stop_loc GEOGRAPHY;
    dist_m DOUBLE PRECISION;
BEGIN
    SELECT location INTO stop_loc FROM public.stops WHERE id = stop_id;
    
    IF stop_loc IS NULL THEN
        RETURN -1;
    END IF;

    -- ST_Distance para geography retorna metros em 4326
    dist_m := ST_Distance(stop_loc, ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography);
    
    RETURN dist_m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
