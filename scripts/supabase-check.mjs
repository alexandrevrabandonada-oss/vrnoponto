import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega as variáveis se existirem no .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    // Tenta carregar do ambiente atual sem arquivo
    dotenv.config();
}

console.log('--- SUPABASE REMOTE CHECK ---');

let cliLoggedIn = false;
try {
    execSync('npx supabase projects list', { stdio: ['pipe', 'pipe', 'ignore'] });
    cliLoggedIn = true;
} catch {
    cliLoggedIn = false;
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

console.table([
    { Variable: 'Supabase CLI', Status: cliLoggedIn ? 'LOGGED_IN' : 'NOT_LOGGED_IN' },
    { Variable: 'SUPABASE_PROJECT_REF', Status: projectRef ? 'OK' : 'MISSING' },
    { Variable: 'SUPABASE_ACCESS_TOKEN', Status: accessToken ? 'OK' : 'MISSING' },
]);

if (cliLoggedIn) {
    console.log('\\n[✓] Supabase CLI está autenticada. Você pode rodar comandos remotos.');
} else if (!projectRef || !accessToken) {
    console.log('\\n[!] INSTRUÇÕES:');
    console.log('Para conectar ao Supabase remoto (Produção/Staging), você precisa definir estas duas variáveis.\\n');
    console.log('1. SUPABASE_PROJECT_REF: É o ID na URL do seu projeto (ex: rrbpirfqslybhfguxhmp).');
    console.log('2. SUPABASE_ACCESS_TOKEN: Gere no painel do Supabase (Account > Access Tokens).\\n');
    console.log('Como setar temporariamente no terminal (Powershell):');
    console.log('$env:SUPABASE_PROJECT_REF="xyz"');
    console.log('$env:SUPABASE_ACCESS_TOKEN="sbp_..."');
    console.log('\\nOu no Mac/Linux:');
    console.log('export SUPABASE_PROJECT_REF="xyz"');
    console.log('export SUPABASE_ACCESS_TOKEN="sbp_..."');
    console.log('\\nConsulte docs/supabase-remote.md para mais detalhes.');
}

if (!cliLoggedIn && (projectRef && accessToken)) {
    console.log('\\n[!] Variáveis detectadas, mas CLI não parece autenticada com elas.');
}
