import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function getIdFromUrl(url: string): string | null {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

export async function GET(req: Request) {
    try {
        const lineId = getIdFromUrl(req.url);

        if (!lineId) {
            return NextResponse.json({ error: 'Missing line id' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('vw_trust_mix_line_30d')
            .select('total_events, pct_verified')
            .eq('line_id', lineId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json(data || null);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
