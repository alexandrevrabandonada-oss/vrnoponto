import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_worst_stops_30d')
        .select('*')
        .limit(limit);

    if (error) {
        console.error('Error fetching worst stops:', error);
        return NextResponse.json({ error: 'Failed to fetch worst stops' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
