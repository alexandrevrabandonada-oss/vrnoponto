import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lineId = searchParams.get('line_id');

        if (!lineId) {
            return NextResponse.json({ error: 'line_id is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Busca dados básicos da linha
        const { data: line, error: lineError } = await supabase
            .from('lines')
            .select(`
                id, 
                code,
                name,
                is_active
            `)
            .eq('id', lineId)
            .single();

        if (lineError || !line) {
            return NextResponse.json({ error: 'Line not found' }, { status: 404 });
        }

        // 2. Busca métricas gerais da linha (Headway) - vamos procurar na weekly se existe
        const { data: metrics } = await supabase
            .from('vw_line_headway_weekly')
            .select('*')
            .eq('line_id', lineId)
            .order('period_start', { ascending: false })
            .limit(1)
            .single();

        // 3. Busca métricas de integridade Trust Mix
        const { data: trustMix } = await supabase
            .from('vw_trust_mix_line_30d')
            .select('total_events, pct_verified')
            .eq('line_id', lineId)
            .single();

        return NextResponse.json({
            line: line,
            metrics: metrics || {
                p50_headway_min: null,
                p90_headway_min: null,
                samples: 0
            },
            trust_mix: trustMix || null
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
