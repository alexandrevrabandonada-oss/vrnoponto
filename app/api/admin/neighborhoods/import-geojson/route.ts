import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFeature = { type: string; geometry: any; properties: Record<string, any> };
type GeoJSONCollection = { type: string; features: GeoJSONFeature[] };

function normalizeNeighborhoodName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
}

function geometryToWKT(geometry: GeoJSONFeature['geometry']): string | null {
    if (!geometry || !geometry.coordinates) return null;

    const type = geometry.type;

    if (type === 'Polygon') {
        const rings = geometry.coordinates.map((ring: number[][]) =>
            '(' + ring.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ') + ')'
        ).join(', ');
        return `SRID=4326;MULTIPOLYGON((${rings}))`;
    }

    if (type === 'MultiPolygon') {
        const polys = geometry.coordinates.map((poly: number[][][]) => {
            const rings = poly.map((ring: number[][]) =>
                '(' + ring.map((c: number[]) => `${c[0]} ${c[1]}`).join(', ') + ')'
            ).join(', ');
            return `(${rings})`;
        }).join(', ');
        return `SRID=4326;MULTIPOLYGON(${polys})`;
    }

    return null;
}

export async function POST(request: NextRequest) {
    // Auth check
    const token = request.nextUrl.searchParams.get('t') || request.headers.get('x-admin-token');
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken || token !== adminToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const nameField = (request.nextUrl.searchParams.get('nameField') || 'name').split('|');
        const source = request.nextUrl.searchParams.get('source') || 'manual_upload';

        const geojson = body as GeoJSONCollection;
        if (!geojson.features || !Array.isArray(geojson.features)) {
            return NextResponse.json({ error: 'Invalid GeoJSON: missing features array' }, { status: 400 });
        }

        const supabase = await createClient();
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const feature of geojson.features) {
            // Extract neighborhood name from properties using configured fields
            let name: string | null = null;
            for (const field of nameField) {
                const val = feature.properties?.[field.trim()];
                if (val) { name = String(val); break; }
            }

            if (!name) {
                skipped++;
                errors.push(`Feature skipped: no name found in fields [${nameField.join(', ')}]`);
                continue;
            }

            const normalized = normalizeNeighborhoodName(name);
            const wkt = geometryToWKT(feature.geometry);

            if (!wkt) {
                skipped++;
                errors.push(`Feature "${normalized}" skipped: unsupported geometry type "${feature.geometry?.type}"`);
                continue;
            }

            // Check if exists
            const { data: existing } = await supabase
                .from('neighborhood_shapes')
                .select('id')
                .eq('neighborhood', normalized)
                .single();

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('neighborhood_shapes')
                    .update({
                        geom: wkt,
                        source,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('neighborhood', normalized);

                if (error) {
                    errors.push(`Error updating "${normalized}": ${error.message}`);
                } else {
                    updated++;
                }
            } else {
                // Insert
                const { error } = await supabase
                    .from('neighborhood_shapes')
                    .insert({
                        neighborhood: normalized,
                        geom: wkt,
                        source,
                    });

                if (error) {
                    errors.push(`Error inserting "${normalized}": ${error.message}`);
                } else {
                    imported++;
                }
            }
        }

        return NextResponse.json({
            imported,
            updated,
            skipped,
            total: geojson.features.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `Failed to process GeoJSON: ${msg}` }, { status: 500 });
    }
}
