import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const stopId = searchParams.get('stop_id');

        if (!stopId) {
            return NextResponse.json({ error: 'stop_id is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Busca dados básicos do ponto
        const { data: stop, error: stopError } = await supabase
            .from('stops')
            .select(`
                id, 
                name, 
                is_active
            `)
            .eq('id', stopId)
            .single();

        if (stopError || !stop) {
            return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
        }

        // 2. Busca métricas gerais do ponto (30d + trend 7d)
        const { data: metrics } = await supabase
            .from('vw_point_detail_30d')
            .select('*')
            .eq('stop_id', stopId)
            .single();

        // 3. Busca métricas por linha no ponto
        const { data: lines } = await supabase
            .from('vw_point_lines_30d')
            .select('*')
            .eq('stop_id', stopId)
            .order('samples', { ascending: false });

        // 4. Busca métricas de integridade Trust Mix (novo)
        const { data: trustMix } = await supabase
            .from('vw_trust_mix_stop_30d')
            .select('total_events, pct_verified')
            .eq('stop_id', stopId)
            .single();

        return NextResponse.json({
            stop: {
                ...stop,
                neighborhood: 'Vila Rica' // No MVP ainda não temos bairro na tabela, usamos placeholder ou extraímos do nome
            },
            metrics: metrics || {
                p50_wait_min: null,
                p90_wait_min: null,
                samples: 0,
                delta_7d_pct: null
            },
            trust_mix: trustMix || null,
            lines: lines || []
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
