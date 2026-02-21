import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days') || '30';

        const supabase = await createClient();

        // 1. Busca tudo direto da View Refinada que já tem LEFT JOIN e ST_X/ST_Y
        const { data: stops, error: dbError } = await supabase
            .from('vw_stop_wait_30d')
            .select('*');

        if (dbError) throw dbError;

        // Formatar para o padrão do componente DelayMap
        const formattedStops = stops?.map(s => ({
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
            } : null
        }));

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
