# Níveis de Confiança (Trust Levels) e Rate Limiting

## Níveis de Confiança (Trust Levels)
O sistema de informações em tempo real via crowdsourcing do VR no Ponto utiliza níveis de confiança para determinar a veracidade de um evento relatado pelos usuários (como "Ônibus Passou" ou "Ônibus Chegou").

### `L1` (Nível 1 - Básico)
- **Critério**: O usuário relata um evento através do aplicativo usando seu `device_id`.
- **Comportamento**: É o nível padrão. Qualquer evento registrado recebe `L1` automaticamente.

### `L2` (Nível 2 - Confirmado)
- **Critério**: Um evento atinge `L2` quando **dois ou mais dispositivos diferentes** relatam o **mesmo tipo de evento** (ex: `passed_by`) para a **mesma linha e ponto**, dentro de uma **janela de 8 minutos**.
- **Comportamento**: O backend agrupa esses eventos e atualiza o `trust_level` para `L2`. O aplicativo passa a exibir esse evento com um selo de **"Verificado pela comunidade" (L2)**.

### `L3` (Nível 3 - Prova Forte)
O nível máximo de confiabilidade, atingido por métodos que comprovam a presença física ou trajetos plausíveis:
- **Coletivo**: 3 ou mais dispositivos únicos relatando o mesmo evento (ex: `passed_by`) para a mesma linha/ponto em uma janela de 8 min. Todos os relatos são promovidos a `L3`.
- **Trajeto**: O usuário marca `boarding` (Embarquei) em um ponto e `alighted` (Desci) em outro ponto diferente após pelo menos 5 minutos. Ambos os eventos são promovidos a `L3`.
- **QR Parceiro (Opcional)**: Scan de QR Code físico em pontos ou ônibus de parceiros comerciais. Requer validação de proximidade GPS (80m).
- **Rate Limit**: 1 promoção L3 por ponto a cada 30 minutos por dispositivo.


## Rate Limiting (Prevenção de Spam)
Para evitar que usuários mal-intencionados inundem o sistema com falsos relatos em um curto período, aplicamos as seguintes regras:
1. **Regra Principal**: Um mesmo `device_id` **não pode reportar o mesmo tipo de evento para a mesma linha** mais de uma vez em um intervalo de **10 minutos**.
2. **Exceção**: Se o usuário tentar enviar novamente antes dos 10 minutos expirarem, o evento é **rejeitado** com um erro de *Rate Limit*.
3. **Escopo**: O bloqueio é por `(device_id, line_id, event_type)`. O usuário ainda pode apontar eventos de linhas diferentes neste meio tempo, mas não da mesma.

## Implementação Backend
A lógica de negócio foi movida do cliente direto (Supabase Client-Side Insert) para um servidor centralizado (`/api/events/record`).
- O servidor checa o Rate Limit (consultando no Supabase eventos recentes pro device/linha).
- O servidor insere o evento como `L1`.
- O servidor busca eventos parecidos nos mesmos 8 mins de outros devices.
- Se houver outros devices, atualiza o `trust_level` do evento antigo (e do novo) para `L2`, e gera a confirmação.
