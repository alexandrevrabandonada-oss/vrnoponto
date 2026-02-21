# VRNP STATUS REPORT
Gerado em: 2026-02-21T19:54:50.849Z

## Ambiente
- Node Version: v22.19.0 [WARNING: local node != engines node 20.x]
- Git Branch: main
- Git Commit: 515188f
- .env.local: OK
- Supabase Env Vars: OK
- /api/health Local: SKIPPED (server not running)
- ESLint Version: v9.39.3

## Últimos 5 Commits
* 515188f - feat: L3 without public QR (collective + trip proof)
* 7ff379b - feat: point detail page + og share
* fd78df3 - chore: harden diag + supabase check + lint reliability
* 6f46dd1 - feat: mapa do atraso
* ce6746f - feat: monthly public report + export

## Rotas Dinâmicas (app/page.tsx)
- /.
- /admin
- /admin/linhas
- /admin/oficial
- /admin/parceiros
- /admin/pontos
- /linha/[id]
- /mapa
- /no-ponto
- /painel
- /parceiro/[id]
- /parceiros
- /ponto/[id]
- /qr/[token]
- /registrar
- /relatorio/mensal

## Rotas de Backend (app/api/)
- /api/admin/partner/kit/poster
- /api/admin/partner/kit/seal
- /api/admin/qr/generate
- /api/admin/sync-official
- /api/admin/upload-pdf
- /api/env-audit
- /api/events/record
- /api/health
- /api/map/stops
- /api/partner/detail
- /api/point/detail
- /api/qr/validate
- /api/report/monthly
- /api/report/monthly.csv
- /api/stops/nearest

## Componentes Compartilhados (components/)
- RatingModal.tsx
- admin/PartnerKitModal.tsx

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

## Supabase Remote (Status)
- SUPABASE_PROJECT_REF: OK
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
