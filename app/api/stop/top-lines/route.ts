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

        // We query bus_samples and count by line_id, calculating how many are L2/L3 verified
        // We join with lines table to get code and name
        const { data, error } = await supabase
            .from('bus_samples')
            .select(`
                line_id,
                trust_level,
                lines (
                    code,
                    name
                )
            `)
            .eq('stop_id', stopId)
            .gte('recorded_at', dateLimit.toISOString());

        if (error) throw error;

        // Manual aggregation since Supabase client doesn't support complex GROUP BY well in a single call with joins
        const counts: Record<string, { line_id: string, code: string, name: string, count: number, verifiedCount: number }> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((row: any) => {
            const line = row.lines;
            if (!line) return;

            if (!counts[row.line_id]) {
                counts[row.line_id] = {
                    line_id: row.line_id,
                    code: line.code,
                    name: line.name,
                    count: 0,
                    verifiedCount: 0
                };
            }
            counts[row.line_id].count++;
            if (row.trust_level >= 2) {
                counts[row.line_id].verifiedCount++;
            }
        });

        const sortedLines = Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(line => ({
                ...line,
                pctVerified: line.count > 0 ? (line.verifiedCount / line.count) * 100 : 0
            }));

        return NextResponse.json({ lines: sortedLines });

    } catch (error: unknown) {
        console.error('API /stop/top-lines error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
