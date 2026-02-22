# Deploying to Vercel

## 1. Configurando Variáveis de Ambiente no Vercel
Para realizar o deploy na Vercel, você precisa configurar as variáveis de ambiente baseadas no seu projeto do Supabase.

1. Vá para as configurações do seu projeto na Vercel: **Settings > Environment Variables**.
2. Adicione as seguintes variáveis (você encontra esses dados no painel do Supabase em Project Settings > API):
   - `NEXT_PUBLIC_SUPABASE_URL`: A URL do seu projeto (ex: `https://xyz.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: A chave pública do seu projeto.
   - `SUPABASE_SERVICE_ROLE_KEY`: A chave secreta *service_role* (usada apenas no servidor).
   - `ADMIN_TOKEN`: Um token que você inventou para proteger rotas administrativas (ex: `/admin`).
   - `VAPID_PUBLIC_KEY`: Chave pública para Web Push Notifications (Gere usando `npx web-push generate-vapid-keys`).
   - `VAPID_PRIVATE_KEY`: Chave privada para Web Push Notifications.

## 2. Rodando Localmente (Manual via \`.env\`)
1. Copie o arquivo `.env.example` para criar o seu `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Preencha os valores das variáveis criadas no arquivo `.env.local`.
   > **Importante:** Nunca commite o arquivo `.env.local`. Ele já está listado no seu `.gitignore`.
3. Inicie o servidor Next.js na sua máquina:
   ```bash
   npm run dev
   ```

## 3. Workflow de Setup "Com Um Clique" (Windows PowerShell)
Se você estiver no Windows, não precisa tocar em arquivos `.env` manualmente. Basta rodar o agregador:
```bash
npm run ops:go
```
Ele vai:
1. Pedir senhas de forma invisível.
2. Linkar o projeto à internet no Supabase localmente e subir as estruturas do banco.
3. Fazer linting, building, e rodar o projeto em background.
4. Bater um cURL teste para ver se o projeto ergueu saudável no porto 3000 ("Smoke Test") e reportar.

## 4. Confirmando Conexão
Para confirmar que as variáveis foram carregadas com sucesso e que a aplicação tem acesso ao Supabase:
1. Acesse a Home (`/`) e verifique a mensagem de "Supabase conectado".
2. Acesse no navegador ou via cURL o endpoint de health check:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Ele deve retornar status HTTP 200 com alguma resposta de "OK".

## 5. Importar Paradas via CSV/GeoJSON

Para popular a base de paradas rapidamente, use o endpoint de import administrativo:

### Via UI Admin
1. Acesse `/admin/pontos?t=SEU_ADMIN_TOKEN`
2. Use a seção "Importar Paradas" no final da página
3. Faça upload de um CSV ou GeoJSON
4. Use "Dry Run" primeiro para simular

### Via cURL (CSV)
```bash
curl -X POST "https://seusite.com/api/admin/stops/import?t=SEU_ADMIN_TOKEN" \
  -F "file=@paradas.csv"
```

### Formato CSV
```csv
name,lat,lng,neighborhood
Rua 33 - Vila Rica,-22.123,-44.456,Vila Rica
```

### Formato GeoJSON
Point features com `properties.name` e `properties.neighborhood` (opcional).

**Upsert por proximidade**: se já existir um ponto a menos de 15m, atualiza nome/bairro. Senão, cria novo.
