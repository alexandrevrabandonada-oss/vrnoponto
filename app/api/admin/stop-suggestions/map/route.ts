import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function checkAdminToken(request: NextRequest): boolean {
    const token = request.nextUrl.searchParams.get('t')
        || request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function GET(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoursStr = request.nextUrl.searchParams.get('hours');
    const minConfStr = request.nextUrl.searchParams.get('minConfirmations');
    const limitStr = request.nextUrl.searchParams.get('limit') || '1000';

    try {
        const supabase = await createClient();

        // Use raw SQL via RPC to extract lat/lng from geography
        // Since we can't use ST_X/ST_Y directly with supabase-js,
        // we query with select and parse geom on the server
        let query = supabase
            .from('stop_suggestions')
            .select('id, name_suggested, confirmations, created_at, geom, notes, neighborhood_text')
            .eq('status', 'PENDING')
            .order('confirmations', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(parseInt(limitStr, 10));

        if (hoursStr) {
            const since = new Date(Date.now() - parseInt(hoursStr, 10) * 60 * 60 * 1000).toISOString();
            query = query.gte('created_at', since);
        }

        if (minConfStr) {
            query = query.gte('confirmations', parseInt(minConfStr, 10));
        }

        const { data, error } = await query;

        if (error) {
            console.error('GET /api/admin/stop-suggestions/map error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform geom to lat/lng
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions = (data || []).map((s: any) => {
            let lat = 0, lng = 0;

            if (typeof s.geom === 'string') {
                const match = s.geom.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            } else if (s.geom && typeof s.geom === 'object') {
                if (s.geom.coordinates && Array.isArray(s.geom.coordinates)) {
                    lng = s.geom.coordinates[0];
                    lat = s.geom.coordinates[1];
                }
            }

            return {
                id: s.id,
                name_suggested: s.name_suggested,
                confirmations: s.confirmations,
                created_at: s.created_at,
                lat,
                lng,
                notes: s.notes,
                neighborhood_text: s.neighborhood_text,
            };
        }).filter((s: { lat: number; lng: number }) => s.lat !== 0 || s.lng !== 0);

        return NextResponse.json({ suggestions });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
