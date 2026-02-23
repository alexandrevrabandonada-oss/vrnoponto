import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function checkAdminToken(request: NextRequest): boolean {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = await createClient();

        // 1. stops_total
        const { count: stopsTotal } = await supabase
            .from('stops')
            .select('*', { count: 'exact', head: true });

        // 2. eventos_7d (bus_samples)
        const date7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: events7d } = await supabase
            .from('bus_samples')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', date7d);

        // 3. pct_L2L3_7d
        const { data: samples7d } = await supabase
            .from('bus_samples')
            .select('trust_level')
            .gte('created_at', date7d);

        let pctL2L3Level = 0;
        if (samples7d && samples7d.length > 0) {
            const highTrust = samples7d.filter(s => s.trust_level >= 2).length;
            pctL2L3Level = Math.round((highTrust / samples7d.length) * 100);
        }

        // 4. bairros_eligiveis (>= 2 stops)
        const { data: neighborhoodsData } = await supabase
            .from('stops')
            .select('neighborhood')
            .not('neighborhood', 'is', null)
            .neq('neighborhood', '')
            .neq('neighborhood', 'Desconhecido');

        const neighborCounts: Record<string, number> = {};
        neighborhoodsData?.forEach(s => {
            neighborCounts[s.neighborhood] = (neighborCounts[s.neighborhood] || 0) + 1;
        });

        const eligibleNeighborhoods = Object.values(neighborCounts).filter(count => count >= 2).length;

        const results = {
            checks: {
                stops_total: {
                    value: stopsTotal || 0,
                    target: 200,
                    ok: (stopsTotal || 0) >= 200
                },
                eventos_7d: {
                    value: events7d || 0,
                    target: 300,
                    ok: (events7d || 0) >= 300
                },
                pct_L2L3_7d: {
                    value: pctL2L3Level,
                    target: 30,
                    ok: pctL2L3Level >= 30
                },
                bairros_eligiveis: {
                    value: eligibleNeighborhoods,
                    target: 10,
                    ok: eligibleNeighborhoods >= 10
                }
            },
            ready: (stopsTotal || 0) >= 200 && (events7d || 0) >= 300 && pctL2L3Level >= 30 && eligibleNeighborhoods >= 10
        };

        return NextResponse.json(results);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
