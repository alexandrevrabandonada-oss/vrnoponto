import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Reusable Admin Auth Helper
 */
function checkAdminToken(request: NextRequest): boolean {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');
    return !!token && token === process.env.ADMIN_TOKEN;
}

export async function POST(request: NextRequest) {
    // 1. Security Check
    if (!checkAdminToken(request)) {
        return NextResponse.json({
            ok: false,
            error: 'Não autorizado. Token admin inválido ou ausente.',
            code: 'UNAUTHORIZED',
            stop: null
        }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, lat, lon, accuracyM, source = 'admin_quickadd' } = body;

        // 2. Validation
        if (!name || lat === undefined || lon === undefined) {
            return NextResponse.json({
                ok: false,
                error: 'Nome, Latitude e Longitude são obrigatórios.',
                code: 'MISSING_FIELDS',
                stop: null
            }, { status: 400 });
        }

        const deviceId = request.headers.get('x-device-id') || null;

        // Use service role client (server-side only) to bypass RLS
        const supabase = await createClient();

        // 3. Deduplicate (15m radius)
        // Reusing existing rpc_nearest_stops
        const { data: nearby, error: rpcError } = await supabase.rpc('rpc_nearest_stops', {
            lat: lat,
            lng: lon,
            lim: 1
        });

        if (rpcError) {
            console.error('[QuickCreate] RPC Error:', rpcError);
        }

        const closest = nearby?.[0];
        if (closest && closest.distance_m < 15) {
            return NextResponse.json({
                ok: true,
                deduped: true,
                message: `Ponto já existe no local: ${closest.name}`,
                stop: {
                    id: closest.id,
                    name: closest.name,
                    code: closest.code,
                    lat: closest.lat,
                    lon: closest.lng
                }
            });
        }

        // 4. Creation
        const pointWKT = `POINT(${lon} ${lat})`;
        const { data: newStop, error: insertError } = await supabase
            .from('stops')
            .insert({
                name: name.trim(),
                location: pointWKT,
                is_active: true,
                source: source,
                created_by_device_id: deviceId,
                gps_accuracy_m: accuracyM
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        // 5. Telemetry (Server-side)
        // We use a silent fetch to our own telemetry endpoint or log it directly
        // For simplicity and adherence to "minimal funnel", we just log it for now
        // or trigger the public telemetry API if needed.
        console.log(`[Telemetry] admin_stop_quickadd_api: ${newStop.id}`);

        return NextResponse.json({
            ok: true,
            created: true,
            message: 'Ponto criado com sucesso!',
            stop: {
                id: newStop.id,
                name: newStop.name,
                code: newStop.code,
                lat: lat,
                lon: lon
            }
        });

    } catch (err: unknown) {
        console.error('[QuickCreate] Error:', err);
        const msg = err instanceof Error ? err.message : 'Erro interno ao processar cadastro.';
        return NextResponse.json({
            ok: false,
            error: msg,
            code: 'SERVER_ERROR',
            stop: null
        }, { status: 500 });
    }
}
