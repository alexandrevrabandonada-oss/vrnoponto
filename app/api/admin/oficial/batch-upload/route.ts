import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { detectMetadataFromPdf, parsePdfSchedule } from '@/lib/official/parsePdfSchedule';

export const dynamic = 'force-dynamic';

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

            // 1. Detect Metadata
            const { lineCode, validFrom } = await detectMetadataFromPdf(buffer);

            if (!lineCode) {
                results.push({ fileName, status: 'ERROR', error: 'Código da linha não encontrado no PDF' });
                continue;
            }

            // 2. Find Line in DB
            const { data: line, error: lineErr } = await supabase
                .from('lines')
                .select('id, code')
                .eq('code', lineCode)
                .single();

            if (lineErr || !line) {
                results.push({ fileName, lineCode, status: 'ERROR', error: `Linha ${lineCode} não encontrada no sistema` });
                continue;
            }

            // 3. Find/Create Variant (Using 'Principal' as fallback)
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

            // 4. Upload to Storage
            const storagePath = `batch/${lineCode}_${Date.now()}.pdf`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('official')
                .upload(storagePath, buffer, { contentType: 'application/pdf' });

            if (uploadErr) {
                results.push({ fileName, lineCode, status: 'ERROR', error: 'Falha no upload para o Storage' });
                continue;
            }

            // 5. Create Official Schedule Entry
            const { data: schedule, error: schedErr } = await supabase
                .from('official_schedules')
                .insert({
                    line_variant_id: variant.id,
                    valid_from: validFrom || new Date().toISOString().slice(0, 10),
                    pdf_path: storagePath,
                    title: `Tabela ${lineCode} (Upload Automático)`
                })
                .select('id')
                .single();

            if (schedErr || !schedule) {
                results.push({ fileName, lineCode, status: 'ERROR', error: 'Falha ao registrar documento no banco' });
                continue;
            }

            // 6. Full Parse & Save
            const parseResult = await parsePdfSchedule(buffer);

            // Save parse run
            await supabase.from('official_schedule_parse_runs').insert({
                schedule_id: schedule.id,
                status: parseResult.status,
                parser_version: 'v1.1.0-batch',
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
        console.error('Batch Upload Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
