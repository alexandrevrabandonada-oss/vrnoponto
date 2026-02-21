# Métricas do Painel (Analytics)

Este documento descreve como as métricas do painel (`/painel`) são calculadas a partir da base de crowdsourcing de `stop_events`.

## 1. Espera Mediana (User Wait Time)
**Definição**: O tempo (em minutos) que um usuário esperou no ponto até o ônibus chegar ou passar.
**Lógica**: 
- Precisamos parear um evento de `arrived` (Cheguei no ponto) com um evento posterior do **mesmo** `device_id`, no **mesmo** `stop_id` e `line_id`, que seja de conclusão (`passed_by` ou `boarding`).
- Achamos a diferença de tempo (`occurred_at` conclusão - `occurred_at` chegada).
- Agrupamos por linha/ponto e calculamos a **mediana** dessa diferença estatística para remover outliers (ex: usuário que abriu o app, marcou "cheguei" e esqueceu de marcar "subiu"). Filtrar, por exemplo, tempos irracionais (> 180 mins).

## 2. Headway Mediano 
**Definição**: O intervalo de tempo (em minutos) entre a passagem de dois ônibus consecutivos da mesma linha no mesmo ponto.
**Lógica**:
- Filtrar todos os eventos que representam a presença de um ônibus no ponto (ex: `passed_by`, `boarding` de nível >= L2, ou agrupar eventos L1 próximos).
- Como temos um ambiente MVP com L1 forte, ordenamos todos os eventos de "conclusão de passagem" (`passed_by`, `boarding`) por `occurred_at`.
- Utiliza-se a *Window Function* `LAG()` do PostgreSQL para pegar a ocorrência anterior no mesmo `stop_id` e `line_id`.
- Calcula-se a diferença em minutos entre a passagem atual e a anterior.
- Agrupa-se por linha (e janela de tempo de 7/30 dias) tirando a mediana.
- Para evitar ruído, gaps extremadamentes curtos (< 2 mins) podem ser agrupados do mesmo "pelotão", e gaps absurdos (> 3h) ignorados como erro humano.

## 3. Pontos Mais Críticos
**Definição**: Os top 10 pontos de ônibus com as maiores medianas de tempo de espera (agregando todas as linhas neles).
**Lógica**:
- Usa a view base do cálculo de *User Wait Time*.
- Agrupa pelos pontos (`stop_id`).
- Calcula a mediana geral.
- Ordena `DESC` limitando aos 10 primeiros.

---
**Nota Técnica PostgreSQL**: O Supabase/PostgreSQL não tem uma função nativa `MEDIAN()`. Utiliza-se a função agregadora `percentile_cont(0.5) WITHIN GROUP (ORDER BY valor_numerico)`.

## 4. Relatório Público Mensal
**Definição**: Para transparência com os cidadãos e a prefeitura, as métricas em nível de Ponto e Linha são consolidadas em janelas mensais através de visões sumarizadas.
**Lógica (Views em `0008_monthly_report_views.sql`)**:
- `vw_monthly_stop_wait`: Agrupa instâncias de passagens/embarque num ponto dentro do mesmo mês. Fornece `p50` (mediana) e `p90` do tempo de espera, além do volume de amostras.
- `vw_monthly_line_reliability`: Agrupa intervalos entre viagens sequenciais (Headway) da mesma linha e ponto, tirando a mediana por mês.
- `vw_monthly_summary_stops` / `vw_monthly_summary_lines`: Adicionam cálculos de variação (Δ%) com o mês anterior utilizando a *Window Function* `LAG()` e ranqueiam o Top 10 negativo com filtragem sanitária (min > 3 amostras/mês).

### Mapa do Atraso (Tempo Geográfico)
- **Janela de 30 Dias**: Calculada pela view `vw_stop_wait_30d`. Diferente do relatório mensal fixo, esta view foca em uma janela móvel (rolling window) para garantir que o mapa reflita dados recentes, independentemente do dia do mês.
- **Geolocalização**: Coordenadas extraídas via PostGIS (`ST_X`, `ST_Y`) da tabela `stops`.
- **Amostra Mínima**: Mantida em 3 amostras para evitar distorções visuais no mapa por dados isolados.

