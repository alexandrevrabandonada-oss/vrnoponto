import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prohibited terms array (regex strings or exact terms)
const PROHIBITED_TERMS = [
    'Wait P50',
    'Amostras \\(30d\\)',
    'Amostras',
    'CRIT',
    'WARN'
];

// Directories to scan (Gradual migration: start with core dashboards)
const DIRECTORIES_TO_SCAN = [
    path.join(__dirname, '../app/boletim'),
    path.join(__dirname, '../app/bairros'),
    path.join(__dirname, '../app/bairro')
];

let hasErrors = false;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDirectory(filePath);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            // Ignore the dictionary file itself to allow dictionary definitions
            if (filePath.includes('lib\\copy.ts') || filePath.includes('lib/copy.ts')) {
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            let lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (const term of PROHIBITED_TERMS) {
                    const regex = new RegExp(`\\b${term}\\b`, 'i'); // Case-insensitive exact match
                    // Special case for strings with parenthesis/special chars without boundaries
                    const hasMatch = term.includes('\\')
                        ? new RegExp(term, 'i').test(line)
                        : regex.test(line);
                    if (hasMatch) {
                        // Heuristic to ignore code tokens, catching mostly UI text
                        const isCodeToken =
                            line.includes(`'${term}'`) ||
                            line.includes(`"${term}"`) ||
                            line.includes(`\`${term}\``) ||
                            line.match(new RegExp(`\\.\\s*${term}\\b`, 'i')) || // property access
                            line.match(new RegExp(`\\b${term}\\s*:`, 'i')) || // object key
                            line.match(new RegExp(`\\{\\s*${term}\\s*\\}`, 'i')) || // destructured key
                            line.trim().startsWith('//') || // comment
                            line.trim().startsWith('import ') || // import
                            line.includes(`console.warn`); // edge case for WARN

                        if (!isCodeToken && !line.includes('eslint-disable')) {
                            console.error(`❌ Prohibited UI term "${term.replace(/\\/g, '')}" found in ${filePath} on line ${i + 1}`);
                            console.error(`   > ${line.trim()}`);
                            hasErrors = true;
                        }
                    }
                }
            }
        }
    }
}

console.log("🛡️ Running UI Copy Guard...");

for (const dir of DIRECTORIES_TO_SCAN) {
    if (fs.existsSync(dir)) {
        scanDirectory(dir);
    }
}

if (hasErrors) {
    console.error("\n❌ UI Copy Guard failed. Please use lib/copy.ts dictionary keys `t()` instead of hardcoded internal terms.");
    process.exit(1);
} else {
    console.log("✅ UI Copy Guard passed. No prohibited internal terms found.");
}
