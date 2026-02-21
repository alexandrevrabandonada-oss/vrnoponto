import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { token, device_id, lat, lng } = await req.json();

        if (!token || !device_id || !lat || !lng) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const supabase = await createClient();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 1. Validar Token e buscar Stop
        const { data: qr, error: qrError } = await supabase
            .from('qr_checkins')
            .select(`
                id,
                stop_id,
                is_active,
                stops (
                    id,
                    name,
                    location
                )
            `)
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .single();

        if (qrError || !qr) {
            return NextResponse.json({ error: 'QR Code inválido ou expirado' }, { status: 404 });
        }

        const stop = (qr.stops as unknown) as { id: string, name: string, location: unknown };

        // 2. Validar Proximidade (80 metros) via PostGIS
        const { data: distM, error: distError } = await supabase
            .rpc('get_distance_meters', {
                stop_id: stop.id,
                user_lat: lat,
                user_lng: lng
            });

        if (distError || distM === null || distM > 80) {
            return NextResponse.json({
                error: 'Você precisa estar no ponto para validar (limite 80m).',
                dist_actual: distM
            }, { status: 403 });
        }

        // 3. Rate Limit (1 L3 a cada 30 min por device/ponto)
        const { data: recentL3 } = await supabase
            .from('stop_events')
            .select('id')
            .eq('device_id', device_id)
            .eq('stop_id', stop.id)
            .eq('trust_level', 'L3')
            .gt('occurred_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
            .limit(1);

        if (recentL3 && recentL3.length > 0) {
            return NextResponse.json({ error: 'Você já validou este ponto recentemente. Aguarde 30 min.' }, { status: 429 });
        }

        // 4. Promoção L3: Busca evento recente (15 min) e atualiza
        const { data: lastEvent, error: eventError } = await supabase
            .from('stop_events')
            .select('id')
            .eq('device_id', device_id)
            .eq('stop_id', stop.id)
            .gt('occurred_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
            .order('occurred_at', { ascending: false })
            .limit(1)
            .single();

        if (eventError || !lastEvent) {
            return NextResponse.json({ error: 'Nenhum relato recente para promover. Relate primeiro, depois valide o QR.' }, { status: 400 });
        }

        // 5. Atualizar Trust Level
        const { error: updateError } = await supabase
            .from('stop_events')
            .update({
                trust_level: 'L3',
                trust_method: 'QR'
            })
            .eq('id', lastEvent.id);

        if (updateError) throw updateError;

        return NextResponse.json({
            ok: true,
            stop_id: stop.id,
            stop_name: stop.name,
            trust_level: 'L3'
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
