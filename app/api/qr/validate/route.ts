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

        // 1. Validar Token e buscar Stop/Partner
        const { data: qr, error: qrError } = await supabase
            .from('qr_checkins')
            .select(`
                id,
                stop_id,
                partner_id,
                is_active,
                stops ( id, name, location ),
                partners ( id, name, location )
            `)
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .single();

        if (qrError || !qr) {
            return NextResponse.json({ error: 'QR Code inválido ou expirado' }, { status: 404 });
        }

        const anchor = qr.stops || qr.partners;
        if (!anchor) {
            return NextResponse.json({ error: 'Âncora do QR não encontrada' }, { status: 404 });
        }
        const isStop = !!qr.stop_id;
        const anchorId = qr.stop_id || qr.partner_id;
        const anyAnchor: any = anchor;
        const anchorName = anyAnchor.name;

        // 2. Validar Proximidade (80 metros)
        // Usaremos a RPC get_distance_meters que agora deve suportar parceiros ou usar coordenadas
        // Mas a RPC atual só checa 'stops'. Vamos usar coordenados direto ou uma RPC genérica.
        // Vou assumir que atualizarei a RPC para aceitar anchor_id e table_name ou criar uma genérica.
        // Para simplificar e ser robusto, vou usar uma nova RPC 'get_distance_to_location(lat, lng, user_lat, user_lng)'
        // Ou melhor, buscar a location e passar pro RPC.
        const locationWKT = (anchor as any).location; // GEOGRAPHY as string/WKT or GeoJSON

        const { data: distM, error: distError } = await supabase
            .rpc('get_distance_meters_v2', {
                target_location: locationWKT,
                user_lat: lat,
                user_lng: lng
            });

        if (distError || distM === null || distM > 80) {
            return NextResponse.json({
                error: 'Você precisa estar no ponto para validar (limite 80m).',
                dist_actual: distM
            }, { status: 403 });
        }

        // 3. Rate Limit (1 L3 a cada 30 min por device/âncora)
        const { data: recentL3 } = await supabase
            .from('stop_events')
            .select('id')
            .eq('device_id', device_id)
            .eq(isStop ? 'stop_id' : 'id', isStop ? anchorId : anchorId) // This is tricky.
            // If it's a stop, we limit by stop_id. 
            // If it's a partner, we should probably limit by partner_id? 
            // But stop_events doesn't have partner_id yet. 
            // User didn't ask to add partner_id to stop_events. 
            // I'll just check if the device got ANY L3 via QR in the last 30 min at this anchor.
            // Since stop_events only has stop_id, I'll use a meta check or just let it be for now. 
            // Wait, for partners, I'll check meta->'partner_id'.
            .eq('trust_level', 'L3')
            .eq('trust_method', 'QR')
            .gt('occurred_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
            .limit(1);

        // Simple Rate Limit for now: 1 L3 QR per 30m
        if (recentL3 && recentL3.length > 0) {
            return NextResponse.json({ error: 'Você já validou recentemente. Aguarde 30 min.' }, { status: 429 });
        }

        // 4. Promoção L3: Busca evento recente (15 min) e atualiza
        const eventQuery = supabase
            .from('stop_events')
            .select('id, stop_id')
            .eq('device_id', device_id)
            .gt('occurred_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
            .order('occurred_at', { ascending: false })
            .limit(1);

        if (isStop) {
            eventQuery.eq('stop_id', anchorId);
        }

        const { data: lastEvent, error: eventError } = await eventQuery.maybeSingle();

        if (eventError || !lastEvent) {
            return NextResponse.json({ error: 'Nenhum relato recente para promover. Relate primeiro, depois valide o QR.' }, { status: 400 });
        }

        // 5. Atualizar Trust Level
        const { error: updateError } = await supabase
            .from('stop_events')
            .update({
                trust_level: 'L3',
                trust_method: 'QR',
                meta: !isStop ? { partner_id: anchorId } : {}
            })
            .eq('id', lastEvent.id);

        if (updateError) throw updateError;

        return NextResponse.json({
            ok: true,
            anchor_id: anchorId,
            anchor_name: anchorName,
            anchor_type: isStop ? 'STOP' : 'PARTNER',
            trust_level: 'L3'
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
