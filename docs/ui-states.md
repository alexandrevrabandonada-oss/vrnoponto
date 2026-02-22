# Padronização de Estados de UI (Boas Práticas)

Este documento define as diretrizes para a exibição de estados de carregamento, estados vazios e alertas dentro da aplicação VR no Ponto, garantindo a consistência com o Industrial UI Kit.

## 1. Carregamento (Skeleton States)

O uso de `Skeleton` substitui os spinners radiais e animações genéricas. Skeletons devem refletir o tamanho e formato aproximado do conteúdo que será carregado, minimizando o Cumulative Layout Shift (CLS).

**Variantes Disponíveis (`components/ui/Skeleton.tsx`):**
- **`SkeletonList`**: Use para listas de itens (`ListItem`), como últimas avaliações ou histórico de alertas.
- **`SkeletonTable`**: Use quando o resultado será uma estrutura tabular ou lista densa de métricas.
- **`SkeletonMetric`**: Use em Grids numéricos na parte superior de Dashboards (Cards de KPIs).
- **`SkeletonCard`**: Use para placeholders de blocos mais pesados ou explicativos.

## 2. Feedback e Alertas (EmptyState vs InlineAlert)

### Quando usar `EmptyState`?
- **Falta de Dados Principais**: O bloco inteiro está focado em exibir uma lista vazia, gráfico sem histórico ou página sem resultados.
- **Tamanho**: Ocupa espaço considerável e possui forte chamada visual.
- **Estrutura**: Deve sempre conter Ícone + Título (H3) + Descrição + (Action opcional).
- *Exemplo:* "Nenhum histórico reportado neste bairro." → Mostra `EmptyState` sugerindo "Registrar Situação".

### Quando usar `InlineAlert`?
- **Avisos Temporários ou Contextuais**: Mensagens sobre falhas de API pontuais, avisos de sistema degradado, erros de validação pós-submit ou dicas cruciais sobre um dado em tela.
- **Tamanho**: Discreto e horizontal.
- *Exemplo:* "O cálculo do P50 pode estar impreciso por baixa amostragem hoje." (Variant: Warning).

## 3. Redação (Copy UX)

A linguagem usada nos componentes de interface sempre deve aderir aos seguintes princípios:
- **Humano e Curto**: Evite gírias longas. Vá direto ao ponto. "Dados Indisponíveis" no lugar de "Não foi possível carregar a matriz de dados".
- **Sem Jargão Técnico (na UI Final)**: Para o usuário final, remova chaves do banco de dados (ex: vire `P50_wait` para `Espera (Mediana)` ou `Espera Média`). 
  - *Regra*: Mantenha as chaves originais em `snake_case` apenas no consumo da API/State, mas nunca as imprima puras no JSX.
- **Métricas (`MetricRow`)**:
  - `label`: O que o número significa ("Alertas Críticos (P1)").
  - `value`: O número primário.
  - `sublabel`: Contexto menor como unidade ("min", "%") ou qualificativo ("Péssimo").
  - `deltaLabel`: Mudança legível ("+12m", "estável").

Siga essas orientações para manter a voz ativista técnica mas amigável e acessível do VR no Ponto.
