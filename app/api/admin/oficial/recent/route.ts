import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ParseRun = {
    status: 'OK' | 'WARN' | 'FAIL';
    parsed_at: string;
    meta?: {
        timesFound?: number;
        daySectionsFound?: number;
        errors?: string[];
    } | null;
};

type ScheduleDoc = {
    id: string;
    line_code: string | null;
    valid_from: string | null;
    pdf_path: string | null;
    created_at: string;
    runs: ParseRun[] | null;
};

function toLimit(value: string | null): number {
    const parsed = Number.parseInt(value || '20', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 20;
    return Math.min(parsed, 100);
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = toLimit(searchParams.get('limit'));

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('official_schedules')
            .select(`
                id,
                line_code,
                valid_from,
                pdf_path,
                created_at,
                runs: official_schedule_parse_runs(status, parsed_at, meta)
            `)
            .eq('doc_type', 'HORARIO')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw error;
        }

        const docs = (data || []) as ScheduleDoc[];
        return NextResponse.json({ data: docs });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
