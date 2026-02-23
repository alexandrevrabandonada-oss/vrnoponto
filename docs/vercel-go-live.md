# VR no Ponto - Vercel Go-Live Checklist

Abaixo está a lista estrita de conferência antes e durante a subida de ambiente do sistema para a Vercel, incluindo blindagem contra variáveis de ambiente ausentes.

## 1. Conectar Repositório
* [ ] No painel Vercel (`vercel.com`), crie um novo projeto "Import from GitHub".
* [ ] Conceda acesso ao repositório `vrnoponto`.

## 2. Configurar Variáveis de Ambiente
Na tela de configuração (aba *Environment Variables*), preencha as chaves abaixo para os ambientes `Production` e `Preview`:

| Variável | Obrigatoriedade | Ambientes | Descrição |
|----------|-----------------|-----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | **CRÍTICO** | Production, Preview | URL base do banco (ex: `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **CRÍTICO** | Production, Preview | Chave anônima para uso no Frontend e Server Components. |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRÍTICO** | Production, Preview | Chave de bypass de RLS usada estritamente em Server Actions / rotas privilegiadas. |
| `ADMIN_TOKEN` | Importante | Production, Preview | Senha mestre para acessar `/admin/*`. Ex: uma string aleatória forte. |
| `VAPID_PUBLIC_KEY` | Opcional | Production, Preview | Chave pública gerada via cli `npx web-push generate-vapid-keys` para Push Notifications. |
| `VAPID_PRIVATE_KEY` | Opcional | Production, Preview | Chave privada correspondente; MANTENHA SECRETA na nuvem. |
| `CRON_SECRET` | Opcional | Production | Token de segurança para crons da Vercel (`/api/admin/run-alerts`). |

## 3. Banner de Prevenção de Caos (Runtime Banner)
O app possui um componente global (`<EnvBanner />`) no root layout. 
**Se as variáveis REST (URL ou ANON_KEY) do Supabase não existirem**, o Vercel não irá quebrar silenciosamente as telas. Em vez disso, o app exibirá uma barra amarela avisando: **"Ambiente sem conexão com banco (Preview)"** em todas as páginas, auxiliando rapidamente a diagnosticar previews de Pull Requests que não herdaram as variáveis.

Pode-se consultar via GET `/api/env-audit` o status em boolean para verificar quais variáveis as instâncias Vercel reconheceram no momento.

## 4. O Famoso "Smoke Test"
Após a Vercel finalizar e gerar luz verde, abra a URL oficial do app e bata nessas 5 rotas-chefe:

* [ ] `/api/health`: Deve retornar *OK*.
* [ ] `/api/env-audit`: Deve retornar JSON com flags booleanas de ambiente configuradas.
* [ ] `/no-ponto` (Aprovar GPS do Browser): O select de pontos *deve carregar pontos nomeados* ou o alerta de vazios.
* [ ] `/admin?t=SEUTOKEN`: A URL deve transmutar para `/admin`, gerar cookie e exibir o Dashboard Administrativo Central.
* [ ] `/admin/status`: O Dashboard deve carregar com badges indicando que CRONs e APIs respondem.

## 5. Automação Diária e CI/CD (GitHub Actions)
O repositório conta com automações (`.github/workflows`) para sincronizar arquivos PDFs (`sync-official.yml`) e aplicar migrations BD produtivo (`supabase-migrate.yml`). Veja os scripts no repositório para adicionar os rep secrts necessários (`SUPABASE_ACCESS_TOKEN`, `VRNP_ADMIN_TOKEN`, etc).
