# Kit Editorial VR no Ponto

O Kit Editorial é uma ferramenta para facilitar a compartilhamento de denúncias e dados de performance do transporte público em redes sociais (Instagram, LinkedIn, WhatsApp).

## Como Funciona

Baseado nos dados em tempo real e históricos, o sistema gera legendas automáticas que podem ser copiadas com um clique.

### Tons Disponíveis
O usuário pode escolher o tom da mensagem, que é salvo localmente:
1.  **Militante (Direto)**: Focado no impacto negativo e no descaso do serviço.
2.  **Didático (Explicativo)**: Explica os números e a metodologia da auditoria popular.
3.  **Ação (Convocatório)**: Convida a comunidade a participar e cobrar melhorias.

## Estrutura da Mensagem
As legendas seguem a lógica:
**Impacto** → **Contexto Local** → **Crítica Técnica** → **Humanização** → **Convocação**.

## Segurança e Ética Editorial

1.  **Dados Agregados**: Nunca expomos nomes de motoristas, IDs de dispositivos específicos ou dados sensíveis de usuários.
2.  **Validação de Amostra**: Quando o número de relatos é baixo (menos de 3), a ferramenta adiciona automaticamente um aviso de "amostra pequena" e reduz o tom acusatório para manter a credibilidade técnica.
3.  **Transparência**: Todas as legendas incluem o link para a auditoria completa no site oficial.

## Componentes Integrados
O card de Kit Editorial está presente em:
- `/boletim`: Para o resumo semanal da cidade.
- `/relatorio/mensal`: Para o balanço consolidado.
- `/ponto/[id]`: Para denúncias de locais específicos.
- `/linha/[id]`: Para denúncias de linhas de ônibus.
