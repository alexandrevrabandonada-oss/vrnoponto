# Funil de Adesão — Pontos Parceiros

Documentação do fluxo de onboarding de novos Pontos Parceiros no VR no Ponto.

## O que é um Ponto Parceiro?

Um Ponto Parceiro é um estabelecimento (comércio, sindicato, escola, coletivo etc.) que autoriza a afixação de um QR Code oficial do VR no Ponto em seu local. Os passageiros escaneiam o QR para registrar "Prova de Presença" (nível L3) no sistema.

## Funil de Adesão

```
/parceiros → botão CTA → /parceiros/entrar → POST /api/partner-request → partner_requests (PENDING)
                                                                                          ↓
                                                                          /admin/parceiros?tab=requests
                                                                                ↓
                                                                      Aprovar → partners (is_active=true)
                                                                      Rejeitar → rejection_reason stored
```

## Rotas

| Rota | Tipo | Descrição |
|---|---|---|
| `/parceiros` | Public | Lista de parceiros ativos com mapa |
| `/parceiros/entrar` | Public | Formulário de pedido de adesão |
| `/api/partner-request` | API / POST | Recebe e valida pedidos |
| `/admin/parceiros` | Admin | Gestão de parceiros ativos |
| `/admin/parceiros?tab=requests` | Admin | Inbox de pedidos PENDING |

## Proteções Anti-Spam na API

- **Honeypot**: campo `website` oculto. Se preenchido, a requisição é descartada silenciosamente.
- **Rate Limit**: máximo de 3 pedidos por dia por IP.
- **Validação mínima**: `name` + `neighborhood` + ao menos um contato (`contact_phone` ou `contact_instagram`).

## RLS da Tabela `partner_requests`

| Operação | Quem pode |
|---|---|
| `INSERT` | Qualquer pessoa (`anon`, `authenticated`) |
| `SELECT` / `UPDATE` | Somente `service_role` (admin backend) |

Os dados dos solicitantes nunca são expostos publicamente.

## Templates de Convite

Arquivo: `lib/editorial/partner_invite.ts`

| Função | Canal |
|---|---|
| `getWhatsAppShort()` | WhatsApp (curto) |
| `getWhatsAppLong()` | WhatsApp (longo com contexto) |
| `getInstagramDM()` | Instagram DM |

Disponíveis como botões de cópia rápida na página `/parceiros`.

## Critérios de Aprovação

Um pedido deve ser aprovado quando:
1. O local é real e verificável (bairro coerente).
2. O contato é responsivo.
3. O estabelecimento tem circulação de passageiros.

Ao aprovar, o admin clica "Aprovar e Criar" e o sistema automaticamente:
- Cria um registro em `partners` com `is_active = true`.
- Marca o pedido como `APPROVED` com `resolved_at`.

## Métricas e Telemetria (Funil)

Para entender se o cadastro público converte, o app rastreia os eventos usando contadores sem PII na tabela `telemetry_counts`:

1. **`page_view_partners`**: Visualização de `/parceiros` (Debounce: 1/sessão)
2. **`page_view_partner_apply`**: Visualização do formulário `/parceiros/entrar` (Debounce)
3. **`click_partner_apply_submit`**: Clique no botão Enviar Pedido
4. **`partner_request_created`**: Pedido salvo com sucesso no banco (Server-side)
5. **`partner_request_approved` / `partner_request_rejected`**: Ações do administrador
6. **`partner_kit_generated`**: Geração do selo/QR Code no painel Admin

### Exibição e Exportação
* **Views**: `vw_partner_funnel_daily` pivota os eventos por dia útil, e `vw_partner_funnel_summary_30d` soma e traz as taxas de conversão dos últimos 30 dias.
* **Painel Admin**: Em `/admin/parceiros` há um card visualizando as métricas (Acessaram → Enviaram → Aprovados → Kits), com *taxas percentuais em badges*.
* **CSV API**: Um botão Exportar chama `GET /api/admin/funnel/csv` para download nativo do CSV dos últimos 60 dias (protegido por server action context login ou token, se isolado).
