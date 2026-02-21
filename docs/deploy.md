# Deploying to Vercel

## 1. Configurando Variáveis de Ambiente no Vercel
Para realizar o deploy na Vercel, você precisa configurar as variáveis de ambiente baseadas no seu projeto do Supabase.

1. Vá para as configurações do seu projeto na Vercel: **Settings > Environment Variables**.
2. Adicione as seguintes variáveis (você encontra esses dados no painel do Supabase em Project Settings > API):
   - `NEXT_PUBLIC_SUPABASE_URL`: A URL do seu projeto (ex: `https://xyz.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: A chave pública do seu projeto.
   - `SUPABASE_SERVICE_ROLE_KEY`: A chave secreta *service_role* (usada apenas no servidor).
   - `ADMIN_TOKEN`: Um token que você inventou para proteger rotas administrativas (ex: `/admin`).

## 2. Rodando Localmente
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

## 3. Confirmando Conexão
Para confirmar que as variáveis foram carregadas com sucesso e que a aplicação tem acesso ao Supabase:
1. Acesse a Home (`/`) e verifique a mensagem de "Supabase conectado".
2. Acesse no navegador ou via cURL o endpoint de health check:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Ele deve retornar status HTTP 200 com alguma resposta de "OK".
