-- Migration 0026: Promised vs Real 30-day Comparison View
-- Combines the parsed active Official Schedules (Prometido) with the Crowdsourced Data (Real)

CREATE OR REPLACE VIEW public.vw_line_promised_vs_real_30d AS
WITH active_schedules AS (
    -- Pegamos apenas o ultimo documento de HORARIO válido pra cada linha
    SELECT DISTINCT ON (line_id)
        id as schedule_id,
        line_id
    FROM public.official_schedules
    WHERE doc_type = 'HORARIO'
      AND (valid_from <= CURRENT_DATE OR valid_from IS NULL)
    ORDER BY line_id, valid_from DESC NULLS LAST, created_at DESC
),
promised_data AS (
    SELECT 
        a.line_id,
        o.day_group,
        o.hour,
        o.trips as promised_trips,
        COALESCE(o.override_promised_headway_min, o.promised_headway_min) as promised_headway_min
    FROM public.official_schedule_hourly o
    JOIN active_schedules a ON a.schedule_id = o.schedule_id
)
SELECT 
    l.id as line_id,
    p.day_group,
    p.hour,
    
    -- O Prometido
    p.promised_trips,
    p.promised_headway_min,
    
    -- O Real
    r.real_p50_headway_min,
    r.real_p90_headway_min,
    COALESCE(r.samples, 0) as samples,
    
    -- O Gap (Delta)
    (r.real_p50_headway_min - p.promised_headway_min) as delta_min,
    
    -- Retorna o percentual de atraso caso o prometido exista e seja > 0
    CASE 
        WHEN p.promised_headway_min > 0 AND r.real_p50_headway_min IS NOT NULL THEN
            ((r.real_p50_headway_min - p.promised_headway_min) / p.promised_headway_min) * 100.0
        ELSE NULL
    END as delta_pct,
    
    -- Confiabilidade da amostra
    COALESCE(t.pct_verified, 0) as pct_verified
    
FROM promised_data p
JOIN public.lines l ON l.id = p.line_id
LEFT JOIN public.vw_line_headway_hourly_30d r 
  ON r.line_id = p.line_id AND r.day_group = p.day_group AND r.hour = p.hour
LEFT JOIN public.vw_trust_mix_line_30d t
  ON t.line_id = p.line_id;
