# VR Abandonada — Tema Industrial

O tema "VR Abandonada" traz uma estética industrial, de alto contraste, inspirada em sinalizações de segurança e equipamentos de transporte urbano.

## Paleta de Cores (Tokens CSS)

| Token | Cor | Escopo | Uso |
| :--- | :--- | :--- | :--- |
| `--brand` | `#F6C600` | Marca / Destaque | CTAs, ícones ativos, indicadores de status ok |
| `--background`| `#070707` | Fundo Principal | Cor base de todas as páginas |
| `--surface` | `#111111` | Elevado | Cards, modais |
| `--text` | `#F2F2F2` | Conteúdo | Texto principal, acessibilidade AA/AAA |
| `--muted` | `#B7B7B7` | Auxiliar | Legendas, metadados |
| `--danger` | `#D62828` | Alerta | Erros críticos, alertas de desempenho |

## Tipografia

- **Headlines (H1, H2, H3)**: `Staatliches` (Google Fonts). Uma fonte stencil industrial para impacto e autoridade técnica.
- **Corpo do Texto**: `Inter` (ou Geist), focada em legibilidade e clareza de dados.

## Texturas e Efeitos

- **Grain/Noise**: Aplicado via SVG sutil no `body::after` para dar uma textura de material físico.
- **Radial Glow**: Brilhos amarelos e ferrugem sutis nos cantos superiores para profundidade.
- **Glassmorphism**: Camadas de vidro (`.glass`) com desfoque de 16px para interfaces modernas.

## Componentes Principais

- **AppShell**: O container global que define a estrutura de layout industrial.
- **EmptyState**: O componente padrão para estados vazios, com ícone, título industrial e CTAs contextuais.
- **MetricCard**: Exibição de métricas técnicas com suporte a tendências e cores de alerta.
- **Sparkline**: Visualização de fluxo temporal (P50/P90) integrada ao Design System.
- **Tap Targets**: Todos os botões principais possuem altura mínima de 52px para fácil interação em dispositivos móveis.
