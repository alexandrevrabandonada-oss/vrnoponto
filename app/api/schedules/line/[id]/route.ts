import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ScheduleRow = {
    id: string;
    title: string | null;
    valid_from: string | null;
    doc_type: string | null;
    pdf_path: string | null;
    created_at: string;
};

function getIdFromUrl(url: string): string | null {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

function sortSchedules(a: ScheduleRow, b: ScheduleRow) {
    const aValid = a.valid_from ? new Date(a.valid_from).getTime() : 0;
    const bValid = b.valid_from ? new Date(b.valid_from).getTime() : 0;
    if (aValid !== bValid) return bValid - aValid;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function GET(req: Request) {
    try {
        const lineId = getIdFromUrl(req.url);

        if (!lineId) {
            return NextResponse.json({ error: 'Missing line id' }, { status: 400 });
        }

        const supabase = await createClient();
        const selectColumns = 'id, title, valid_from, doc_type, pdf_path, created_at';

        const { data: byLine, error: byLineError } = await supabase
            .from('official_schedules')
            .select(selectColumns)
            .eq('line_id', lineId);

        if (byLineError) {
            throw byLineError;
        }

        const { data: variants, error: variantError } = await supabase
            .from('line_variants')
            .select('id')
            .eq('line_id', lineId);

        if (variantError) {
            throw variantError;
        }

        const variantIds = (variants || []).map(v => v.id);
        let byVariant: ScheduleRow[] = [];

        if (variantIds.length > 0) {
            const { data, error } = await supabase
                .from('official_schedules')
                .select(selectColumns)
                .in('line_variant_id', variantIds);

            if (error) {
                throw error;
            }

            byVariant = data || [];
        }

        const deduped = new Map<string, ScheduleRow>();
        for (const row of [...(byLine || []), ...byVariant]) {
            deduped.set(row.id, row);
        }

        const schedules = Array.from(deduped.values())
            .sort(sortSchedules)
            .map(row => ({
                id: row.id,
                title: row.title,
                valid_from: row.valid_from,
                doc_type: row.doc_type,
                pdf_path: row.pdf_path
            }));

        return NextResponse.json(schedules);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
