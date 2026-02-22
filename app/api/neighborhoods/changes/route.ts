import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_neighborhood_monthly_change')
        .select('*')
        .order('month_start', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching neighborhoods changes:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhood changes' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
