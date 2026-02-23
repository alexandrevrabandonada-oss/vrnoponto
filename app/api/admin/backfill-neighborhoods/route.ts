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
        const supabase = await createClient();

        // Faz o call pro nosso RPC que executa a Geofence ST_Contains(shape, point)
        const { data, error } = await supabase.rpc('rpc_backfill_neighborhoods');

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            updated_count: data?.updated || 0,
            message: data?.updated > 0
                ? `Backfill concluído. ${data.updated} pontos realocados baseados nos Shapes (Polígonos).`
                : 'Backfill rodado. Nenhum ponto (sem bairro) estava dentro de um polígono conhecido.'
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Backfill Error]', err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
