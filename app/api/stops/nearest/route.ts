import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const latStr = searchParams.get('lat');
        const lngStr = searchParams.get('lng');
        const limStr = searchParams.get('lim') || '3';

        if (!latStr || !lngStr) {
            return NextResponse.json({ error: 'Latitude (lat) e Longitude (lng) são obrigatórios' }, { status: 400 });
        }

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        const lim = parseInt(limStr, 10);

        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
        }

        const supabase = await createClient();

        // Call the PostGIS RPC function created in migration 0006
        const { data: stops, error } = await supabase.rpc('rpc_nearest_stops', {
            lat: lat,
            lng: lng,
            lim: lim
        });

        if (error) {
            console.error('RPC Error:', error);
            throw error;
        }

        return NextResponse.json({ stops: stops || [] });
    } catch (error: unknown) {
        console.error('API /stops/nearest:', error);
        const errMessage = error instanceof Error ? error.message : 'Erro interno';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
