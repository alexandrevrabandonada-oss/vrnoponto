# Metrics & Alerts System

Este documento descreve o funcionamento do sistema de métricas semanais e alertas automatizados do VR no Ponto.

## Tabelas e Views

### `alerts`
Armazena alertas gerados automaticamente.
- `alert_type`: `STOP_WAIT` ou `LINE_HEADWAY`.
- `target_id`: ID do ponto ou da linha.
- `delta_pct`: Percentual de piora vs semana anterior.
- `severity`: `INFO`, `WARN` (>=30% delta), `CRIT` (>=60% delta).

### `vw_stop_wait_weekly`
Agrega tempos de espera por semana. Utilizada para a "Linha do Tempo" e geração de alertas.

### `vw_line_headway_weekly`
Agrega intervalos (headway) reais por semana. Utilizada para medir a confiabilidade da linha.

### `vw_trust_mix_*_30d` (`stop`, `line`, `city`)
Novas views (introduzidas na migration 0023) que calculam o "Selo de Confiabilidade" das amostras em uma janela móvel de 30 dias.
Utilizam a coluna `trust_level` para definir a qualidade do crowdsourcing:
- **L1**: Relato único, não verificado.
- **L2**: Relatos múltiplos cruzados geograficamente.
- **L3**: Dados oficiais (Motoristas ou Ônibus via GPS).
A métrica principal calculada nestas views é `pct_verified` = ((L2 + L3) / Total) * 100.

### `vw_line_promised_vs_real_30d`
Cruza o horário planejado (cadastrado em `official_schedule_hourly` através de importação de PDF) com a vida real (`vw_line_headway_hourly_30d`). Utilizada nativamente na `/linha/[id]` para expor Gaps Reais e gerar o Kit Editorial. Calcula:
- `delta_min`: Atraso mediano em minutos contra a tabela oficial.
- `delta_pct`: Porcentagem de estouro do Headway estipulado na permissão.

### `vw_stopline_headway_hourly_30d` (migration 0027)
Agrega headways reais por **ponto + linha + hora + tipo de dia** nos últimos 30 dias.
- Considera apenas eventos `passed_by` e `boarding`.
- Calcula `real_p50_headway_min`, `real_p90_headway_min`, `samples` e `pct_verified`.
- Exige no mínimo 3 amostras por célula.

### `vw_stopline_promised_vs_real_30d` (migration 0028)
Join entre `official_schedule_hourly` (prometido) e `vw_stopline_headway_hourly_30d` (real) por ponto.
- `delta_min = real_p50 - promised`, `delta_pct = (delta/promised)*100`.
- Marca `meta = 'NO_PROMISE'` quando não existe schedule parseado.

### `vw_worst_stops_30d` (migration 0029)
Ranking dos 50 piores pontos por `worst_delta_min` (max atraso prometido vs real).
- Inclui `stop_name`, `neighborhood`, `avg_delta_min`, `pct_verified_avg`.

### `vw_worst_neighborhoods_30d` (migration 0029)
Ranking dos piores bairros por `avg_delta_min`, agregando a média dos pontos do bairro.

### `vw_neighborhood_detail_30d` (migration 0030)
Sumário agregado por bairro: `avg_delta_min`, `stops_count`, `samples_total`, `pct_verified_avg` (ponderado).

### `vw_neighborhood_top_stops_30d` (migration 0030)
Top 20 piores pontos por bairro, ranqueados por `worst_delta_min`. Inclui `pct_verified_avg`.

### `vw_neighborhood_top_lines_30d` (migration 0030)
Top 10 piores linhas por bairro, ranqueadas por `avg_delta_min`. Enriquecido com `line_code`/`line_name` via API.

## Automação

O job de alertas é executado diariamente via GitHub Actions (`run-alerts.yml`), acionando o endpoint protegido:
`POST /api/admin/run-alerts?t={ADMIN_TOKEN}`

## Visualização

- **Sparklines**: Gráficos SVG leves integrados nas páginas de detalhes.
- **Alertas no Mapa**: Pontos com alertas ativos nos últimos 30 dias ganham uma borda de destaque no mapa.
- **Painel**: Resumo global de degradações recentes.
