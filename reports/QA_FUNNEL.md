# QA Audit Report: Public Funnel

**Status**: COMPLETED
**Date**: 2026-02-24
**Stories**: 🏁 stories/qa-audit-funnel.🏁

## Summary of Findings
| Severity | Count | Impact |
|---|---|---|
| **P0 (Critical)** | 0 | - |
| **P1 (High)** | 3 | Go-live blockers (Error boundaries, GPS UX, Data persistence) |
| **P2 (Medium)** | 5 | UX friction and consistency improvements |

---

## Detailed Findings & Diagnosis

### 1. Fallback Global de Erro (P1)
- **Achado**: Não existe um arquivo `app/error.tsx` ou `app/global-error.tsx`. 
- **Impacto**: Qualquer erro não tratado em tempo de execução resultará em uma tela branca (Next.js default error).
- **Como reproduzir**: Simular um erro em qualquer rota (`throw new Error`).
- **Sugestão**: Implementar `app/error.tsx` com um design "industrial/reparo" e botão de recarregar.

### 2. Time-out do GPS e Fallback de Busca (P1)
- **Achado**: Na página `/no-ponto`, se o GPS for negado ou demorar, o usuário fica preso em "Aguardando GPS..." por até 10s antes do fallback aparecer.
- **Impacto**: Usuário "pessoa comum" desiste antes de ver a busca por nome.
- **Como reproduzir**: Bloquear GPS no navegador e entrar em `/no-ponto`.
- **Sugestão**: Mostrar o botão "Buscar Ponto pelo Nome" imediatamente se o status for erro ou após 2s de espera.

### 3. Falha Silenciosa no Upload de Fotos Pesadas (P2)
- **Achado**: `BusPhotoModal.tsx` tem um limite de 3MB. Se a compressão falhar em reduzir abaixo disso, o erro é genérico.
- **Impacto**: Usuários com câmeras de altíssima resolução podem não conseguir enviar provas.
- **Como reproduzir**: Tentar upload de uma imagem 4K complexa em rede lenta.
- **Sugestão**: Melhorar o algoritmo de compressão (Canvas resize) e fornecer feedback progressivo de "Comprimindo imagem...".

### 4. Persistência de Favoritos Offline (P1)
- **Achado**: Favoritos (`lib/favorites.ts`) usam `localStorage`. Se o usuário limpar os dados no `/meu` (hub de auditoria), ele perde todos os bairros seguidos.
- **Impacto**: Perda de personalização sem aviso claro na tela de limpeza.
- **Como reproduzir**: Favoritar um bairro, ir em `/meu`, clicar em "Limpar Dados".
- **Sugestão**: Adicionar "Favoritos e Bairros Seguidos" na lista do que será apagado no modal de confirmação.

### 5. Tour Interrompendo Fluxo Crítico (P2)
- **Achado**: O tour bloqueia a interação com o CTA principal até ser completado ou pulado.
- **Impacto**: Usuários recorrentes em aparelhos novos/incógnito podem se irritar.
- **Como reproduzir**: Entrar pela primeira vez.
- **Sugestão**: Tornar o tour menos invasivo ou permitir que o clique no próprio elemento destacado prossiga para a página alvo.

---

## Go-Live Checklist

| Item | Status | Observação |
|---|---|---|
| Tour aparece apenas 1x? | PASS | Salva `vrnp_tour_completed`. |
| GPS Negado -> Busca Manual? | PASS (DELAYED) | Funciona, mas demora 10s (P1). |
| Foto Offline funciona? | PASS | Usa `OfflineProofQueue`. |
| Limpeza de Dados total? | PASS | Limpa DBs, Cookies e LocalStorage. |
| Performance (Skeletons)? | PASS | Bem implementado em Bairros e Boletim. |
| Error Boundary presente? | **FAIL** | Risco de tela branca (P1). |

## Plano de Ação (Sugestões)
1. **P1 (Bloqueante)**: Criar `app/error.tsx`.
2. **P1 (Bloqueante)**: Reduzir timeout visual do GPS para 3s e mostrar busca como alternativa rápida.
3. **P1 (Estabilidade)**: Atualizar a lista de "O que será apagado" para incluir Favoritos.

## P1 resolvidos
- **P1.1 Error Boundary global**: criado `app/error.tsx` com UI amigável, CTAs de recuperação e telemetria `client_error_global` sem payload sensível.
- **P1.2 GPS fallback rápido**: `/no-ponto` agora libera fallback manual cedo (2s) e imediatamente em erro/negação de GPS.
- **P1.3 Transparência de limpeza**: `/config` agora detalha explicitamente tudo que é apagado (incluindo Favoritos) e exige confirmação “Entendi que perderei meus Favoritos”.

## Como testar (rápido)
1. **Erro global**
   - Forçar um erro em rota pública (ex.: `throw new Error` temporário em um componente) e confirmar que a tela de erro customizada aparece.
   - Clicar em **Tentar novamente** (chama `reset`) e **Voltar para Home**.
2. **Fallback GPS**
   - Abrir `/no-ponto` com GPS bloqueado ou lento.
   - Verificar se o CTA **Buscar ponto pelo nome** aparece cedo (aprox. 2s) e imediatamente em erro de permissão.
3. **Limpar dados**
   - Abrir `/config` > **Limpar meus dados do aparelho**.
   - Confirmar lista completa de itens apagados e checkbox obrigatório antes de habilitar **Confirmar**.

🏁 stories/qa-audit-funnel.🏁
