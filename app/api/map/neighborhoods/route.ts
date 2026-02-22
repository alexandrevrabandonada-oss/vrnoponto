import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vw_neighborhood_map_30d')
        .select('*')
        .limit(limit);

    if (error) {
        console.error('Error fetching neighborhood map:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhood map data' }, { status: 500 });
    }

    // Add radius heuristic
    const enriched = (data || []).map((n: { neighborhood: string; centroid_lat: number; centroid_lng: number; avg_delta_min: number; stops_count: number; samples_total: number; pct_verified_avg: number; risk_band: string }) => ({
        ...n,
        lat: n.centroid_lat,
        lng: n.centroid_lng,
        radius_m: Math.min(1000, Math.max(200, 200 + Math.sqrt(n.samples_total) * 40)),
    }));

    return NextResponse.json({ data: enriched });
}
