-- Migration 0009: Delay Map Views
-- Criação de views focadas em tempo real / janela móvel para exibição em mapas (Geolocalização)

-- 1. Visão de Espera de 30 Dias por Ponto com Coordenadas PostGIS
CREATE OR REPLACE VIEW public.vw_stop_wait_30d AS
WITH recent_waits AS (
    SELECT 
        e.stop_id,
        -- Diferença entre chegada e boarding/passed do MESMO user no MESMO Ponto.
        e.occurred_at AS arrived_at,
        LEAD(e.occurred_at) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_at,
        LEAD(e.event_type) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_event
    FROM public.stop_events e
    WHERE e.event_type IN ('arrived', 'boarding', 'passed_by')
      AND e.occurred_at >= NOW() - INTERVAL '30 days' -- Janela móvel dinâmica dos últimos 30 dias
)
SELECT 
    rw.stop_id,
    s.name AS stop_name,
    -- Extração de Lat/Lng do PostGIS GEOGRAPHY(POINT) para uso fácil em APIs JSON
    ST_X(s.location::geometry) AS lng,
    ST_Y(s.location::geometry) AS lat,
    
    COUNT(rw.stop_id) as samples,
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rw.concluded_at - rw.arrived_at))/60))::numeric, 1) AS p50_wait_min,
    ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rw.concluded_at - rw.arrived_at))/60))::numeric, 1) AS p90_wait_min
FROM recent_waits rw
JOIN public.stops s ON rw.stop_id = s.id
WHERE rw.concluded_event IN ('boarding', 'passed_by')
  AND EXTRACT(EPOCH FROM (rw.concluded_at - rw.arrived_at))/60 BETWEEN 0 AND 180
GROUP BY rw.stop_id, s.name, s.location
HAVING COUNT(rw.stop_id) >= 3; -- Mínimo de 3 amostras nos últimos 30 dias
