import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');

if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

const isSnapshot = process.argv.includes('snapshot');
let nodeVersionStr = process.version;
let nodeWarn = '';
if (!nodeVersionStr.startsWith('v20')) {
    nodeWarn = ' [WARNING: local node != engines node 20.x]';
}

const outputPath = path.join(reportsDir, isSnapshot ? 'VRNP_SNAPSHOT.md' : 'VRNP_STATUS.md');

function execWithStatus(cmd) {
    try {
        const output = execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
        return { code: 0, output };
    } catch (e) {
        return {
            code: e.status || 1,
            output: e.stdout?.toString() || e.stderr?.toString() || e.message
        };
    }
}

// Para retrocompatibilidade ou uso simples
function execSafe(cmd) {
    return execWithStatus(cmd).output;
}

const now = new Date().toISOString();

let gitBranch = execSafe('git rev-parse --abbrev-ref HEAD');
let gitCommit = execSafe('git rev-parse --short HEAD');
if (gitBranch.startsWith('Error')) gitBranch = 'N/A';
if (gitCommit.startsWith('Error')) gitCommit = 'N/A';

const recentCommits = execSafe('git log -n 5 --pretty=format:"* %h - %s"');
const eslintVersion = execSafe('npx eslint -v');

const appRoutes = [];
const apiRoutes = [];

// Função recursiva para encontrar rotas (page.tsx e route.ts)
function findRoutes(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            findRoutes(path.join(dir, item.name));
        } else if (item.isFile()) {
            if (item.name === 'page.tsx') {
                const relative = path.relative(path.join(rootDir, 'app'), path.join(dir, item.name));
                appRoutes.push('/' + path.dirname(relative).replace(/\\/g, '/'));
            } else if (item.name === 'route.ts') {
                const relative = path.relative(path.join(rootDir, 'app'), path.join(dir, item.name));
                apiRoutes.push('/api/' + path.dirname(relative).replace(/^api[\\/]/, '').replace(/\\/g, '/'));
            }
        }
    }
}
findRoutes(path.join(rootDir, 'app'));
appRoutes.sort();
apiRoutes.sort();

const envLocalPath = path.join(rootDir, '.env.local');
const envLocalExists = fs.existsSync(envLocalPath);
const envLocalStatus = envLocalExists ? 'OK' : 'MISSING';

let supabaseEnvStatus = 'MISSING';
let supabaseRemoteStatus = { ref: 'MISSING', token: 'MISSING' };

if (envLocalExists) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (hasUrl && hasKey) supabaseEnvStatus = 'OK';

    if (envContent.includes('SUPABASE_PROJECT_REF')) supabaseRemoteStatus.ref = 'OK';
    if (envContent.includes('SUPABASE_ACCESS_TOKEN')) supabaseRemoteStatus.token = 'OK';
}

// Fallback checking actual process.env for terminal-injected vars
if (process.env.SUPABASE_PROJECT_REF) supabaseRemoteStatus.ref = 'OK';
if (process.env.SUPABASE_ACCESS_TOKEN) supabaseRemoteStatus.token = 'OK';

const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const migrations = [];
if (fs.existsSync(migrationsDir)) {
    const items = fs.readdirSync(migrationsDir);
    for (const item of items) {
        if (item.endsWith('.sql')) {
            migrations.push(item);
        }
    }
}

console.log('Running npm run lint...');
const lintRes = execWithStatus('npm run lint');
const lintStatus = lintRes.code === 0 ? 'SUCCESS' : 'FAILED';
const lintOutput = lintRes.output;

console.log('Running npm run build...');
const buildRes = execWithStatus('npm run build');
const buildStatus = buildRes.code === 0 ? 'SUCCESS' : 'FAILED';
const buildOutput = buildRes.output;

let dbDoctorStatus = 'SKIPPED (No DB Password)';
let dbDoctorOutput = '';
if (process.env.SUPABASE_DB_PASSWORD || (envLocalExists && fs.readFileSync(envLocalPath, 'utf8').includes('SUPABASE_DB_PASSWORD'))) {
    console.log('Running npm run db:doctor...');
    const dbRes = execWithStatus('npm run db:doctor');
    dbDoctorStatus = dbRes.code === 0 ? 'SUCCESS' : 'FAILED';
    dbDoctorOutput = dbRes.output;
}

