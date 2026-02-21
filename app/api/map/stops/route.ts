import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        const supabase = await createClient();

        // 1. Busca paradas e métricas de trust em paralelo
        const [
            { data: stops, error: dbError },
            { data: trustMix, error: trustError }
        ] = await Promise.all([
            supabase.from('vw_stop_wait_30d').select('*'),
            supabase.from('vw_trust_mix_stop_30d').select('stop_id, total_events, pct_verified')
        ]);

        if (dbError) throw dbError;

        // Criar um mapa O(1) para lookups de trust mix
        const trustMap = new Map();
        if (trustMix) {
            trustMix.forEach(t => {
                trustMap.set(t.stop_id, {
                    total: t.total_events,
                    pct_verified: t.pct_verified
                });
            });
        }

        // Formatar para o padrão do componente DelayMap
        const formattedStops = stops?.map(s => {
            const trust = trustMap.get(s.stop_id);
            return {
                id: s.stop_id,
                name: s.stop_name,
                location: {
                    lat: s.lat,
                    lng: s.lng
                },
                metrics: s.p50_wait_min !== null ? {
                    p50_wait_min: s.p50_wait_min,
                    p90_wait_min: s.p90_wait_min,
                    samples: s.samples
                } : null,
                trust_mix: trust ? trust : null
            };
        });

        return NextResponse.json({
            generated_at: new Date().toISOString(),
            window_days: parseInt(daysParam),
            stops: formattedStops || []
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
