import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_neighborhood_detail_30d')
        .select('*')
        .limit(limit);

    if (error) {
        console.error('Error fetching neighborhoods:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhoods' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
