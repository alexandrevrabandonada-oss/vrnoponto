import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { detectMetadataFromPdf, parsePdfSchedule, type ParseRunResult } from '@/lib/official/parsePdfSchedule';

export const dynamic = 'force-dynamic';

type BatchResult = {
    fileName: string;
    lineCode?: string;
    status: 'OK' | 'ERROR';
    error?: string;
    scheduleId?: string;
    parseStatus?: 'OK' | 'WARN' | 'FAIL';
    tripsCount?: number;
};

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

function normalizeValidFrom(value: string | null): string | null {
    if (!value) return null;
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
}

function fallbackParseResult(message: string, lineCode: string, validFrom: string): ParseRunResult {
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
                error: 'Ambiente Misconfigurado: Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.'
            }, { status: 500 });
        }

        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
        const results: BatchResult[] = [];

        for (const file of files) {
            const fileName = file.name;
            const buffer = Buffer.from(await file.arrayBuffer());

            let detectedLineCode: string | null = null;
            let detectedValidFrom: string | null = null;
            try {
                const metadata = await detectMetadataFromPdf(buffer);
                detectedLineCode = metadata.lineCode;
                detectedValidFrom = metadata.validFrom;
            } catch {
                // fallback below
            }

            const rawLineCode = detectedLineCode || extractLineCodeFromFileName(fileName);
            const lineCode = rawLineCode ? normalizeLineCode(rawLineCode) : null;
            const validFrom = normalizeValidFrom(detectedValidFrom) || new Date().toISOString().slice(0, 10);

            if (!lineCode) {
                results.push({
                    fileName,
                    status: 'ERROR',
                    error: 'Código da linha não encontrado no PDF nem no nome do arquivo.'
                });
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
                    .insert({
                        line_id: line.id,
                        name: 'Principal',
                        direction: 'circular'
                    })
                    .select('id')
                    .single();
                variant = newVariant;
            }

            if (!variant) {
                results.push({
                    fileName,
                    lineCode,
                    status: 'ERROR',
                    error: 'Falha ao encontrar ou criar variante da linha.'
                });
                continue;
            }

            const storagePath = `batch/${lineCode}_${Date.now()}.pdf`;
            const { error: uploadErr } = await supabase.storage
                .from('official')
                .upload(storagePath, buffer, { contentType: 'application/pdf' });

            if (uploadErr) {
                results.push({
                    fileName,
                    lineCode,
                    status: 'ERROR',
                    error: `Falha no upload para Storage: ${uploadErr.message || 'erro desconhecido'}`
                });
                continue;
            }

            const { data: schedule, error: schedErr } = await supabase
                .from('official_schedules')
                .insert({
                    line_variant_id: variant.id,
                    line_id: line.id,
                    line_code: lineCode,
                    doc_type: 'HORARIO',
                    valid_from: validFrom,
                    pdf_path: storagePath,
                    title: `Tabela ${lineCode} (Upload Automático)`
                })
                .select('id')
                .single();

            if (schedErr || !schedule) {
                results.push({
                    fileName,
                    lineCode,
                    status: 'ERROR',
                    error: `Falha ao registrar documento no banco: ${schedErr?.message || 'erro desconhecido'}`
                });
                continue;
            }

            let parseResult: ParseRunResult;
            try {
                parseResult = await parsePdfSchedule(buffer);
            } catch (err: unknown) {
                parseResult = fallbackParseResult(
                    `Falha no parser: ${err instanceof Error ? err.message : String(err)}`,
                    lineCode,
                    validFrom
                );
            }

            await supabase.from('official_schedule_parse_runs').insert({
                schedule_id: schedule.id,
                status: parseResult.status,
                parser_version: 'v1.3.0-batch-v2',
                meta: parseResult.meta
            });

            let insertedTrips = 0;
            if (parseResult.hourlyTrips.length > 0) {
                const rowsToInsert = parseResult.hourlyTrips.map(t => ({
                    schedule_id: schedule.id,
                    day_group: t.dayGroup,
                    hour: t.hour,
                    trips: t.trips,
                    promised_headway_min: t.promisedHeadwayMin
                }));

                const { error: hourlyErr } = await supabase
                    .from('official_schedule_hourly')
                    .insert(rowsToInsert);

                if (hourlyErr) {
                    results.push({
                        fileName,
                        lineCode,
                        status: 'ERROR',
                        scheduleId: schedule.id,
                        error: `Documento salvo, mas falha ao gravar horários: ${hourlyErr.message || 'erro desconhecido'}`
                    });
                    continue;
                }

                insertedTrips = rowsToInsert.length;
            }

            if (insertedTrips === 0) {
                results.push({
                    fileName,
                    lineCode,
                    status: 'ERROR',
                    scheduleId: schedule.id,
                    parseStatus: parseResult.status,
                    error: 'Documento salvo, mas nenhum horário foi extraído deste PDF.'
                });
                continue;
            }

            results.push({
                fileName,
                lineCode,
                status: 'OK',
                scheduleId: schedule.id,
                parseStatus: parseResult.status,
                tripsCount: insertedTrips
            });
        }

        return NextResponse.json({ results });
    } catch (err: unknown) {
        console.error('Batch Upload V2 Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
