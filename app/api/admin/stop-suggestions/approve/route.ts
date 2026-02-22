import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('t')
        || request.headers.get('authorization')?.replace('Bearer ', '')
        || request.headers.get('x-admin-token');

    if (!token || token !== process.env.ADMIN_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id } = body as { id?: string };

        if (!id) {
            return NextResponse.json({ error: 'ID da sugestão é obrigatório' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch the suggestion
        const { data: suggestion, error: fetchError } = await supabase
            .from('stop_suggestions')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !suggestion) {
            return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });
        }

        if (suggestion.status !== 'PENDING') {
            return NextResponse.json({ error: 'Sugestão já foi processada' }, { status: 409 });
        }

        // 2. Create the stop from suggestion
        const { error: insertError } = await supabase
            .from('stops')
            .insert({
                name: suggestion.name_suggested,
                location: suggestion.geom,
                neighborhood: suggestion.neighborhood_text || null,
                is_active: true,
            });

        if (insertError) {
            console.error('approve stop insert error:', insertError);
            return NextResponse.json({ error: 'Erro ao criar ponto: ' + insertError.message }, { status: 500 });
        }

        // 3. Update suggestion status
        const { error: updateError } = await supabase
            .from('stop_suggestions')
            .update({
                status: 'APPROVED',
                decided_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) {
            console.error('approve suggestion update error:', updateError);
            return NextResponse.json({ error: 'Ponto criado mas erro ao atualizar sugestão' }, { status: 500 });
        }

        // 4. Best-effort: reject other nearby PENDING suggestions as duplicates
        try {
            // Find nearby pending suggestions using the RPC
            const { data: nearbyPending } = await supabase.rpc('rpc_find_nearby_pending_suggestion', {
                lat: typeof suggestion.geom === 'string'
                    ? parseFloat(suggestion.geom.match(/POINT\(\s*[-\d.]+\s+([-\d.]+)/)?.[1] || '0')
                    : (suggestion.geom as { coordinates: number[] })?.coordinates?.[1] ?? 0,
                lng: typeof suggestion.geom === 'string'
                    ? parseFloat(suggestion.geom.match(/POINT\(\s*([-\d.]+)/)?.[1] || '0')
                    : (suggestion.geom as { coordinates: number[] })?.coordinates?.[0] ?? 0,
                meters: 30,
                days: 7,
            });

            if (nearbyPending && nearbyPending.length > 0) {
                for (const nearby of nearbyPending) {
                    if (nearby.id === id) continue; // skip self
                    await supabase
                        .from('stop_suggestions')
                        .update({
                            status: 'REJECTED',
                            admin_note: 'Duplicada de ponto aprovado',
                            decided_at: new Date().toISOString(),
                        })
                        .eq('id', nearby.id)
                        .eq('status', 'PENDING'); // safety: only reject if still pending
                }
            }
        } catch {
            // best-effort, don't fail the approval
        }

        return NextResponse.json({ ok: true, message: 'Sugestão aprovada e ponto criado' });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
