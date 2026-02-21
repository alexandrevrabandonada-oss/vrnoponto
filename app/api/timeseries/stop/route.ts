import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const stopId = searchParams.get('stop_id');
        const weeks = parseInt(searchParams.get('weeks') || '8', 10);

        if (!stopId) return NextResponse.json({ error: 'Missing stop_id' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - (weeks * 7));

        const { data, error } = await supabase
            .from('vw_stop_wait_weekly')
            .select('*')
            .eq('stop_id', stopId)
            .gte('week_start', thresholdDate.toISOString().split('T')[0])
            .order('week_start', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
