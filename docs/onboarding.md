# Onboarding Popular "Registra em 10 Segundos"

Guia para novos usuários do VR no Ponto, explicando o fluxo de participação em 3 passos simples.

## Rota Principal

| Rota | Descrição |
|---|---|
| `/como-usar` | Guia de 3 passos + CTAs + bloco militante |

## Os 3 Passos

1. **Cheguei no ponto** — Abre `/no-ponto`, GPS captura automaticamente o ponto mais próximo (~5s).
2. **Registro de 1 Toque** — Após marcar "Cheguei", o `OneTapCard` aparece automaticamente com a linha sugerida. 1 toque: "Ônibus Passou" ou "Entrei". *(Funciona offline)*. Alternativamente, `/registrar` tem o mesmo card autônomo.
3. **Desci + avalia (opcional)** — Marca "Desci" ao chegar no destino → gera Prova de Trajeto (L3).

## Fluxo Unificado: Cheguei → 1 Toque

```
/no-ponto → "Estou no Ponto" (arrived)
     ↓
  OneTapCard aparece com linha sugerida
     ↓
  "Ônibus Passou" (passed_by) OU "Entrei" (boarding)
     ↓
  Feedback: "Registrado ✓" ou "Salvo (vai sincronizar)"
     ↓
  CTA: "Ir para registrar completo" → /registrar?stopId=xxx
```

O `OneTapCard` é um componente autônomo que:
- Carrega sugestão de linha via `suggestLine()`
- Permite trocar linha via menu inline de top-lines
- Registra via `useOneTap` hook (com offline queue)
- Emite telemetria sem PII

## Query Param: `/registrar?stopId=`

Se `/registrar` receber `?stopId=xxx`, o ponto é pré-selecionado e a sugestão de linha é carregada imediatamente — sem quebrar o fluxo atual.

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
- `/no-ponto` — dicas sobre GPS, seleção de ponto e 1-toque
- `/registrar` — dicas sobre L1/L2/L3
- `/bairro/[slug]` e `/linha/[id]` — opção de "Seguir" para receber alertas específicos via Push.

## Telemetria (Zero PII)

Tabela `telemetry_counts` armazena apenas contadores por evento e data:

```
event_key | date       | count
cta_click | 2026-02-21 | 42
```

- Sem IP, sem user-agent, sem dados pessoais
- API: `POST /api/telemetry` body `{event: "cta_click"}` ou `{metrics: ["metric_1"]}`
- Eventos permitidos: `cta_click`, `pageview_como_usar`, `pageview_no_ponto`, `pageview_registrar`, `offline_queue_enqueued`, `one_tap_used`, `one_tap_confidence_high`, `one_tap_confidence_med`, `follow_bairro_click`, `follow_linha_click`, `push_optin_success`, `push_optin_denied`, `no_ponto_one_tap_shown`, `no_ponto_one_tap_used`, `no_ponto_to_registrar_clicked`, `no_ponto_one_tap_override_line`.

Card no admin `/admin` mostra **cliques hoje** e **cliques nos últimos 7 dias**.

## Notas de Ativação

> ⚠️ Aplicar a migration `0020_telemetry_counts.sql` no Supabase antes de usar em produção.
