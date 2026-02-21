# VRNP STATUS REPORT
Gerado em: 2026-02-21T16:10:33.493Z

## Ambiente
- Node Version: v22.19.0
- Git Branch: master
- Git Commit: 3048392
- .env.local: MISSING
- Supabase Env Vars: MISSING
- /api/health Local: FAIL

## Últimos 5 Commits
* 3048392 - chore: supabase remote automations
* d8ebf38 - feat: admin mvp + official pdf upload
* cf92455 - chore: production pipeline + feedback pack
* cecf539 - feat: implement analytics dashboard
* 46b3d5c - feat: implement trust levels and rate limiting

## Rotas Detectadas (app/)
- /
- /admin
- /admin/linhas
- /admin/oficial
- /admin/pontos
- /linha/[id]
- /no-ponto
- /painel
- /ponto/[id]
- /registrar

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

## Supabase Remote (Status)
- SUPABASE_PROJECT_REF: MISSING
- SUPABASE_ACCESS_TOKEN: MISSING
*(Run `npm run supabase:check` to validate the token against the Supabase CLI)*

## Scripts
- npm run lint: SUCCESS
- npm run build: SUCCESS

### Resumo Lint
```text
> vrnoponto@0.1.0 lint
> eslint


C:\Projetos\vrnoponto\app\linha\[id]\page.tsx
  2:8  warning  'Link' is defined but never used  @typescript-eslint/no-unused-vars

C:\Projetos\vrnoponto\app\no-ponto\page.tsx
  4:10  warning  'createClient' is defined but never used           @typescript-eslint/no-unused-vars
  9:7   warning  'MOCK_STOP_ID' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Projetos\vrnoponto\scripts\diag.mjs
  101:10  warning  'e' is defined but never used  @typescript-eslint/no-unused-vars

C:\Projetos\vrnoponto\scripts\supabase-check.mjs
  44:14  warning  'err' is defined but never used  @typescript-eslint/no-unused-vars

✖ 5 problems (0 errors, 5 warnings)
```

### Resumo Build
```text
> vrnoponto@0.1.0 build
> next build

▲ Next.js 16.1.6 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 2.2s
  Running TypeScript ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/14) ...
  Generating static pages using 11 workers (3/14) 
  Generating static pages using 11 workers (6/14) 
  Generating static pages using 11 workers (10/14) 
✓ Generating static pages using 11 workers (14/14) in 235.6ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ○ /admin
├ ƒ /admin/linhas
├ ○ /admin/oficial
├ ƒ /admin/pontos
├ ƒ /api/admin/upload-pdf
├ ƒ /api/events/record
├ ƒ /api/health
├ ƒ /api/stops/nearest
├ ƒ /linha/[id]
├ ○ /no-ponto
├ ƒ /painel
├ ƒ /ponto/[id]
└ ○ /registrar


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Fluxo de Teste Manual (MVP)
1. Abra a aplicação e acesse a rota `/no-ponto`.
2. Permita o uso da Geolocalização no navegador (Status do GPS deve atualizar).
3. Selecione "Ponto Central" e "P200" e clique em **"Cheguei no Ponto"**.
4. Acesse a rota `/registrar`.
5. Selecione simulando o ponto atual e clique em **"Ônibus Passou Agora"** ou **"Entrei (Embarquei)"**.
6. O modal de avaliação será aberto. Vote na lotação (de 1 a 5) e clique em **"Avaliar"**.
7. Verifique as tabelas `stop_events` e `bus_ratings` no projeto do Supabase vinculado para confirmar a inserção do `device_id` e dados.
