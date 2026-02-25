import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        const { name, lat, lng } = body;

        if (!name || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Nome, Latitude e Longitude são obrigatórios.' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Dedupe check (15m radius)
        const { data: nearby, error: rpcError } = await supabase.rpc('rpc_nearest_stops', {
            lat: lat,
            lng: lng,
            lim: 1
        });

        if (rpcError) {
            console.error('RPC Error (dedupe):', rpcError);
        }

        const closest = nearby?.[0];
        if (closest && closest.distance_m < 15) {
            return NextResponse.json({
                success: false,
                status: 'DEDUPE',
                message: `Já existe um ponto aqui: ${closest.name || 'Sem nome'}`,
                stop: closest
            });
        }

        // 2. Insert new stop
        const pointWKT = `POINT(${lng} ${lat})`;
        const { data: newStop, error: insertError } = await supabase
            .from('stops')
            .insert({
                name: name.trim(),
                location: pointWKT,
                is_active: true,
                source: 'QUICK_ADD'
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            status: 'CREATED',
            message: 'Ponto cadastrado com sucesso!',
            stop: newStop
        });

    } catch (err: unknown) {
        console.error('API /admin/stops/quick-add:', err);
        const msg = err instanceof Error ? err.message : 'Erro interno ao salvar.';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
