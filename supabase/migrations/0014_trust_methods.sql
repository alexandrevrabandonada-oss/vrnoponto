-- Migration 0014: Novos métodos de confiança L3
-- Coletivo, Trajeto e suporte a metadados

ALTER TABLE public.stop_events 
    ADD COLUMN IF NOT EXISTS trust_method TEXT DEFAULT 'L1',
    ADD COLUMN IF NOT EXISTS trust_note TEXT,
    ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Garantir valores válidos para trust_method
ALTER TABLE public.stop_events
    ADD CONSTRAINT check_trust_method 
    CHECK (trust_method IN ('L1', 'L2', 'QR', 'COLETIVO', 'TRAJETO', 'EVIDENCIA'));

-- Índices para otimizar as buscas de confiança e trajeto
CREATE INDEX IF NOT EXISTS idx_stop_events_collective_lookup 
    ON public.stop_events (stop_id, line_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_stop_events_device_trajectory 
    ON public.stop_events (device_id, occurred_at DESC);

-- Função para calcular distância entre dois pontos (paradas)
CREATE OR REPLACE FUNCTION public.get_stops_distance(stop_id_1 UUID, stop_id_2 UUID)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    loc1 GEOGRAPHY;
    loc2 GEOGRAPHY;
BEGIN
    SELECT location INTO loc1 FROM public.stops WHERE id = stop_id_1;
    SELECT location INTO loc2 FROM public.stops WHERE id = stop_id_2;
    
    IF loc1 IS NULL OR loc2 IS NULL THEN
        RETURN -1;
    END IF;

    RETURN ST_Distance(loc1, loc2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON COLUMN public.stop_events.trust_method IS 'Método pelo qual o nível de confiança foi atingido (L1, L2, QR, COLETIVO, TRAJETO, EVIDENCIA)';
COMMENT ON COLUMN public.stop_events.meta IS 'Metadados adicionais (distância, tempo de trajeto, IDs de dispositivos confirmadores, etc)';
