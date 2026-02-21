-- Migration 0023: Agregações de Confiança (Trust Mix)
-- Fornece visões consolidadas sobre a qualidade e tamanho da amostra (n) de eventos 
-- de ônibus ('passed_by' e 'boarding') nos últimos 30 dias.

-- 1. Trust Mix por Ponto (Stop)
CREATE OR REPLACE VIEW public.vw_trust_mix_stop_30d AS
SELECT 
    stop_id,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE trust_level = 'L1') as l1_events,
    COUNT(*) FILTER (WHERE trust_level = 'L2') as l2_events,
    COUNT(*) FILTER (WHERE trust_level = 'L3') as l3_events,
    ROUND(
        (COUNT(*) FILTER (WHERE trust_level IN ('L2', 'L3'))::numeric / NULLIF(COUNT(*), 0)) * 100, 
        0
    ) as pct_verified
FROM public.stop_events
WHERE 
    occurred_at >= NOW() - INTERVAL '30 days'
    AND event_type IN ('passed_by', 'boarding')
GROUP BY stop_id;

-- 2. Trust Mix por Linha (Line)
CREATE OR REPLACE VIEW public.vw_trust_mix_line_30d AS
SELECT 
    line_id,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE trust_level = 'L1') as l1_events,
    COUNT(*) FILTER (WHERE trust_level = 'L2') as l2_events,
    COUNT(*) FILTER (WHERE trust_level = 'L3') as l3_events,
    ROUND(
        (COUNT(*) FILTER (WHERE trust_level IN ('L2', 'L3'))::numeric / NULLIF(COUNT(*), 0)) * 100, 
        0
    ) as pct_verified
FROM public.stop_events
WHERE 
    occurred_at >= NOW() - INTERVAL '30 days'
    AND event_type IN ('passed_by', 'boarding')
GROUP BY line_id;

-- 3. Trust Mix Global da Cidade (City)
CREATE OR REPLACE VIEW public.vw_trust_mix_city_30d AS
SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE trust_level = 'L1') as l1_events,
    COUNT(*) FILTER (WHERE trust_level = 'L2') as l2_events,
    COUNT(*) FILTER (WHERE trust_level = 'L3') as l3_events,
    ROUND(
        (COUNT(*) FILTER (WHERE trust_level IN ('L2', 'L3'))::numeric / NULLIF(COUNT(*), 0)) * 100, 
        0
    ) as pct_verified
FROM public.stop_events
WHERE 
    occurred_at >= NOW() - INTERVAL '30 days'
    AND event_type IN ('passed_by', 'boarding');

-- Grant permissions
GRANT SELECT ON public.vw_trust_mix_stop_30d TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_trust_mix_line_30d TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_trust_mix_city_30d TO anon, authenticated, service_role;
