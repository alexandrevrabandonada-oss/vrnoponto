# Manual de Supabase Remoto

Quando trabalhamos no projeto local, costumamos usar os servicos Mock e não precisamos estar conectados ao banco de produção para as tarefas básicas de UI. Porém, quando formos alterar tabelas, criar views ou enviar novas policies (RLS), o Supabase CLI precisa saber *em qual banco aplicar*.

Este documento mostra como conectar a sua base na nuvem do Supabase.

## 1. Variáveis Necessárias
Você precisa ter duas informações importantes guardadas ou expostas na máquina:
1. `SUPABASE_PROJECT_REF`: Obtida olhando a URL da dashboard do Supabase. É uma string como `rrbpirfqslybhfguxhmp`.
2. `SUPABASE_ACCESS_TOKEN`: Gere no painel do Supabase (Account > Access Tokens).
3. `SUPABASE_DB_PASSWORD`: A senha que você definiu ao criar o projeto (usada pela string de conexão Postgres).

## 2. Como fornecer essas variáveis (Modo Seguro)
Como estamos rodando automatizações, evite colocar isso *hardcoded* dentro do código. 
Temos duas opções simples:

**Opção A: Arquivo `.env.local`**
Crie na raiz do projeto o arquivo vazio `.env.local` (que já está garantido de não ir no git por padrão) e adicione as duas de forma pura sem aspas, junto com o `ADMIN_TOKEN` que usamos no Dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-banco-api
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
ADMIN_TOKEN=o-seu-token-de-admin

# Chaves para Deploy/Migração (NUNCA COMMITE)
SUPABASE_PROJECT_REF=rrbpirfqslybhfguxhmp
SUPABASE_ACCESS_TOKEN=sbp_94389028049jfsdfdsf...
SUPABASE_DB_PASSWORD=sua-senha-do-banco
```

**Opção B: Terminal Powershell**
Se você desejar que essas variáveis fiquem efêmeras (só durante o uso do terminal Antigravity), rode diretamente:
```powershell
$env:SUPABASE_PROJECT_REF="xyz..."
$env:SUPABASE_ACCESS_TOKEN="sbp_123..."
```

## 3. Comandos Úteis

Após configurar, rode:
1. `npm run ops:go` -> O fluxo Mágico Completo (Aplica senhas invisíveis, Linca com a nuvem, Ergue schemas e roda Smoke Test em Windows num clique só!)
2. `npm run supabase:check` -> Vai listar se suas variáveis foram encontradas com sucesso.
3. `npm run supabase:link` -> Vai conectar a pasta `supabase/` local ao seu database online usando o token associado.
4. `npm run supabase:push` -> Enviará todos os arquivos SQL da pasta `supabase/migrations/` para o seu database remoto.
5. `npm run supabase:seed` -> Executará os arquivos de testes que dão `INSERT` na base, como as regras estressadas ou dados preliminares.
6. `npm run db:doctor` -> Executa um diagnóstico profundo no schema, views e triggers do banco remoto para garantir que o ambiente está íntegro.

## 4. CI/CD (GitHub Actions)

As automações de banco de dados (`supabase:link` e `supabase:push`) agora também estão configuradas para rodar no GitHub Actions!

Existem dois workflows configurados na pasta `.github/workflows`:
- **Supabase Migrate (Auto)**: Disparado ao dar push na `main` alterando `supabase/migrations/` ou `config.toml`.
- **Supabase Migrate (Manual)**: Pode ser rodado sob demanda pela aba Actions.

### Segredos para o CI
No repositório do GitHub, crie os *Repository secrets*:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

*(Opcional: use Environments do GitHub para exigir aprovação manual - "Required Reviewers" - antes de disparar o push, pois tocar no banco de dados de produção afeta o sistema em tempo real).*
