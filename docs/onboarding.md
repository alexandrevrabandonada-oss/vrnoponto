# Onboarding Popular "Registra em 10 Segundos"

Guia para novos usuários do VR no Ponto, explicando o fluxo de participação em 3 passos simples.

## Rota Principal

| Rota | Descrição |
|---|---|
| `/como-usar` | Guia de 3 passos + CTAs + bloco militante |

## Os 3 Passos

1. **Cheguei no ponto** — Abre `/no-ponto`, GPS captura automaticamente o ponto mais próximo (~5s)
2. **Ônibus passou / Entrei** — 1 toque em "Ônibus Passou" ou "Entrei" em `/registrar`
3. **Desci + avalia (opcional)** — Marca "Desci" ao chegar no destino → gera Prova de Trajeto (L3)

## CTA na Home

A página `/` agora tem um card grande "Tá no ponto? Registra em 10s" com:
- Botão → `/no-ponto`
- Link "Como funciona?" → `/como-usar`

## Micro-Help (Modal de Ajuda)

Componente `HelpModal` em `components/HelpModal.tsx`:
- Aparece automaticamente na **primeira visita** à página
- Botão `?` flutuante para reabrir manualmente
- Salva "não mostrar de novo" em `localStorage`
- Fecha com ESC ou click fora

Integrado em:
- `/no-ponto` — dicas sobre GPS e seleção de ponto
- `/registrar` — dicas sobre L1/L2/L3

## Telemetria (Zero PII)

Tabela `telemetry_counts` armazena apenas contadores por evento e data:

```
event_key | date       | count
cta_click | 2026-02-21 | 42
```

- Sem IP, sem user-agent, sem dados pessoais
- API: `POST /api/telemetry` body `{event: "cta_click"}`
- Eventos permitidos: `cta_click`, `pageview_como_usar`, `pageview_no_ponto`, `pageview_registrar`

Card no admin `/admin` mostra **cliques hoje** e **cliques nos últimos 7 dias**.

## Notas de Ativação

> ⚠️ Aplicar a migration `0020_telemetry_counts.sql` no Supabase antes de usar em produção.
