# Schema do Banco de Dados (VR no Ponto)

## Extensões
- `postgis`: Utilizada para armazenar e consultar coordenadas geográficas (pontos de parada).

## Tabelas Base

### `lines`
Representa as linhas de ônibus.
- `id`: UUID (PK)
- `code`: VARCHAR (ex: "P200")
- `name`: VARCHAR (ex: "Vila Rica")
- `is_active`: BOOLEAN (default: true)
- `created_at`: TIMESTAMPTZ

### `line_variants`
Variantes/Sentidos da linha (ex: Ida, Volta, via Hospital).
- `id`: UUID (PK)
- `line_id`: UUID (FK -> lines)
- `name`: VARCHAR
- `direction`: VARCHAR (inbound, outbound, circular)
- `created_at`: TIMESTAMPTZ

### `stops`
Pontos de ônibus físicos.
- `id`: UUID (PK)
- `code`: VARCHAR (código oficial do ponto, se houver)
- `name`: VARCHAR
- `location`: GEOGRAPHY(POINT, 4326)
- `is_active`: BOOLEAN (default: true)
- `created_at`: TIMESTAMPTZ

### `official_schedules`
Horários oficiais das linhas.
- `id`: UUID (PK)
- `line_variant_id`: UUID (FK -> line_variants)
- `departure_time`: TIME
- `day_type`: VARCHAR (business_day, saturday, sunday, holiday)

## Tabelas de Eventos e Crowdsourcing

### `stop_events`
Eventos registrados pelos usuários em um ponto (ex: onibus chegou, passou direto).
- `id`: UUID (PK)
- `stop_id`: UUID (FK -> stops)
- `line_id`: UUID (FK -> lines)
- `device_id`: VARCHAR (Obrigatório, UUID do dispositivo)
- `event_type`: VARCHAR (arrived, boarding, passed_by, delayed)
- `occurred_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ

### `bus_ratings`
Avaliação do ônibus (lotação, limpeza, segurança).
- `id`: UUID (PK)
- `line_id`: UUID (FK -> lines)
- `device_id`: VARCHAR (Obrigatório)
- `crowding_level`: INT (1-5)
- `occurred_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ

### `trust_confirmations`
Confirmações de eventos gerados por outros usuários (Upvote/Downvote).
- `id`: UUID (PK)
- `event_id`: UUID (FK -> stop_events)
- `device_id`: VARCHAR
- `is_confirmed`: BOOLEAN
- `created_at`: TIMESTAMPTZ

### `qr_checkins`
Check-ins do usuário via QR Code no ponto físico.
- `id`: UUID (PK)
- `stop_id`: UUID (FK -> stops)
- `device_id`: VARCHAR
- `created_at`: TIMESTAMPTZ

### `vw_critical_stops`
Mostra o TOP 10 de pontos com a pior média de espera, cruzando as estatísticas da `vw_wait_time_metrics` com os nomes reais formatados.

## 6. Routines (RPCs)
Funções executadas diretamente no backend do PostgreSQL para otimizar operações.

### `rpc_nearest_stops(lat float, lng float, lim int)`
Recebe as coordenadas espaciais via latitude e longitude numéricas puras e retorna os pontos de ônibus (`stops`) formatados por ordem de proximidade.
- **Uso:** Em `/api/stops/nearest` para mostrar a tela inicial do *"Estou no Ponto"* baseada no GPS.
- **Engine Espacial:** Usa `location <-> ST_MakePoint` (KNN distance) e `ST_Distance` para forçar alta otimização nos índices GIST do PostGIS. Retorna apenas pontos com `is_active = true`.

### `admin_flags`
Sinalizações administrativas (ex: Ponto desativado temporariamente, via interditada).
- `id`: UUID (PK)
- `target_type`: VARCHAR (stop, line)
- `target_id`: UUID
- `message`: TEXT
- `expires_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ

## Índices Relevantes
- `idx_stop_events_stop_line_time` em `stop_events (stop_id, line_id, occurred_at)`
- `idx_bus_ratings_line_time` em `bus_ratings (line_id, occurred_at)`

## RLS (Row Level Security)
- **Leitura Pública (`SELECT`)**: `lines`, `stops` (somente `is_active = true`), Views de agregação.
- **Inserção Anônima (`INSERT`)**: `stop_events`, `bus_ratings`, `qr_checkins`, `trust_confirmations` - permitido para a role `anon`, contanto que `device_id` seja fornecido.
- **Update/Delete**: Bloqueado para usuários anônimos. Permitido apenas via `service_role` (backend) ou `admin` (claims).
