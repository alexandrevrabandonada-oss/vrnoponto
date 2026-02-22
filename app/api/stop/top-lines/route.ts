import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const stopId = searchParams.get('stop_id');
        const days = parseInt(searchParams.get('days') || '30');
        const limit = parseInt(searchParams.get('limit') || '5');

        if (!stopId) {
            return NextResponse.json({ error: 'Missing stop_id' }, { status: 400 });
        }

        const supabase = await createClient();

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        // Aggregate top lines for this stop
        // We query stop_events and count by line_id
        // We join with lines table to get code and name
        const { data, error } = await supabase
            .from('stop_events')
            .select(`
                line_id,
                lines (
                    code,
                    name
                )
            `)
            .eq('stop_id', stopId)
            .gte('occurred_at', dateLimit.toISOString())
            .in('event_type', ['passed_by', 'boarding']);

        if (error) throw error;

        // Manual aggregation since Supabase client doesn't support complex GROUP BY well in a single call with joins
        const counts: Record<string, { line_id: string, code: string, name: string, count: number }> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((row: any) => {
            const line = row.lines;
            if (!line) return;

            if (!counts[row.line_id]) {
                counts[row.line_id] = {
                    line_id: row.line_id,
                    code: line.code,
                    name: line.name,
                    count: 0
                };
            }
            counts[row.line_id].count++;
        });

        const sortedLines = Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return NextResponse.json({ lines: sortedLines });

    } catch (error: unknown) {
        console.error('API /stop/top-lines error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
