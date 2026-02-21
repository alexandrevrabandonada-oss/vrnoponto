-- Migration 0025: Real Hourly Agregation Views
-- View that calculates the P50 headway per hour in the last 30 days based on the Crowdsourcing data

CREATE OR REPLACE VIEW public.vw_line_headway_hourly_30d AS
SELECT
    e.line_id,
    -- Converte o Date para Day Group (1-5 = WEEKDAY, 6 = SAT, 0 ou 7 = SUN)
    CASE 
        WHEN EXTRACT(ISODOW FROM e.occurred_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN 1 AND 5 THEN 'WEEKDAY'
        WHEN EXTRACT(ISODOW FROM e.occurred_at AT TIME ZONE 'America/Sao_Paulo') = 6 THEN 'SAT'
        ELSE 'SUN'
    END as day_group,
    CAST(EXTRACT(HOUR FROM e.occurred_at AT TIME ZONE 'America/Sao_Paulo') AS INT) as hour,
    -- Nós precisamos da mesma lógica de diff entre viagens pra extrair o headway
    -- Agrupamos eventos similares num buffer pra calcular a demora (aproximação baseada em stop events espalhados)
    -- Num MVP mais avançado as viagens são particionadas usando window functions sobre trip_signature originadas do `vw_stop_wait_30d`, 
    -- vamos extrair o headway_min calculando intervalos entre onibus no mesmo ponto.
    
    -- Utilizando a view P50 base, apenas adaptamos calculo simplificado aqui se baseando na demora de onibus 
    -- passarem em paradas sequenciais. Como o MVP de Paradas já está consolidado no vw_stop_wait, vamos calcular
    -- o P50 do headway diretamente do diff de eventos válidos em intervalos agrupados:
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (
        EXTRACT(EPOCH FROM e.occurred_at - lag.prev_time) / 60.0
    )) as real_p50_headway_min,
     PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (
        EXTRACT(EPOCH FROM e.occurred_at - lag.prev_time) / 60.0
    )) as real_p90_headway_min,
    COUNT(*) as samples
FROM (
    -- Subquery pra colar o tempo anterior do MESMO onibus/linha NO MESMO PONTO. O Headway verdadeiro é "tempo entre onibus" num ponto.
    SELECT 
        id, line_id, stop_id, ocorreu as occurred_at,
        LAG(ocorreu) OVER (PARTITION BY stop_id, line_id, date_trunc('day', ocorreu) ORDER BY ocorreu) as prev_time
    FROM (
        SELECT id, line_id, stop_id, occurred_at AT TIME ZONE 'America/Sao_Paulo' as ocorreu
        FROM public.stop_events
        WHERE event_type IN ('passed_by', 'boarding')
          AND occurred_at >= (now() - interval '30 days')
          AND line_id IS NOT NULL 
    ) clean_events
) e
JOIN LATERAL (
    SELECT e.prev_time as prev_time
) lag ON lag.prev_time IS NOT NULL AND EXTRACT(EPOCH FROM e.occurred_at - lag.prev_time)/60.0 BETWEEN 2 AND 180 -- Limita Headways absurdos (ex>3h ou micro<2m)
GROUP BY 
    1, 2, 3
HAVING COUNT(*) >= 3; -- Apenas horas com ao menos 3 samples confirmados
