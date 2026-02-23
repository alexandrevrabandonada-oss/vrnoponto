import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Get active mutirao
        const { data: mutirao, error } = await supabase
            .from('mutiroes')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error || !mutirao) {
            return NextResponse.json({ active: false });
        }

        // 2. Get today's progress (count bus_samples)
        const today = new Date().toISOString().split('T')[0];
        const { count, error: countError } = await supabase
            .from('bus_samples')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', `${today}T00:00:00Z`);

        if (countError) throw countError;

        return NextResponse.json({
            active: true,
            mutirao,
            progress: count || 0
        });

    } catch (error: unknown) {
        console.error('API /mutirao/active error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
