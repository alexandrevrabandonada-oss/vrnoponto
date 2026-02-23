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

        // 1. Basic Counts
        const { count: stopsTotal } = await supabase.from('stops').select('*', { count: 'exact', head: true });

        const { count: stopsSemNome } = await supabase.from('stops')
            .select('*', { count: 'exact', head: true })
            .or('name.is.null,name.eq.Ponto sem nome,name.eq.');

        const { count: stopsSemBairro } = await supabase.from('stops')
            .select('*', { count: 'exact', head: true })
            .or('neighborhood.is.null,neighborhood.eq.');

        // 2. Events Volume
        const date7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const date30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { count: events7d } = await supabase.from('user_events')
            .select('*', { count: 'exact', head: true }).gte('created_at', date7d);

        const { count: events30d } = await supabase.from('user_events')
            .select('*', { count: 'exact', head: true }).gte('created_at', date30d);

        // 3. Trust Average (pct L2 L3 7d)
        // Note: For advanced aggregates, doing it on the client over raw data or a simple RPC is best.
        // As a shortcut, we fetch the samples and do math.
        const { data: samples7d } = await supabase.from('bus_samples')
            .select('trust_level')
            .gte('created_at', date7d);

        let pctL2L3Level = 0;
        if (samples7d && samples7d.length > 0) {
            const highTrust = samples7d.filter(s => s.trust_level >= 2).length;
            pctL2L3Level = Math.round((highTrust / samples7d.length) * 100);
        }

        // 4. Top 20 Stops (30d) needing mapping / attention
        // Using existing materialized/dynamic view 'vw_stop_rankings_30d' if possible, or basic stats.
        // Since we want raw metrics grouped by stops, we'll fetch from bus_samples.
        let topStops;
        try {
            const res = await supabase.rpc('rpc_top_stops_quality_30d');
            topStops = res.data;
        } catch {
            topStops = null;
        }
        // fallback if RPC doesn't exist

        let top20Stops = topStops || [];
        if (!topStops || topStops.length === 0) {
            // Expensive fallback, query the VW if rpc fails
            const { data: viewData } = await supabase
                .from('vw_stop_rankings_30d')
                .select('stop_id, stop_code, stop_name, neighborhood, samples_total, pct_verified_avg')
                .order('samples_total', { ascending: false })
                .limit(20);
            top20Stops = viewData || [];
        }

        // 5. Neighborhood Shapes (Geofences) vs Stops (Match missing)
        // Find how many stops lack mapping but shape exists, or shapes mapping no stops
        const { data: shapesCount } = await supabase.from('neighborhood_shapes').select('neighborhood', { count: 'exact' });

        const metrics = {
            stops_total: stopsTotal || 0,
            stops_sem_nome: stopsSemNome || 0,
            stops_sem_bairro: stopsSemBairro || 0,
            eventos_7d: events7d || 0,
            eventos_30d: events30d || 0,
            pct_L2L3_7d: pctL2L3Level,
            shapes_total: shapesCount?.length || 0,
            top_20_stops: top20Stops,
            bairros_carentes: [] // Optional fallback list
        };

        return NextResponse.json(metrics);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Data Quality API Error]', err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
