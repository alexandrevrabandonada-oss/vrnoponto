import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { startRun } from '@/lib/systemRuns';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for Vercel Hobby/Pro if allowed

function extractInfoFromFileName(filename: string) {
    // Ex: "linha-155-viacao-elite.pdf", "itinerario-155.pdf"
    filename = filename.toLowerCase().replace('.pdf', '');
    const isItinerario = filename.includes('itiner');
    const docType = isItinerario ? 'ITINERARIO' : 'HORARIO';

    // Regex to find line code (numbers + optional letters like 155, 205A)
    const lineMatch = filename.match(/(?:linha|itinerario).*?-([0-9]{2,3}[a-z]?)(?:-|$)/i);
    const lineCode = lineMatch ? lineMatch[1].toUpperCase() : 'UNKNOWN';

    // Regex to find operator
    let operator = 'DESCONHECIDO';
    if (filename.includes('elite')) operator = 'VIAÇÃO ELITE';
    else if (filename.includes('pinheiral')) operator = 'VIAÇÃO PINHEIRAL';
    else if (filename.includes('sul-fluminense') || filename.includes('sulfluminense')) operator = 'SUL FLUMINENSE';
    else if (filename.includes('sao-joao')) operator = 'VIAÇÃO SÃO JOÃO';
    else if (filename.includes('sindpass')) operator = 'SINDPASS';

    return { docType, lineCode, operator };
}

async function getPdfHash(buffer: ArrayBuffer): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
}

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // Auth check via Headers or Query since it's an API
        const providedToken = req.headers.get('authorization')?.replace('Bearer ', '') || searchParams.get('t');
        if (providedToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: Record<string, unknown> = {};
        try { body = await req.json(); } catch { }

        const dryRun = body.dryRun === true || searchParams.get('dryRun') === 'true';
        const limitRaw = body.limit ?? searchParams.get('limit') ?? '0';
        const limit = parseInt(String(limitRaw), 10);
        const only = body.only || searchParams.get('only');

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const runId = await startRun('sync_official', { dryRun, limit, only });

        const sourceUrl = process.env.OFFICIAL_SOURCE_URL || 'https://www.voltaredonda.rj.gov.br/horario-de-onibus/';

        const response = await fetch(sourceUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch source: ${response.statusText}`);
        }

        const html = await response.text();
        const pdfRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+\.pdf)["']/gi;

        let match;
        const pdfUrls = new Set<string>();

        while ((match = pdfRegex.exec(html)) !== null) {
            let url = match[1];
            if (!url.startsWith('http')) {
                const baseUrl = new URL(sourceUrl);
                url = url.startsWith('/') ? `${baseUrl.origin}${url}` : `${baseUrl.href}/${url}`;
            }
            // Filter strictly
            if (url.includes('voltaredonda.rj.gov.br') && url.includes('horario')) {
                pdfUrls.add(url);
            }
        }

        let candidates = Array.from(pdfUrls).map(url => {
            const filename = url.split('/').pop() || '';
            const info = extractInfoFromFileName(filename);
            return { url, filename, ...info };
        });

        if (only === 'HORARIO' || only === 'ITINERARIO') {
            candidates = candidates.filter(c => c.docType === only);
        }

        if (limit > 0) {
            candidates = candidates.slice(0, limit);
        }

        if (dryRun) {
            return NextResponse.json({
                message: "Dry run concluído.",
                found: candidates.length,
                candidates
            });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const candidate of candidates) {
            try {
                // Check if URL exists first
                const { data: existingUrl } = await supabaseAdmin
                    .from('official_schedules')
                    .select('id')
                    .eq('source_url', candidate.url)
                    .single();

                if (existingUrl) {
                    skipped++;
                    continue;
                }

                // Download
                const pdfRes = await fetch(candidate.url, { signal: AbortSignal.timeout(15000) });
                if (!pdfRes.ok) throw new Error(`Fetch failed: ${pdfRes.statusText}`);

                const buffer = await pdfRes.arrayBuffer();
                if (buffer.byteLength > 10 * 1024 * 1024) throw new Error("PDF excede 10MB limit.");

                const hash = await getPdfHash(buffer);

                // Check Hash
                const { data: existingHash } = await supabaseAdmin
                    .from('official_schedules')
                    .select('id')
                    .eq('source_hash', hash)
                    .single();

                if (existingHash) {
                    skipped++;
                    continue;
                }

                const operatorSafe = candidate.operator.replace(/\s+/g, '-').toLowerCase();
                const storagePath = `sync/${operatorSafe}/${candidate.lineCode}/${candidate.docType}/${hash.substring(0, 8)}.pdf`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('official')
                    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true });

                if (uploadError) throw uploadError;

                // Best-effort regex in raw binary buffer to find dates
                // PDF is binary, but sometimes dates are visible
                const rawString = Buffer.from(buffer).toString('latin1');
                const updateRegex = /atualiza(?:d[oa]|ção).*?(\d{2}\/\d{2}\/\d{4})/i;
                const vigorRegex = /vigor.*?(\d{2}\/\d{2}\/\d{4})/i;

                const metadata: Record<string, string> = {};
                const upMatch = rawString.match(updateRegex);
                const vigMatch = rawString.match(vigorRegex);
                if (upMatch) metadata.data_atualizacao = upMatch[1];
                if (vigMatch) metadata.em_vigor = vigMatch[1];

                const { error: dbError } = await supabaseAdmin
                    .from('official_schedules')
                    .insert({
                        source_url: candidate.url,
                        source_hash: hash,
                        pdf_path: storagePath,
                        doc_type: candidate.docType,
                        operator: candidate.operator,
                        line_code: candidate.lineCode,
                        meta: metadata,
                        title: `[Sync] ${candidate.docType} Linha ${candidate.lineCode}`
                    });

                if (dbError) throw dbError;
                imported++;

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Erro em ${candidate.filename}: ${msg}`);
            }
        }

        return NextResponse.json({
            found: candidates.length,
            imported,
            skipped,
            errors
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';

        // At this point we can't reliably read runId easily if it crashed before assignment, 
        // but let's assume if it fails here we rely on the internal silent tracker timeout

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
