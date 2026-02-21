# VRNP STATUS REPORT
Gerado em: 2026-02-21T15:34:08.052Z

## Ambiente
- Node Version: v22.19.0
- Git Branch: master
- Git Commit: 0b2a9aa
- .env.local: MISSING
- Supabase Env Vars: MISSING

## Rotas Detectadas (app/)
- /
- /admin
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

## Scripts
- npm run lint: SUCCESS
- npm run build: SUCCESS

### Resumo Lint
```text
> vrnoponto@0.1.0 lint
> eslint
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
  Generating static pages using 11 workers (0/9) ...
  Generating static pages using 11 workers (2/9) 
  Generating static pages using 11 workers (4/9) 
  Generating static pages using 11 workers (6/9) 
✓ Generating static pages using 11 workers (9/9) in 312.2ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ○ /admin
├ ƒ /api/health
├ ƒ /linha/[id]
├ ○ /no-ponto
├ ○ /painel
├ ƒ /ponto/[id]
└ ○ /registrar


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
