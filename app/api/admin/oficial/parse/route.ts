import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfSchedule } from '@/lib/official/parsePdfSchedule';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const adminToken = searchParams.get('t');

        if (adminToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { schedule_id } = body;

        if (!schedule_id) {
            return NextResponse.json({ error: 'schedule_id is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch official schedule record
        const { data: schedule, error: fetchErr } = await supabase
            .from('official_schedules')
            .select('*')
            .eq('id', schedule_id)
            .single();

        if (fetchErr || !schedule) {
            return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        if (!schedule.pdf_path) {
            return NextResponse.json({ error: 'Schedule does not have a linked PDF path' }, { status: 400 });
        }

        // 2. Download the PDF from Supabase Storage
        const { data: pdfData, error: dlErr } = await supabase
            .storage
            .from('official')
            .download(schedule.pdf_path);

        if (dlErr || !pdfData) {
            return NextResponse.json({ error: 'Failed to download PDF from storage' }, { status: 500 });
        }

        // 3. Convert blob to buffer and Parse
        const arrayBuffer = await pdfData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const parseResult = await parsePdfSchedule(buffer);

        // 4. Save the run metadata
        const { error: runErr } = await supabase
            .from('official_schedule_parse_runs')
            .insert({
                schedule_id,
                status: parseResult.status,
                parser_version: 'v1.0.0',
                meta: parseResult.meta
            });

        if (runErr) console.error('Failed to save parse run', runErr);

        if (parseResult.status === 'FAIL' || parseResult.hourlyTrips.length === 0) {
            return NextResponse.json({
                message: 'Parsing failed or no trips found.',
                result: parseResult
            });
        }

        // 5. Upsert the hourly rows
        // Wipe old ones first to avoid ghost data
        await supabase.from('official_schedule_hourly').delete().eq('schedule_id', schedule_id);

        const rowsToInsert = parseResult.hourlyTrips.map(t => ({
            schedule_id,
            day_group: t.dayGroup,
            hour: t.hour,
            trips: t.trips,
            promised_headway_min: t.promisedHeadwayMin
        }));

        const { error: upsertErr } = await supabase
            .from('official_schedule_hourly')
            .insert(rowsToInsert);

        if (upsertErr) {
            return NextResponse.json({ error: 'Failed to insert parsed data', details: upsertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Parse successful',
            result: parseResult
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
