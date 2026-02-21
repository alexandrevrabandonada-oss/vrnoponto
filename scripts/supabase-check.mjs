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

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

console.table([
    { Variable: 'SUPABASE_PROJECT_REF', Status: projectRef ? 'OK' : 'MISSING' },
    { Variable: 'SUPABASE_ACCESS_TOKEN', Status: accessToken ? 'OK' : 'MISSING' },
]);

if (!projectRef || !accessToken) {
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
} else {
    console.log('\\n[✓] Variáveis detectadas. Validando com a CLI...\\n');
    try {
        // Tenta listar projetos para validar o token. Omitimos stderr para não printar erro feio se der auth fail.
        execSync('npx supabase projects list', { stdio: ['pipe', 'pipe', 'ignore'] });
        console.log('[✓] Conexão com a nuvem do Supabase validada com sucesso!');
        console.log('Você já pode rodar: npm run supabase:link && npm run supabase:push');
    } catch (err) {
        console.log('[!] O Token existe, mas a autenticação falhou. O Token pode estar inválido ou expirado.');
    }
}
