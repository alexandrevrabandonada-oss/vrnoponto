import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeNeighborhood } from '@/lib/neighborhood/normalize';

export async function POST(request: NextRequest) {
    // Auth check
    const token = request.nextUrl.searchParams.get('t') || request.headers.get('x-admin-token');
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken || token !== adminToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Also fetch aliases for TS-side resolution
    const { data: aliases } = await supabase
        .from('neighborhood_aliases')
        .select('alias_norm, canonical_norm');

    const aliasMap = new Map<string, string>();
    if (aliases) {
        for (const a of aliases as { alias_norm: string; canonical_norm: string }[]) {
            aliasMap.set(a.alias_norm, a.canonical_norm);
        }
    }

    function fullNormalize(raw: string | null): string {
        const norm = normalizeNeighborhood(raw);
        return aliasMap.get(norm) || norm;
    }

    // 1. Re-normalize stops
    const { data: stops } = await supabase
        .from('stops')
        .select('id, neighborhood')
        .not('neighborhood', 'is', null);

    let stopsUpdated = 0;
    for (const stop of (stops || []) as { id: string; neighborhood: string }[]) {
        const norm = fullNormalize(stop.neighborhood);
        const { error } = await supabase
            .from('stops')
            .update({ neighborhood_norm: norm })
            .eq('id', stop.id);
        if (!error) stopsUpdated++;
    }

    // 2. Re-normalize partners
    const { data: partners } = await supabase
        .from('partners')
        .select('id, neighborhood')
        .not('neighborhood', 'is', null);

    let partnersUpdated = 0;
    for (const p of (partners || []) as { id: string; neighborhood: string }[]) {
        const norm = fullNormalize(p.neighborhood);
        const { error } = await supabase
            .from('partners')
            .update({ neighborhood_norm: norm })
            .eq('id', p.id);
        if (!error) partnersUpdated++;
    }

    // 3. Re-normalize shapes
    const { data: shapes } = await supabase
        .from('neighborhood_shapes')
        .select('id, neighborhood')
        .not('neighborhood', 'is', null);

    let shapesUpdated = 0;
    for (const s of (shapes || []) as { id: string; neighborhood: string }[]) {
        const norm = fullNormalize(s.neighborhood);
        const { error } = await supabase
            .from('neighborhood_shapes')
            .update({ neighborhood_norm: norm })
            .eq('id', s.id);
        if (!error) shapesUpdated++;
    }

    return NextResponse.json({
        stops_updated: stopsUpdated,
        partners_updated: partnersUpdated,
        shapes_updated: shapesUpdated,
    });
}
