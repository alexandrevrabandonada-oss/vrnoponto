import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const limit = parseInt(searchParams.get('lim') || '10', 10);

        if (!query || query.length < 2) {
            return NextResponse.json({ stops: [] });
        }

        const supabase = await createClient();

        // Best-effort search: name or neighborhood
        const { data: stops, error } = await supabase
            .from('stops')
            .select('id, name, neighborhood')
            .or(`name.ilike.%${query}%,neighborhood.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(limit);

        if (error) {
            console.error('Search Stops Error:', error);
            throw error;
        }

        return NextResponse.json({ stops: stops || [] });
    } catch (error: unknown) {
        console.error('API /stops/search:', error);
        const errMessage = error instanceof Error ? error.message : 'Erro interno';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
