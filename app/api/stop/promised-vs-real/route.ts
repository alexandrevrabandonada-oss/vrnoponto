import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const stopId = searchParams.get('stop_id');
    const dayGroup = searchParams.get('day');

    if (!stopId || !dayGroup) {
        return NextResponse.json({ error: 'Missing stop_id or day' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the Stop vs Real data for this stop and day group
    const { data: stopData, error: stopError } = await supabase
        .from('vw_stopline_promised_vs_real_30d')
        .select('*')
        .eq('stop_id', stopId)
        .eq('day_group', dayGroup)
        .order('hour', { ascending: true });

    if (stopError) {
        console.error('Error fetching stop promised vs real:', stopError);
        return NextResponse.json({ error: 'Failed to fetch stop data' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type HourRow = Record<string, any>;

    // Group by line for easier UI rendering
    const lineGrouped: Record<string, {
        line_code: string;
        line_name: string;
        hours: HourRow[];
        samples_total: number;
        avg_delta: number;
        has_promise: boolean;
        pct_verified_avg: number;
    }> = {};

    // For line metadata
    const lineIds = Array.from(new Set(stopData.map((d: HourRow) => d.line_id)));
    let lineMeta: Record<string, { code: string, name: string }> = {};

    if (lineIds.length > 0) {
        const { data: routeData } = await supabase
            .from('lines')
            .select('id, code, name')
            .in('id', lineIds);

        if (routeData) {
            lineMeta = routeData.reduce((acc: Record<string, { code: string; name: string }>, l: { id: string; code: string; name: string }) => ({ ...acc, [l.id]: { code: l.code, name: l.name } }), {});
        }
    }

    stopData.forEach((d: HourRow) => {
        if (!lineGrouped[d.line_id]) {
            lineGrouped[d.line_id] = {
                line_code: lineMeta[d.line_id]?.code || '?',
                line_name: lineMeta[d.line_id]?.name || 'Unknown',
                hours: [],
                samples_total: 0,
                avg_delta: 0,
                has_promise: false,
                pct_verified_avg: 0
            };
        }

        lineGrouped[d.line_id].hours.push(d);
        lineGrouped[d.line_id].samples_total += (d.samples || 0);
        if (d.meta !== 'NO_PROMISE') lineGrouped[d.line_id].has_promise = true;
    });

    // Calculate averages per line
    Object.keys(lineGrouped).forEach(lid => {
        const g = lineGrouped[lid];
        const validDeltas = g.hours.filter(h => h.delta_min !== null).map(h => h.delta_min);
        if (validDeltas.length > 0) {
            g.avg_delta = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length;
        }

        const validPct = g.hours.filter(h => h.pct_verified !== null);
        if (validPct.length > 0) {
            // Weighted average
            const sumP = validPct.reduce((a, b) => a + (b.pct_verified * (b.samples || 1)), 0);
            g.pct_verified_avg = sumP / g.samples_total;
        }
    });

    return NextResponse.json({ data: Object.values(lineGrouped).sort((a, b) => b.samples_total - a.samples_total) });
}
