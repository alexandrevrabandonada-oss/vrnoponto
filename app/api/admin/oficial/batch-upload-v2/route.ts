import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
    detectMetadataFromPdf,
    parsePdfSchedule,
    type ParseRunResult
} from '@/lib/official/parsePdfSchedule';

export const dynamic = 'force-dynamic';

function normalizeValidFrom(value: string | null): string | null {
    if (!value) return null;
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
}

function extractLineCodeFromFileName(fileName: string): string | null {
    const upper = fileName.toUpperCase();
    const named = upper.match(/LINHA[\s_-]*([0-9]{2,3}[A-Z]?)/);
    if (named) return named[1];
    const generic = upper.match(/\b([0-9]{2,3}[A-Z]?)\b/);
    return generic ? generic[1] : null;
}

function fallbackParseResult(message: string, lineCode: string | null, validFrom: string | null): ParseRunResult {
    return {
        status: 'FAIL',
        hourlyTrips: [],
        meta: {
            timesFound: 0,
            daySectionsFound: 0,
            errors: [message],
            lineCode,
            validFrom
        }
    };
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

            let lineCode: string | null = null;
            let validFrom: string | null = null;

            try {
                const detected = await detectMetadataFromPdf(buffer);
                lineCode = detected.lineCode;
                validFrom = detected.validFrom;
            } catch {
                // Fallback below (filename parsing)
            }

            if (!lineCode) {
                lineCode = extractLineCodeFromFileName(fileName);
            }

            const normalizedValidFrom = normalizeValidFrom(validFrom) || new Date().toISOString().slice(0, 10);

            if (!lineCode) {
                results.push({ fileName, status: 'ERROR', error: 'Código da linha não encontrado no PDF nem no nome do arquivo' });
                continue;
            }

            const { data: line, error: lineErr } = await supabase
                .from('lines')
                .select('id, code')
                .eq('code', lineCode)
                .single();

            if (lineErr || !line) {
                results.push({ fileName, lineCode, status: 'ERROR', error: `Linha ${lineCode} não encontrada no sistema` });
                continue;
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

            let parseResult: ParseRunResult;
            try {
                parseResult = await parsePdfSchedule(buffer);
            } catch (err: unknown) {
                const parserError = err instanceof Error ? err.message : String(err);
                parseResult = fallbackParseResult(`Falha no parser: ${parserError}`, lineCode, normalizedValidFrom);
            }

            parseResult.meta.lineCode = parseResult.meta.lineCode || lineCode;
            parseResult.meta.validFrom = parseResult.meta.validFrom || normalizedValidFrom;

            await supabase.from('official_schedule_parse_runs').insert({
                schedule_id: schedule.id,
                status: parseResult.status,
                parser_version: 'v1.2.0-batch-v2',
                meta: parseResult.meta
            });

            if (parseResult.status !== 'FAIL' && parseResult.hourlyTrips.length > 0) {
                const rowsToInsert = parseResult.hourlyTrips.map(t => ({
                    schedule_id: schedule.id,
                    day_group: t.dayGroup,
                    hour: t.hour,
                    trips: t.trips,
                    promised_headway_min: t.promisedHeadwayMin
                }));
                await supabase.from('official_schedule_hourly').insert(rowsToInsert);
            }

            results.push({
                fileName,
                lineCode,
                status: 'OK',
                scheduleId: schedule.id,
                parseStatus: parseResult.status,
                tripsCount: parseResult.meta.timesFound
            });
        }

        return NextResponse.json({ results });
    } catch (err: unknown) {
        console.error('Batch Upload V2 Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
