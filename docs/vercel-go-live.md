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

*Jamais adicione as chaves terminadas em "CLI/Access Token" como variáveis de hospedagem web.*

## 3. Node & Build Settings
* [ ] Certifique-se nas Configurações do Projeto de que a linguagem raiz do Node.js está em "20.x". Next.js puxará nativamente os comandos `npm run build`.

## 4. O Famoso "Smoke Test"
Após a Vercel finalizar e gerar luz verde, abra a URL oficial do app e bata nessas 4 rotas-chefe:

* [ ] `/api/health`: Deve retornar *OK* escrito numa tela preta limpa.
* [ ] `/no-ponto` (Aprovar GPS do Browser): O select de pontos *deve carregar pontos nomeados* ou o alerta amarelinho de nenhum ponto (caso o banco esteja zerado de seeds). *Não pode craxar.*
* [ ] `/painel`: Abas interativas de Linhas e Visão Geral devem redimensionar e não apagar a tela (Testando se a Anon Key logou ao DB para RLS).
* [ ] `/admin?t=SEUTOKEN`: A URL deve limpar pro `/admin` automaticamente, gerar o cookie no seu browser e exibir o Dashboard Administrativo c/ as ferramentas (Testando a integridade Middleware + EnvVars).
