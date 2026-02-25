import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // Fetch all active stops
        const { data: stops, error } = await supabase
            .from('stops')
            .select(`
                id,
                name,
                neighborhood,
                location
            `)
            .eq('is_active', true);

        if (error) {
            console.error('Fetch Stops Error:', error);
            throw error;
        }

        // PostGIS geography (POINT) is returned as a string like "POINT(-44.095 -22.518)"
        // or directly as GeoJSON coordinates if specified in select.
        // In our case, Supabase usually returns it as a string or object depending on configuration.
        // We'll normalize it here.
        const formattedStops = stops.map(s => {
            let lat = 0;
            let lng = 0;

            if (typeof s.location === 'string') {
                // Handle WKT format: POINT(lng lat)
                const coords = s.location.match(/\((.*)\)/)?.[1].split(' ');
                if (coords) {
                    lng = parseFloat(coords[0]);
                    lat = parseFloat(coords[1]);
                }
            } else if (s.location && s.location.coordinates) {
                // Handle GeoJSON format
                lng = s.location.coordinates[0];
                lat = s.location.coordinates[1];
            }

            return {
                id: s.id,
                name: s.name,
                neighborhood: s.neighborhood,
                lat,
                lng
            };
        });

        return NextResponse.json({ stops: formattedStops });
    } catch (error: unknown) {
        console.error('API /stops/all:', error);
        const errMessage = error instanceof Error ? error.message : 'Erro interno';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
