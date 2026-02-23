import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function extractLineCodeFromFileName(fileName: string): string | null {
    const upper = fileName.toUpperCase();
    const named = upper.match(/LINHA[\s_-]*([0-9]{2,3}[A-Z]?)/);
    if (named) return named[1];
    const generic = upper.match(/\b([0-9]{2,3}[A-Z]?)\b/);
    return generic ? generic[1] : null;
}

function normalizeLineCode(value: string): string {
    return value
        .toUpperCase()
        .replace(/^LINHA[\s_-]*/i, '')
        .replace(/\s+/g, '')
        .trim();
}

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const adminToken = searchParams.get('t');

        if (adminToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({
                error: 'Ambiente Misconfigurado: Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY na Vercel.'
            }, { status: 500 });
        }

        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
        const results = [];

        for (const file of files) {
            const fileName = file.name;
            const buffer = Buffer.from(await file.arrayBuffer());

            const detectedLineCode = extractLineCodeFromFileName(fileName);
            const lineCode = detectedLineCode ? normalizeLineCode(detectedLineCode) : null;
            const normalizedValidFrom = new Date().toISOString().slice(0, 10);

            if (!lineCode) {
                results.push({ fileName, status: 'ERROR', error: 'Código da linha não encontrado no PDF nem no nome do arquivo' });
                continue;
            }

            const { data: lineByCode, error: lineErr } = await supabase
                .from('lines')
                .select('id, code')
                .eq('code', lineCode)
                .limit(1)
                .maybeSingle();

            if (lineErr) {
                results.push({
                    fileName,
                    lineCode,
                    status: 'ERROR',
                    error: `Falha ao consultar linha ${lineCode}: ${lineErr.message || 'erro desconhecido'}`
                });
                continue;
            }

            let line = lineByCode;

            if (!line) {
                const { data: createdLine, error: createLineErr } = await supabase
                    .from('lines')
                    .insert({
                        code: lineCode,
                        name: `Linha ${lineCode}`,
                        is_active: true
                    })
                    .select('id, code')
                    .single();

                if (createLineErr || !createdLine) {
                    results.push({
                        fileName,
                        lineCode,
                        status: 'ERROR',
                        error: `Falha ao criar linha ${lineCode}: ${createLineErr?.message || 'erro desconhecido'}`
                    });
                    continue;
                }

                line = createdLine;
            }

            let { data: variant } = await supabase
                .from('line_variants')
                .select('id')
                .eq('line_id', line.id)
                .limit(1)
                .single();

            if (!variant) {
                const { data: newVariant } = await supabase
                    .from('line_variants')
                    .insert({ line_id: line.id, name: 'Principal', direction: 'circular' })
                    .select('id')
                    .single();
                variant = newVariant;
            }

            if (!variant) {
                results.push({ fileName, lineCode, status: 'ERROR', error: 'Falha ao encontrar ou criar variante da linha' });
                continue;
            }

            const storagePath = `batch/${lineCode}_${Date.now()}.pdf`;
            const { error: uploadErr } = await supabase.storage
                .from('official')
                .upload(storagePath, buffer, { contentType: 'application/pdf' });

            if (uploadErr) {
                results.push({ fileName, lineCode, status: 'ERROR', error: 'Falha no upload para o Storage' });
                continue;
            }

            const { data: schedule, error: schedErr } = await supabase
                .from('official_schedules')
                .insert({
                    line_variant_id: variant.id,
                    valid_from: normalizedValidFrom,
                    pdf_path: storagePath,
                    title: `Tabela ${lineCode} (Upload Automático)`
                })
                .select('id')
                .single();

            if (schedErr || !schedule) {
                results.push({ fileName, lineCode, status: 'ERROR', error: 'Falha ao registrar documento no banco' });
                continue;
            }

            const parseResult = {
                status: 'WARN',
                meta: {
                    timesFound: 0,
                    daySectionsFound: 0,
                    errors: ['Parser temporariamente desativado no upload em lote (fallback operacional).'],
                    lineCode,
                    validFrom: normalizedValidFrom
                }
            };

            await supabase.from('official_schedule_parse_runs').insert({
                schedule_id: schedule.id,
                status: parseResult.status,
                parser_version: 'v1.2.0-batch-v2',
                meta: parseResult.meta
            });

            results.push({
                fileName,
                lineCode,
                status: 'OK',
                scheduleId: schedule.id,
                parseStatus: parseResult.status,
                tripsCount: 0
            });
        }

        return NextResponse.json({ results });
    } catch (err: unknown) {
        console.error('Batch Upload V2 Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
