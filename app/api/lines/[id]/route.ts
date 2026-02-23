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
            .from('lines')
            .select('id, code, name, is_active')
            .eq('id', lineId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json({ error: 'Line not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
