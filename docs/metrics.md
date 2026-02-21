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

## Automação

O job de alertas é executado diariamente via GitHub Actions (`run-alerts.yml`), acionando o endpoint protegido:
`POST /api/admin/run-alerts?t={ADMIN_TOKEN}`

## Visualização

- **Sparklines**: Gráficos SVG leves integrados nas páginas de detalhes.
- **Alertas no Mapa**: Pontos com alertas ativos nos últimos 30 dias ganham uma borda de destaque no mapa.
- **Painel**: Resumo global de degradações recentes.
