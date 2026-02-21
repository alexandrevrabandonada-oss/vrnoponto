-- Criação das Views de Analytics (PostgreSQL)

-- Função utilitária para calcular a diferença em minutos entre ts
-- (Embora possamos usar EXTRACT(EPOCH) / 60 direto na query)

-- =========================================================================
-- VIEW 1: PAREAMENTO DE ESPERA DO USUÁRIO (Raw Wait Times)
-- Pareia um "arrived" com o próximo "boarding" ou "passed_by" do mesmo device na mesma linha/ponto
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_user_wait_pairs AS
WITH arrivals AS (
    SELECT id, stop_id, line_id, device_id, occurred_at AS arrival_time
    FROM public.stop_events
    WHERE event_type = 'arrived'
),
departures AS (
    SELECT id, stop_id, line_id, device_id, occurred_at AS departure_time
    FROM public.stop_events
    WHERE event_type IN ('boarding', 'passed_by', 'alighted')
),
matched AS (
    SELECT 
        a.stop_id, 
        a.line_id, 
        a.device_id,
        a.arrival_time,
        -- Pega a menor data de saída após a chegada
        MIN(d.departure_time) AS departure_time
    FROM arrivals a
    JOIN departures d 
      ON a.stop_id = d.stop_id 
     AND a.line_id = d.line_id 
     AND a.device_id = d.device_id
     AND d.departure_time > a.arrival_time
     AND d.departure_time <= a.arrival_time + INTERVAL '3 hours' -- Remove outliers óbvios
    GROUP BY a.stop_id, a.line_id, a.device_id, a.arrival_time
)
SELECT 
    stop_id, 
    line_id, 
    arrival_time, 
    departure_time,
    EXTRACT(EPOCH FROM (departure_time - arrival_time))/60.0 AS wait_time_minutes
FROM matched;

-- =========================================================================
-- VIEW 2: ESPERA MEDIANA POR LINHA/PONTO
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_wait_time_metrics AS
SELECT 
    line_id,
    stop_id,
    COUNT(*) AS sample_size,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY wait_time_minutes) AS median_wait_time
FROM public.vw_user_wait_pairs
GROUP BY line_id, stop_id;


-- =========================================================================
-- VIEW 3: HEADWAY (Intervalo entre Ônibus) PARSINGS
-- Pega eventos de 'passagem', remove duplicatas (muitos devices marcando ao msm tempo)
-- e cruza usando LAG para pegar a diferença temporal do onibus anterior
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_headway_intervals AS
WITH bus_sightings AS (
    -- Simplificação: Agrupar eventos de passagem num bloco de 5 mins para deduzir 1 unico "onibus" fisico
    SELECT 
        stop_id,
        line_id,
        date_trunc('minute', occurred_at) AS sight_period, -- Agrupa por minuto exato, ou poderíamos arredondar para 5
        MIN(occurred_at) as first_seen
    FROM public.stop_events
    WHERE event_type IN ('passed_by', 'boarding')
    GROUP BY stop_id, line_id, date_trunc('minute', occurred_at)
),
sequenced AS (
    SELECT 
        stop_id, 
        line_id,
        first_seen AS current_bus_time,
        LAG(first_seen) OVER (PARTITION BY stop_id, line_id ORDER BY first_seen) AS prev_bus_time
    FROM bus_sightings
)
SELECT 
    stop_id, 
    line_id,
    current_bus_time,
    prev_bus_time,
    EXTRACT(EPOCH FROM (current_bus_time - prev_bus_time))/60.0 AS headway_minutes
FROM sequenced
-- Filtro pragmático: um ônibus precisa ter passado há mais de 1 minuto para contar como "headway" e não o mesmo veiculo
WHERE prev_bus_time IS NOT NULL AND EXTRACT(EPOCH FROM (current_bus_time - prev_bus_time))/60.0 > 1.5;


-- =========================================================================
-- VIEW 4: HEADWAY MEDIANO POR LINHA
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_headway_metrics AS
SELECT 
    line_id,
    COUNT(*) AS sample_size,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY headway_minutes) AS median_headway
FROM public.vw_headway_intervals
GROUP BY line_id;


-- =========================================================================
-- VIEW 5: TOP PONTOS CRÍTICOS (Maior espera)
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_critical_stops AS
SELECT 
    w.stop_id,
    s.name as stop_name,
    COUNT(*) AS total_samples,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY w.wait_time_minutes) AS median_wait_time
FROM public.vw_user_wait_pairs w
JOIN public.stops s ON w.stop_id = s.id
GROUP BY w.stop_id, s.name
-- Requer pelo menos 1 amostra de espera (MVP, no futuro 10+) para n sujar ranking
HAVING COUNT(*) > 0
ORDER BY median_wait_time DESC;
