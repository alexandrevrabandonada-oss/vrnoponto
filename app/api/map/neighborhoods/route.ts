import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapRow = Record<string, any>;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const polygons = searchParams.get('polygons') === 'true';

    const supabase = await createClient();

    if (polygons) {
        // Try to fetch polygon data
        const { data: polyData, error: polyError } = await supabase
            .from('vw_neighborhood_polygon_metrics_30d')
            .select('*')
            .limit(limit);

        if (!polyError && polyData && polyData.length > 0) {
            const features = polyData.map((row: MapRow) => ({
                type: 'Feature' as const,
                geometry: row.geojson,
                properties: {
                    neighborhood: row.neighborhood,
                    avg_delta_min: row.avg_delta_min,
                    stops_count: row.stops_count,
                    samples_total: row.samples_total,
                    pct_verified_avg: row.pct_verified_avg,
                    risk_band: row.risk_band,
                },
            }));

            return NextResponse.json({
                type: 'polygons',
                geojson: { type: 'FeatureCollection', features },
            });
        }
        // Fallback to circles if no polygons
    }

    // Circle mode (default or fallback)
    const { data, error } = await supabase
        .from('vw_neighborhood_map_30d')
        .select('*')
        .limit(limit);

    if (error) {
        console.error('Error fetching neighborhood map:', error);
        return NextResponse.json({ error: 'Failed to fetch neighborhood map data' }, { status: 500 });
    }

    const enriched = (data || []).map((n: MapRow) => ({
        ...n,
        lat: n.centroid_lat,
        lng: n.centroid_lng,
        radius_m: Math.min(1000, Math.max(200, 200 + Math.sqrt(n.samples_total) * 40)),
    }));

    return NextResponse.json({ type: 'circles', data: enriched });
}
