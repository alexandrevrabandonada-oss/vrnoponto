# VR no Ponto - Vercel Go-Live Checklist

Abaixo está a lista estrita de conferência antes e durante a subida de ambiente do sistema para a Vercel.

## 1. Conectar Repositório
* [ ] No painel Vercel (`vercel.com`), crie um novo projeto "Import from GitHub".
* [ ] Conceda acesso ao repositório `vrnoponto`.

## 2. Configurar Variáveis de Ambiente
Na tela de configuração (aba *Environment Variables*), você deve informar 5 chaves cruciais, as mesmas que habitam seu lado local oculto. Copie do seu cofre e declare para os ambientes `Production` e `Preview`:

| Variável | Obrigatório | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **SIM** | URL base do banco (ex: `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **SIM** | A chave pública do banco Client-Safe. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SIM** | A super-chave do banco; MANTENHA SECRETA. |
| `ADMIN_TOKEN` | **SIM** | O token criado por você para liberar a URL do seu Painel. |
| `OFFICIAL_SOURCE_URL` | **SIM** | A base do site da prefeitura que contém os links dos anexos de horários. |
| `VAPID_PUBLIC_KEY` | **SIM** | Chave pública gerada via cli `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | **SIM** | Chave privada correspondente; MANTENHA SECRETA na nuvem. |

*Jamais adicione as chaves terminadas em "CLI/Access Token" como variáveis de hospedagem web.*

## 3. Node & Build Settings
* [ ] Certifique-se nas Configurações do Projeto de que a linguagem raiz do Node.js está em "20.x". Next.js puxará nativamente os comandos `npm run build`.

## 4. O Famoso "Smoke Test"
Após a Vercel finalizar e gerar luz verde, abra a URL oficial do app e bata nessas 5 rotas-chefe:

* [ ] `/api/health`: Deve retornar *OK* escrito numa tela preta limpa.
* [ ] `/no-ponto` (Aprovar GPS do Browser): O select de pontos *deve carregar pontos nomeados* ou o alerta amarelinho de nenhum ponto.
* [ ] `/painel`: Abas interativas de Linhas e Visão Geral devem redimensionar e carregar dados.
* [ ] `/admin?t=SEUTOKEN`: A URL deve transmutar para `/admin`, gerar cookie e exibir o Dashboard Administrativo Central.
* [ ] `/admin/status`: O **System Status Dashboard** deve carregar com badges verdes (ou amarelos) indicando que CRONs, banco e API de Vagas estão respondendo (Testando `system_runs` RLS).

## 5. Automação Diária e CI/CD (GitHub Actions)

O repositório conta com automações no GitHub Actions para facilitar o dia a dia operacinal:

1. **Sync Oficial (`.github/workflows/sync-official.yml`)**: Baixa diariamente PDFs de horários (Cronjob).
2. **Supabase Migrate (`.github/workflows/supabase-migrate.yml`)**: Aplica migrations automaticamente no banco de produção sempre que houver um `push` na branch `main` modificando arquivos em `supabase/migrations/` ou `config.toml`.

### Como configurar os Secrets do GitHub
Para ativar essas automações, crie os seguintes *Repository secrets* no GitHub (**Settings > Secrets and variables > Actions**):

| Secret | Usado por | Descrição |
| --- | --- | --- |
| `VRNP_SYNC_URL` | Sync Oficial | URL de sync (ex: `https://meu-app.vercel.app/api/admin/sync-official`) |
| `VRNP_ADMIN_TOKEN` | Sync Oficial | Sua senha mestra (`ADMIN_TOKEN`) |
| `SUPABASE_ACCESS_TOKEN` | Migrate | Token de acesso pessoal gerado no painel da Supabase |
| `SUPABASE_PROJECT_REF` | Migrate | ID do projeto Supabase (ex: `rrbpirfqsly...`) |
| `SUPABASE_DB_PASSWORD` | Migrate | A senha master do banco de dados (usada no `db push`) |

> ⚠️ **Aviso de Segurança (Migrations Automáticas)**: As migrations são aplicadas diretamente no banco de dados. Para maior controle, considere usar *Environments* no GitHub (ex: "production") e ativar a regra de *Required Reviewers*. Isso fará com que o workflow pause e espere aprovação manual antes de tocar no banco.
