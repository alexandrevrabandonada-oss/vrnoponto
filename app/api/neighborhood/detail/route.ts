import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type StopRow = { stop_id: string; stop_name: string; worst_delta_min: number; avg_delta_min: number; samples_total: number; pct_verified_avg: number };
type LineRow = { line_id: string; avg_delta_min: number; samples_total: number; pct_verified_avg: number };

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Neighborhood summary
    const { data: summary } = await supabase
        .from('vw_neighborhood_detail_30d')
        .select('*')
        .eq('neighborhood', name)
        .single();

    // 2. Top stops in neighborhood
    const { data: topStops } = await supabase
        .from('vw_neighborhood_top_stops_30d')
        .select('*')
        .eq('neighborhood', name)
        .order('worst_delta_min', { ascending: false })
        .limit(20);

    // 3. Top lines in neighborhood
    const { data: topLinesRaw } = await supabase
        .from('vw_neighborhood_top_lines_30d')
        .select('*')
        .eq('neighborhood', name)
        .order('avg_delta_min', { ascending: false })
        .limit(10);

    // Enrich lines with code/name
    const lineIds = (topLinesRaw || []).map((l: LineRow) => l.line_id);
    let lineMeta: Record<string, { code: string; name: string }> = {};

    if (lineIds.length > 0) {
        const { data: linesData } = await supabase
            .from('lines')
            .select('id, code, name')
            .in('id', lineIds);
        if (linesData) {
            lineMeta = linesData.reduce((acc: Record<string, { code: string; name: string }>, l: { id: string; code: string; name: string }) => ({ ...acc, [l.id]: { code: l.code, name: l.name } }), {});
        }
    }

    const topLines = (topLinesRaw || []).map((l: LineRow) => ({
        ...l,
        line_code: lineMeta[l.line_id]?.code || '?',
        line_name: lineMeta[l.line_id]?.name || 'Desconhecida',
    }));

    return NextResponse.json({
        summary: summary || { neighborhood: name, avg_delta_min: null, stops_count: 0, samples_total: 0, pct_verified_avg: 0 },
        topStops: (topStops || []) as StopRow[],
        topLines,
    });
}
