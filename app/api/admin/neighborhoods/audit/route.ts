import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    // Auth check
    const token = request.nextUrl.searchParams.get('t') || request.headers.get('x-admin-token');
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken || token !== adminToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Distinct normalized neighborhoods in stops
    const { data: stopNeighborhoods } = await supabase
        .from('stops')
        .select('neighborhood_norm')
        .not('neighborhood_norm', 'is', null);

    const stopNorms = new Set(
        (stopNeighborhoods || [])
            .map((s: { neighborhood_norm: string | null }) => s.neighborhood_norm)
            .filter(Boolean)
    );

    // 2. Distinct normalized neighborhoods in shapes
    const { data: shapeNeighborhoods } = await supabase
        .from('neighborhood_shapes')
        .select('neighborhood, neighborhood_norm');

    const shapeNorms = new Set(
        (shapeNeighborhoods || [])
            .map((s: { neighborhood_norm: string | null }) => s.neighborhood_norm)
            .filter(Boolean)
    );

    // 3. Calculate matches
    const matched = new Set<string>();
    const unmatchedStops: string[] = [];
    const unmatchedShapes: string[] = [];

    for (const norm of stopNorms) {
        if (shapeNorms.has(norm)) {
            matched.add(norm as string);
        } else {
            unmatchedStops.push(norm as string);
        }
    }

    for (const norm of shapeNorms) {
        if (!stopNorms.has(norm)) {
            unmatchedShapes.push(norm as string);
        }
    }

    const totalStops = stopNorms.size;
    const totalShapes = shapeNorms.size;
    const matchedCount = matched.size;
    const matchRatePct = totalStops > 0
        ? Math.round((matchedCount / totalStops) * 1000) / 10
        : 0;

    return NextResponse.json({
        total_stop_neighborhoods: totalStops,
        total_shape_neighborhoods: totalShapes,
        matched_count: matchedCount,
        match_rate_pct: matchRatePct,
        unmatched_stops: unmatchedStops.sort().slice(0, 50),
        unmatched_shapes: unmatchedShapes.sort().slice(0, 50),
    });
}
