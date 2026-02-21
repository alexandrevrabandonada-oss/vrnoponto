import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lineId = searchParams.get('line_id');
        const dayGroup = searchParams.get('day') || 'WEEKDAY'; // WEEKDAY | SAT | SUN

        if (!lineId) {
            return NextResponse.json({ error: 'line_id is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Busca os dados da view unificada
        const { data: gaps, error } = await supabase
            .from('vw_line_promised_vs_real_30d')
            .select('*')
            .eq('line_id', lineId)
            .eq('day_group', dayGroup)
            .order('hour', { ascending: true });

        if (error) {
            throw error;
        }

        // 2. Busca o nome da linha para context (opcional, mas util)
        const { data: line } = await supabase
            .from('lines')
            .select('code, name')
            .eq('id', lineId)
            .single();

        return NextResponse.json({
            line: line || null,
            day_group: dayGroup,
            window_days: 30,
            hourly_gaps: gaps || []
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
