-- Migration 0008: Monthly Report Views
-- Criação de views analíticas para o Relatório Público Mensal de Transporte

-- 1. Visão Mensal de Espera por Ponto
CREATE OR REPLACE VIEW public.vw_monthly_stop_wait AS
WITH monthly_waits AS (
    SELECT 
        e.stop_id,
        date_trunc('month', e.occurred_at) AS report_month,
        -- Pareamento simplificado baseado em logs próximos da mesma device
        -- (Num cenario real cruzariamos arrivals com boardings do mesmo device, 
        --  mas pra view usaremos a métrica consolidada se houvesse,
        --  ou uma variação da lógica da view original `vw_wait_time_metrics`).
        -- Para MVP de dados abertos onde `stop_events` é esparso:
        -- Assumiremos "eventos isolados" ou "espera" calculada.
        -- Como a vw_wait_time_metrics não tem 'month', vamos refazer a lógica basilar aqui por mês.
        
        -- Lógica de Wait: Diferença entre o evento de Arrival e o próximo Boarding/Passed do MESMO user no MESMO Ponto.
        e.occurred_at AS arrived_at,
        LEAD(e.occurred_at) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_at,
        LEAD(e.event_type) OVER (PARTITION BY e.device_id, e.stop_id ORDER BY e.occurred_at) as concluded_event
    FROM public.stop_events e
    WHERE e.event_type IN ('arrived', 'boarding', 'passed_by')
)
SELECT 
    stop_id,
    report_month,
    COUNT(stop_id) as total_samples,
    -- P50 (Mediana)
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60))::numeric, 1) AS p50_wait_min,
    -- P90
    ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60))::numeric, 1) AS p90_wait_min
FROM monthly_waits
WHERE concluded_event IN ('boarding', 'passed_by')
  AND EXTRACT(EPOCH FROM (concluded_at - arrived_at))/60 BETWEEN 0 AND 180 -- Filtro de outliers (espera até 3h)
GROUP BY stop_id, report_month;


-- 2. Visão Mensal de Confiabilidade de Linha (Headway)
CREATE OR REPLACE VIEW public.vw_monthly_line_reliability AS
WITH bus_arrivals AS (
    SELECT 
        line_id,
        stop_id,
        date_trunc('month', occurred_at) AS report_month,
        occurred_at
    FROM public.stop_events
    WHERE event_type IN ('boarding', 'passed_by') 
      AND line_id IS NOT NULL
),
headway_deltas AS (
    SELECT 
        line_id,
        report_month,
        -- Tempo desde a última passagem do MESMO onibus no MESMO ponto
        EXTRACT(EPOCH FROM (occurred_at - LAG(occurred_at) OVER (PARTITION BY line_id, stop_id ORDER BY occurred_at)))/60 AS headway_min
    FROM bus_arrivals
)
SELECT 
    line_id,
    report_month,
    COUNT(line_id) as total_samples,
    ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY headway_min))::numeric, 1) AS p50_headway_min,
    ROUND((percentile_cont(0.9) WITHIN GROUP (ORDER BY headway_min))::numeric, 1) AS p90_headway_min
FROM headway_deltas
WHERE headway_min BETWEEN 2 AND 180 -- Gaps menos de 2min são provavelmente o mesmo bus ou comboio. Mais de 3h = outlier
GROUP BY line_id, report_month;


-- 3. Visão Resumo Top 10 Mensal (Pontos e Linhas)
-- Como o PostgreSQL não suporta exportar JSON nativamente e dinâmico de múltiplas tabelas tão fácil numa View simples sem perder semântica
-- Faremos DUAS views resumos de ranking com window functions (lag) para delta.

-- 3.a Top Pontos Mensal
CREATE OR REPLACE VIEW public.vw_monthly_summary_stops AS
WITH ranked_stops AS (
    SELECT 
        rm.report_month,
        rm.stop_id,
        s.name as stop_name,
        rm.p50_wait_min,
        rm.p90_wait_min,
        rm.total_samples,
        LAG(rm.p50_wait_min) OVER (PARTITION BY rm.stop_id ORDER BY rm.report_month) as prev_month_p50
    FROM public.vw_monthly_stop_wait rm
    JOIN public.stops s ON rm.stop_id = s.id
    WHERE rm.total_samples >= 3 -- Exigir um mínimo de 3 amostras no mês para o ponto entrar no relatório
)
SELECT 
    report_month,
    stop_id,
    stop_name,
    p50_wait_min,
    p90_wait_min,
    total_samples,
    CASE 
        WHEN prev_month_p50 > 0 THEN ROUND(((p50_wait_min - prev_month_p50) / prev_month_p50 * 100), 1)
        ELSE NULL 
    END as delta_p50_percent
FROM ranked_stops;

-- 3.b Top Linhas Mensal
CREATE OR REPLACE VIEW public.vw_monthly_summary_lines AS
WITH ranked_lines AS (
    SELECT 
        rl.report_month,
        rl.line_id,
        l.code as line_code,
        l.name as line_name,
        -- Supondo que tem official_schedules com operadora, o MVP colocou no official_schedules
        -- No nosso caso, para simplificar vamos listar só code e name base.
        rl.p50_headway_min,
        rl.p90_headway_min,
        rl.total_samples,
        LAG(rl.p50_headway_min) OVER (PARTITION BY rl.line_id ORDER BY rl.report_month) as prev_month_p50
    FROM public.vw_monthly_line_reliability rl
    JOIN public.lines l ON rl.line_id = l.id
    WHERE rl.total_samples >= 3
)
SELECT 
    report_month,
    line_id,
    line_code,
    line_name,
    p50_headway_min,
    p90_headway_min,
    total_samples,
    CASE 
        WHEN prev_month_p50 > 0 THEN ROUND(((p50_headway_min - prev_month_p50) / prev_month_p50 * 100), 1)
        ELSE NULL 
    END as delta_p50_percent
FROM ranked_lines;
