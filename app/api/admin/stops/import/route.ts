import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StopRow {
    name: string;
    lat: number;
    lng: number;
    neighborhood?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFeature = { type: string; geometry: any; properties: Record<string, any> };

function parseCSV(text: string): StopRow[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.findIndex(h => h === 'name' || h === 'nome');
    const latIdx = header.findIndex(h => h === 'lat' || h === 'latitude');
    const lngIdx = header.findIndex(h => h === 'lng' || h === 'longitude' || h === 'lon');
    const nhIdx = header.findIndex(h => h === 'neighborhood' || h === 'bairro');

    if (nameIdx === -1 || latIdx === -1 || lngIdx === -1) return [];

    const rows: StopRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const name = cols[nameIdx];
        const lat = parseFloat(cols[latIdx]);
        const lng = parseFloat(cols[lngIdx]);
        if (!name || isNaN(lat) || isNaN(lng)) continue;
        rows.push({
            name,
            lat,
            lng,
            neighborhood: nhIdx >= 0 ? cols[nhIdx] || undefined : undefined,
        });
    }
    return rows;
}

function parseGeoJSON(json: GeoJSONFeature[] | { features: GeoJSONFeature[] }): StopRow[] {
    const features = Array.isArray(json) ? json : json.features || [];
    const rows: StopRow[] = [];

    for (const f of features) {
        if (f.geometry?.type !== 'Point' || !f.geometry?.coordinates) continue;
        const [lng, lat] = f.geometry.coordinates;
        const name = f.properties?.name || f.properties?.nome || f.properties?.Name;
        if (!name || isNaN(lat) || isNaN(lng)) continue;
        rows.push({
            name,
            lat,
            lng,
            neighborhood: f.properties?.neighborhood || f.properties?.bairro || undefined,
        });
    }
    return rows;
}

export async function POST(request: NextRequest) {
    // Auth check
    const token = request.nextUrl.searchParams.get('t')
        || request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');

    if (!token || token !== process.env.ADMIN_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    try {
        const contentType = request.headers.get('content-type') || '';
        let rows: StopRow[] = [];

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            if (!file) {
                return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
            }

            const text = await file.text();
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.csv')) {
                rows = parseCSV(text);
            } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
                const json = JSON.parse(text);
                rows = parseGeoJSON(json);
            } else {
                return NextResponse.json({ error: 'Formato não suportado. Use .csv, .geojson ou .json' }, { status: 400 });
            }
        } else {
            // JSON body
            const body = await request.json();
            if (body.type === 'FeatureCollection' || body.features) {
                rows = parseGeoJSON(body);
            } else if (Array.isArray(body)) {
                rows = parseGeoJSON(body);
            } else {
                return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
            }
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Nenhum ponto válido encontrado no arquivo' }, { status: 400 });
        }

        const supabase = await createClient();
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                // Check proximity: find existing stop within 15m
                const { data: nearby } = await supabase.rpc('rpc_nearest_stops', {
                    lat: row.lat,
                    lng: row.lng,
                    lim: 1,
                });

                const closestStop = nearby?.[0];
                const isNearby = closestStop && closestStop.distance_m < 15;

                if (isNearby) {
                    if (dryRun) {
                        updated++;
                        continue;
                    }

                    // Update name/neighborhood if they are empty
                    const updateFields: Record<string, string> = {};
                    // Always update (admin import takes priority)
                    updateFields.name = row.name;
                    if (row.neighborhood) {
                        updateFields.neighborhood = row.neighborhood;
                    }

                    const { error } = await supabase
                        .from('stops')
                        .update(updateFields)
                        .eq('id', closestStop.id);

                    if (error) {
                        errors.push(`Erro ao atualizar "${row.name}": ${error.message}`);
                    } else {
                        updated++;
                    }
                } else {
                    if (dryRun) {
                        inserted++;
                        continue;
                    }

                    const pointWKT = `POINT(${row.lng} ${row.lat})`;
                    const { error } = await supabase
                        .from('stops')
                        .insert({
                            name: row.name,
                            location: pointWKT,
                            neighborhood: row.neighborhood || null,
                            is_active: true,
                        });

                    if (error) {
                        errors.push(`Erro ao inserir "${row.name}": ${error.message}`);
                    } else {
                        inserted++;
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro';
                errors.push(`Erro processando "${row.name}": ${msg}`);
                skipped++;
            }
        }

        return NextResponse.json({
            dryRun,
            inserted,
            updated,
            skipped,
            total: rows.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        return NextResponse.json({ error: `Erro ao processar import: ${msg}` }, { status: 500 });
    }
}