console.log('Checking /api/health...');
let apiHealthStatus = 'FAIL';
try {
    const res = await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(1500) });
    if (res.ok) apiHealthStatus = 'OK';
} catch (e) {
    if (e.cause?.code === 'ECONNREFUSED' || e.name === 'TimeoutError') {
        apiHealthStatus = 'SKIPPED (server not running)';
    }
}

const reportContent = `# VRNP STATUS REPORT
Gerado em: ${now}

## Ambiente
- Node Version: ${nodeVersionStr}${nodeWarn}
- Git Branch: ${gitBranch}
- Git Commit: ${gitCommit}
- .env.local: ${envLocalStatus}
- Supabase Env Vars: ${supabaseEnvStatus}
- /api/health Local: ${apiHealthStatus}
- ESLint Version: ${eslintVersion}

## Últimos 5 Commits
${recentCommits.split('\n').join('\n')}

## Rotas Dinâmicas (app/page.tsx)
${appRoutes.length > 0 ? appRoutes.map(r => `- ${r}`).join('\n') : '- Nenhuma rota encontrada'}

## Rotas de Backend (app/api/)
${apiRoutes.length > 0 ? apiRoutes.map(r => `- ${r}`).join('\n') : '- Nenhuma rota encontada'}
## Componentes Compartilhados (components/)
- RatingModal.tsx

## Hooks (hooks/)
- useDeviceId.ts

## Supabase Migrations
${migrations.length > 0 ? migrations.map(m => `- ${m}`).join('\n') : '- Nenhuma migration encontrada'}

## Supabase Remote (Status)
- SUPABASE_PROJECT_REF: ${supabaseRemoteStatus.ref}
- SUPABASE_ACCESS_TOKEN: ${supabaseRemoteStatus.token}
*(Run \`npm run supabase:check\` to validate the token against the Supabase CLI)*

## Scripts
- npm run lint: ${lintStatus}
- npm run build: ${buildStatus}
- npm run db:doctor: ${dbDoctorStatus}

${dbDoctorStatus !== 'SKIPPED (No DB Password)' ? `### DB Doctor Output
\`\`\`text
${dbDoctorOutput}
\`\`\`` : ''}

${isSnapshot || lintStatus === 'FAILED' ? `### Resumo Lint
\`\`\`text
${lintOutput.split('\n').slice(-40).join('\n')}
\`\`\`` : ''}

${isSnapshot || buildStatus === 'FAILED' ? `### Resumo Build
\`\`\`text
${buildOutput.split('\n').slice(-40).join('\n')}
\`\`\`` : ''}

## OPS (Windows Automation Workspace)
As rotinas DevOps foram automatizadas para uso sem "touching" manual via PowerShell:
- \`npm run ops:env\`: Prompt seguro das chaves \`.env.local\` ocultas do History.
- \`npm run ops:supabase\`: Valida Tokens remotos e engatilha Link + Push da pasta de migrations.
- \`npm run ops:smoke\`: Realiza o SpinUp do Next.js via background jobs (\`Start-Process\`), testa porta limite e pinga na API REST cURL para ter certeza do estado real do build finalizado.
- \`npm run ops:go\`: Comanda a união das forjas (Auth -> Verifica -> Sobe -> Diag).

## Fluxo de Teste Manual (MVP)
1. Abra a aplicação e acesse a rota \`/no-ponto\`.
2. Permita o uso da Geolocalização no navegador (Status do GPS deve atualizar).
3. Selecione "Ponto Central" e "P200" e clique em **"Cheguei no Ponto"**.
4. Acesse a rota \`/registrar\`.
5. Selecione simulando o ponto atual e clique em **"Ônibus Passou Agora"** ou **"Entrei (Embarquei)"**.
6. O modal de avaliação será aberto. Vote na lotação (de 1 a 5) e clique em **"Avaliar"**.
7. Verifique as tabelas \`stop_events\` e \`bus_ratings\` no projeto do Supabase vinculado para confirmar a inserção do \`device_id\` e dados.
`;

fs.writeFileSync(outputPath, reportContent);
console.log(`Report generated successfully at ${outputPath}`);
