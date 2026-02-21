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

const outputPath = path.join(reportsDir, 'VRNP_STATUS.md');

function execSafe(cmd) {
    try {
        return execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
    } catch (e) {
        return `Error: ${e.message}\nOutput: ${e.stdout?.toString() || e.stderr?.toString()}`;
    }
}

const now = new Date().toISOString();
const nodeVersion = process.version;

let gitBranch = execSafe('git rev-parse --abbrev-ref HEAD');
let gitCommit = execSafe('git rev-parse --short HEAD');
if (gitBranch.startsWith('Error')) gitBranch = 'N/A';
if (gitCommit.startsWith('Error')) gitCommit = 'N/A';

const appDir = path.join(rootDir, 'app');
const routes = [];
function scanRoutes(dir, baseRoute = '') {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    let hasPage = false;
    for (const item of items) {
        if (item.isDirectory()) {
            scanRoutes(path.join(dir, item.name), `${baseRoute}/${item.name}`);
        } else if (item.name === 'page.tsx' || item.name === 'page.js') {
            hasPage = true;
        }
    }
    if (hasPage) {
        routes.push(baseRoute === '' ? '/' : baseRoute);
    }
}
scanRoutes(appDir);
routes.sort();

const envLocalPath = path.join(rootDir, '.env.local');
const envLocalExists = fs.existsSync(envLocalPath);
const envLocalStatus = envLocalExists ? 'OK' : 'MISSING';

let supabaseEnvStatus = 'MISSING';
if (envLocalExists) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
    const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (hasUrl && hasKey) supabaseEnvStatus = 'OK';
}

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
const lintResult = execSafe('npm run lint');
const lintStatus = lintResult.includes('Error') ? 'FAILED' : 'SUCCESS';

console.log('Running npm run build...');
const buildResult = execSafe('npm run build');
const buildStatus = buildResult.includes('Error') ? 'FAILED' : 'SUCCESS';

const reportContent = `# VRNP STATUS REPORT
Gerado em: ${now}

## Ambiente
- Node Version: ${nodeVersion}
- Git Branch: ${gitBranch}
- Git Commit: ${gitCommit}
- .env.local: ${envLocalStatus}
- Supabase Env Vars: ${supabaseEnvStatus}

## Rotas Detectadas (app/)
${routes.length > 0 ? routes.map(r => `- ${r}`).join('\n') : '- Nenhuma rota encontrada'}

## Componentes Compartilhados (components/)
- RatingModal.tsx

## Hooks (hooks/)
- useDeviceId.ts

## Supabase Migrations
${migrations.length > 0 ? migrations.map(m => `- ${m}`).join('\n') : '- Nenhuma migration encontrada'}

## Scripts
- npm run lint: ${lintStatus}
- npm run build: ${buildStatus}

### Resumo Lint
\`\`\`text
${lintResult.substring(0, 1000)}${lintResult.length > 1000 ? '\n... (truncado)' : ''}
\`\`\`

### Resumo Build
\`\`\`text
${buildResult.substring(0, 1000)}${buildResult.length > 1000 ? '\n... (truncado)' : ''}
\`\`\`

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
