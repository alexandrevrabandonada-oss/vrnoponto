import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12', 10);
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_neighborhood_monthly')
        .select('*')
        .order('month_start', { ascending: false })
        .order('avg_delta_min', { ascending: false })
        .limit(limit * months);

    if (error) {
        console.error('Error fetching neighborhoods history:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhood history' }, { status: 500 });
    }

    // Group by neighborhood for easier consumption if needed, 
    // but the flat list is also fine for some charts.
    return NextResponse.json({ data });
}
