import fs from 'fs/promises';
import path from 'path';

const PROHIBITED_CLASSES = /\b(bg|text|border|ring|shadow|fill|stroke|to|from|via)-(indigo|blue)-\d{2,3}(?:\/[0-9]+)?\b/g;
const PROHIBITED_HEX = /#(4f46e5|4338ca|e0e7ff|3730a3|6366f1|1e1b4b|312e81|c7d2fe)\b/ig;
const DIRS_TO_CHECK = ['app', 'components'];
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css'];

async function walk(dir) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const file of list) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(await walk(filePath));
        } else if (EXTENSIONS.includes(path.extname(filePath))) {
            results.push(filePath);
        }
    }
    return results;
}

async function run() {
    let found = false;
    console.log('🔍 Executando UI Guardrails...');

    for (const dir of DIRS_TO_CHECK) {
        try {
            const files = await walk(dir);
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const classMatch = line.match(PROHIBITED_CLASSES);
                    const hexMatch = line.match(PROHIBITED_HEX);

                    if (classMatch || hexMatch) {
                        found = true;
                        const issues = [...(classMatch || []), ...(hexMatch || [])].join(', ');
                        console.error(`❌ Regressão visual detectada: ${file}:${i + 1}`);
                        console.error(`   -> Encontrado: ${issues}`);
                    }
                }
            }
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error(`Error reading ${dir}:`, err);
            }
        }
    }

    if (found) {
        console.error('\n🚫 FALHA: Guardrail de UI detectou cores legadas (Indigo/Blue). A regressão foi barrada.');
        process.exit(1);
    } else {
        console.log('✅ UI Guardrails: Nenhuma regressão visual detectada.');
        process.exit(0);
    }
}

run();
