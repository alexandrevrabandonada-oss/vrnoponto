# Sistema de Boletins e Cards Sociais

Este documento descreve o funcionamento do sistema de boletins automáticos e geração de ativos para redes sociais do VR no Ponto.

## Metodologia de Agregação

O boletim não expõe eventos individuais de usuários, focando em métricas agregadas para transparência pública:

1.  **Período**: Por padrão, o boletim foca nos últimos 7 dias. Seletores na UI permitem ver 14 ou 30 dias.
2.  **Alertas**: Conta o total de alertas de severidade `CRIT` (crítica) e `WARN` (aviso) gerados no período.
3.  **Rankings**: 
    *   **Piores Pontos**: Top 5 pontos com maior espera mediana (P50) nos últimos 30 dias.
    *   **Piores Linhas**: Top 5 linhas com maiores intervalos (headway) medianos.

## Geração de Cards Sociais

O sistema gera automaticamente imagens PNG em alta definição através da rota `/api/bulletin/card`.

### Formatos Disponíveis
-   **Square (1:1)**: Ideal para Feed (Instagram/LinkedIn). `format=square`.
-   **Story (9:16)**: Ideal para Stories e Reels. `format=story`.

## Uso Editorial e Ética

-   **Privacidade**: O boletim usa apenas `target_id` (IDs de pontos e linhas). Nenhuma informação de dispositivo ou usuário é transmitida.
-   **Contexto**: Ao postar os cards, recomenda-se citar que os dados são baseados em auditoria cidadã colaborativa.

## Acesso via GitHub Actions

Toda segunda-feira às 07:40 BRT, o workflow `Weekly Bulletin Generation` é executado.

1.  Vá na aba **Actions** do repositório.
2.  Clique no workflow à esquerda.
3.  Selecione a execução mais recente.
4.  No rodapé, baixe o arquivo `weekly-bulletin-xxxx` (ZIP).
5.  O ZIP conterá as imagens prontas para publicação.
