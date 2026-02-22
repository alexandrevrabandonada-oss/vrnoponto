import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeNeighborhood } from '@/lib/neighborhood/normalize';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const months = parseInt(searchParams.get('months') || '12', 10);

    if (!slug) {
        return NextResponse.json({ error: 'Neighborhood slug/name is required' }, { status: 400 });
    }

    const norm = normalizeNeighborhood(slug);
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_neighborhood_monthly')
        .select('*')
        .eq('neighborhood_norm', norm)
        .order('month_start', { ascending: true })
        .limit(months);

    if (error) {
        console.error('Error fetching neighborhood history:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhood history' }, { status: 500 });
    }

    return NextResponse.json({
        neighborhood: slug,
        norm,
        data
    });
}
