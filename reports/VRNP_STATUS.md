# VRNP STATUS REPORT
Gerado em: 2026-02-22T00:59:13.637Z

## Ambiente
- Node Version: v22.19.0 [WARNING: local node != engines node 20.x]
- Git Branch: main
- Git Commit: 75b2ce6
- .env.local: OK
- Supabase Env Vars: OK
- /api/health Local: SKIPPED (server not running)
- ESLint Version: v9.39.3

## Últimos 5 Commits
* 75b2ce6 - feat: neighborhoods dashboard + cards
* 56492b8 - feat: promised vs real by stop + neighborhood rankings + weekly card
* 77b5951 - feat: promised vs real by line (official PDF parse + hourly gap)
* 414d9e6 - feat: trust mix badge across map, stop, line, reports
* de4df0e - feat: system status dashboard in admin

## Rotas Dinâmicas (app/page.tsx)
- /.
- /admin
- /admin/linhas
- /admin/oficial
- /admin/parceiros
- /admin/pontos
- /admin/status
- /bairro/[slug]
- /bairros
- /boletim
- /como-usar
- /linha/[id]
- /mapa
- /mapa/bairros
- /no-ponto
- /painel
- /parceiro/[id]
- /parceiros
- /parceiros/entrar
- /ponto/[id]
- /qr/[token]
- /registrar
- /relatorio/mensal

## Rotas de Backend (app/api/)
- /api/admin/funnel/csv
- /api/admin/oficial/parse
- /api/admin/qr/generate
- /api/admin/run-alerts
- /api/admin/sync-official
- /api/admin/system-status
- /api/admin/upload-pdf
- /api/alerts
- /api/bulletin
- /api/dashboard/worst-neighborhoods
- /api/dashboard/worst-stops
- /api/env-audit
- /api/events/record
- /api/health
- /api/line/detail
- /api/line/promised-vs-real
- /api/map/neighborhoods
- /api/map/stops
- /api/neighborhood/detail
- /api/neighborhoods
- /api/partner-request
- /api/point/detail
- /api/qr/validate
- /api/report/monthly
- /api/report/monthly.csv
- /api/stop/promised-vs-real
- /api/stops/nearest
- /api/telemetry
- /api/timeseries/line
- /api/timeseries/stop
## Componentes Compartilhados (components/)
- RatingModal.tsx

## Hooks (hooks/)
- useDeviceId.ts

## Supabase Migrations
- 0001_init.sql
- 0002_seed.sql
- 0003_trust_levels.sql
- 0004_analytics_views.sql
- 0005_storage_buckets.sql
- 0006_nearest_stops.sql
- 0007_official_sync.sql
- 0008_monthly_report_views.sql
- 0009_map_views.sql
- 0010_fix_map_view.sql
- 0011_point_detail_views.sql
- 0012_qr_l3.sql
- 0013_distance_rpc.sql
- 0014_trust_methods.sql
- 0015_partners.sql
- 0016_token_plain.sql
- 0017_timeseries_weekly.sql
- 0018_alerts.sql
- 0019_partner_requests.sql
- 0020_telemetry_counts.sql
- 0021_partner_funnel_views.sql
- 0022_system_runs.sql
- 0023_trust_aggregates.sql
- 0024_official_schedule_parsing.sql
- 0025_real_hourly_views.sql
- 0026_promised_vs_real.sql
- 0027_stopline_real_hourly.sql
- 0028_stop_promised_vs_real.sql
- 0029_rankings_stop_neighborhood.sql
- 0030_neighborhood_detail_views.sql
- 0031_neighborhood_map_views.sql

## Supabase Remote (Status)
- SUPABASE_PROJECT_REF: MISSING
- SUPABASE_ACCESS_TOKEN: MISSING
*(Run `npm run supabase:check` to validate the token against the Supabase CLI)*

## Scripts
- npm run lint: SUCCESS
- npm run build: SUCCESS





## OPS (Windows Automation Workspace)
As rotinas DevOps foram automatizadas para uso sem "touching" manual via PowerShell:
- `npm run ops:env`: Prompt seguro das chaves `.env.local` ocultas do History.
- `npm run ops:supabase`: Valida Tokens remotos e engatilha Link + Push da pasta de migrations.
- `npm run ops:smoke`: Realiza o SpinUp do Next.js via background jobs (`Start-Process`), testa porta limite e pinga na API REST cURL para ter certeza do estado real do build finalizado.
- `npm run ops:go`: Comanda a união das forjas (Auth -> Verifica -> Sobe -> Diag).

## Fluxo de Teste Manual (MVP)
1. Abra a aplicação e acesse a rota `/no-ponto`.
2. Permita o uso da Geolocalização no navegador (Status do GPS deve atualizar).
3. Selecione "Ponto Central" e "P200" e clique em **"Cheguei no Ponto"**.
4. Acesse a rota `/registrar`.
5. Selecione simulando o ponto atual e clique em **"Ônibus Passou Agora"** ou **"Entrei (Embarquei)"**.
6. O modal de avaliação será aberto. Vote na lotação (de 1 a 5) e clique em **"Avaliar"**.
7. Verifique as tabelas `stop_events` e `bus_ratings` no projeto do Supabase vinculado para confirmar a inserção do `device_id` e dados.
