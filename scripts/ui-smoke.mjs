import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES_TO_TEST = [
    '/',
    '/registrar',
    '/boletim',
    '/mapa',
    '/como-usar',
    '/no-ponto'
];

async function checkRoute(route) {
    return new Promise((resolve) => {
        const url = `${BASE_URL}${route}`;
        const client = url.startsWith('https') ? https : http;

        const req = client.get(url, (res) => {
            const { statusCode } = res;
            // 200 OK or 3xx Redirects are considered successful for a basic smoke test
            const isSuccess = statusCode >= 200 && statusCode < 400;

            // Consume response data to free up memory
            res.resume();

            resolve({
                route,
                statusCode,
                isSuccess
            });
        });

        req.on('error', (e) => {
            resolve({
                route,
                error: e.message,
                isSuccess: false
            });
        });

        // Timeout after 5 seconds
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                route,
                error: 'Timeout',
                isSuccess: false
            });
        });
    });
}

async function runSmokeTest() {
    console.log(`💨 Iniciando Light Smoke Test UI no ${BASE_URL}...`);

    let hasFailures = false;

    for (const route of ROUTES_TO_TEST) {
        process.stdout.write(`Testando ${route.padEnd(15, ' ')} -> `);

        try {
            const result = await checkRoute(route);

            if (result.isSuccess) {
                console.log(`✅ [${result.statusCode}] OK`);
            } else {
                console.log(`❌ [${result.statusCode || 'ERR'}] FALHOU ${result.error ? `- ${result.error}` : ''}`);
                hasFailures = true;
            }
        } catch (err) {
            console.log(`❌ ERRO: ${err.message}`);
            hasFailures = true;
        }
    }

    if (hasFailures) {
        console.error('\n🚫 SMOKE TEST FALHOU: Uma ou mais rotas não retornaram 200/3xx.');
        process.exit(1);
    } else {
        console.log('\n✅ SMOKE TEST PASSOU: Todas as rotas base estão respondendo corretamente.');
        process.exit(0);
    }
}

// Verifica se a porta parece estar aberta antes de começar
const checkPort = http.get(BASE_URL, (res) => {
    res.resume(); // consume
    runSmokeTest();
}).on('error', (e) => {
    if (e.code === 'ECONNREFUSED') {
        console.error(`\n❌ ERRO: Não foi possível conectar a ${BASE_URL}.`);
        console.error('Certifique-se de que o servidor (npm run dev/start) está rodando antes de executar o smoke test.');
        process.exit(1);
    } else {
        runSmokeTest(); // tenta rodar assim mesmo se for outro erro
    }
});

// Aumentando timeout apenas para o check inicial
checkPort.setTimeout(2000, () => {
    checkPort.destroy();
    console.error(`\n❌ TIMEOUT: O servidor em ${BASE_URL} demorou a responder.`);
    process.exit(1);
});
