import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory cache to avoid spamming Overpass API
// Key: bbox string, Value: { data: any, expiresAt: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const overpassCache = new Map<string, { data: any, expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function checkAdminToken(request: NextRequest): boolean {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
    if (!checkAdminToken(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { bbox, dryRun = true, limit = 1000 } = body;

        if (!bbox) {
            return NextResponse.json({ error: 'BBox é obrigatório (ex: -22.56,-44.15,-22.47,-44.05)' }, { status: 400 });
        }

        // BBox needs to be [south, west, north, east] for Overpass ideally,
        // Leaflet/OSM usually says: minLat, minLon, maxLat, maxLon
        // Here we just pass the string straight if formatted correctly: "s,w,n,e"

        const now = Date.now();
        const cached = overpassCache.get(bbox);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let elements: any[] = [];

        if (cached && cached.expiresAt > now) {
            elements = cached.data;
            console.log(`[OSM Import] Using cached data for bbox: ${bbox}, ${elements.length} elements`);
        } else {
            console.log(`[OSM Import] Fetching fresh data from Overpass for bbox: ${bbox}`);
            // Overpass query for bus stops (node)
            const query = `
                [out:json][timeout:25];
                node["highway"="bus_stop"](${bbox});
                out body ${limit};
            `;

            const url = 'https://overpass-api.de/api/interpreter';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'VRNoPontoAdmin/1.0'
                    },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: controller.signal
                });

                if (!response.ok) {
                    clearTimeout(timeoutId);
                    const errorText = await response.text();
                    throw new Error(`Overpass API error: ${response.status} - ${errorText.slice(0, 100)}`);
                }

                const data = await response.json();
                elements = data.elements || [];

                // Save to cache
                if (elements.length > 0) {
                    overpassCache.set(bbox, {
                        data: elements,
                        expiresAt: now + CACHE_TTL_MS
                    });
                }
            } catch (err: unknown) {
                clearTimeout(timeoutId);
                const msg = err instanceof Error ? err.message : 'Unknown network error';
                throw new Error(`Falha ao contactar Overpass API: ${msg}`);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        if (elements.length === 0) {
            return NextResponse.json({ error: 'Nenhuma parada encontrada no bounding box (via OSM)' }, { status: 404 });
        }

        // Processing OSM data
        const supabase = await createClient();
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedNodes: any[] = [];

        for (const el of elements) {
            try {
                if (el.type !== 'node' || typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;

                const rawName = el.tags?.name || el.tags?.nome || el.tags?.Name;
                const latRounded = el.lat.toFixed(4);
                const lonRounded = el.lon.toFixed(4);
                const nameStr = rawName ? String(rawName).trim() : `Ponto (${latRounded}/${lonRounded})`; // Fallback

                // Check proximity: find existing stop within 15m
                const { data: nearby } = await supabase.rpc('rpc_nearest_stops', {
                    lat: el.lat,
                    lng: el.lon,
                    lim: 1,
                });

                const closestStop = nearby?.[0];
                const isNearby = closestStop && closestStop.distance_m < 15;

                if (isNearby) {
                    // Stop already exists nearby (update empty fields)
                    if (dryRun) {
                        updated++;
                        continue;
                    }

                    const updateFields: Record<string, string> = {};
                    // Se estivermos atualizando "Ponto sem nome", mas a OSM tem um nome agora, sobrescreve.
                    // Ou se no banco não tem nome, usa o OSM.
                    if (rawName && (!closestStop.name || closestStop.name.toLowerCase().includes('sem nome'))) {
                        updateFields.name = rawName;
                    }

                    if (Object.keys(updateFields).length > 0) {
                        const { error } = await supabase
                            .from('stops')
                            .update(updateFields)
                            .eq('id', closestStop.id);

                        if (error) {
                            errors.push(`Erro ao atualizar OSM node ${el.id}: ${error.message}`);
                        } else {
                            updated++;
                            processedNodes.push({ id: closestStop.id, name: nameStr, lat: el.lat, lon: el.lon, action: 'updated' });
                        }
                    } else {
                        // Nothing to update
                        skipped++;
                        // We also track skipped for drawing on map
                        processedNodes.push({ id: closestStop.id, name: closestStop.name || nameStr, lat: el.lat, lon: el.lon, action: 'skipped' });
                    }
                } else {
                    // New stop
                    if (dryRun) {
                        inserted++;
                        continue;
                    }

                    const pointWKT = `POINT(${el.lon} ${el.lat})`;
                    const { error } = await supabase
                        .from('stops')
                        .insert({
                            name: nameStr,
                            location: pointWKT,
                            is_active: true,
                            source: 'OSM'
                        });

                    if (error) {
                        errors.push(`Erro ao inserir OSM node ${el.id}: ${error.message}`);
                    } else {
                        inserted++;
                        processedNodes.push({ id: el.id, name: nameStr, lat: el.lat, lon: el.lon, action: 'inserted' });
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro';
                errors.push(`Erro processando node ${el.id}: ${msg}`);
                skipped++;
            }
        }

        return NextResponse.json({
            dryRun,
            inserted,
            updated,
            skipped,
            total: elements.length,
            errors: errors.length > 0 ? errors : undefined,
            cacheHit: !!(cached && cached.expiresAt > now),
            nodes: processedNodes
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
