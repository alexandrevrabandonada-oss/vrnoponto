import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Rate limit params
const RATE_LIMIT_MINS = 10;
const TRUST_WINDOW_MINS = 8;
const REQUIRED_DEVICES_FOR_L2 = 2; // Incluindo o próprio device

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { deviceId, stopId, lineId, eventType } = body;

        if (!deviceId || !stopId || !lineId || !eventType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Rate Limiting Check
        const tenMinsAgo = new Date(Date.now() - RATE_LIMIT_MINS * 60 * 1000).toISOString();

        // Check if THIS device has reported THIS event for THIS line in the last 10 mins
        const { data: recentEvents, error: rlError } = await supabase
            .from('stop_events')
            .select('id')
            .eq('device_id', deviceId)
            .eq('line_id', lineId)
            .eq('event_type', eventType)
            .gte('occurred_at', tenMinsAgo)
            .limit(1);

        if (rlError) throw rlError;

        if (recentEvents && recentEvents.length > 0) {
            return NextResponse.json(
                { error: 'Rate limit exceeded for this event type on this line.' },
                { status: 429 }
            );
        }

        // 2. Insert Event as L1
        const { data: newEvent, error: insertError } = await supabase
            .from('stop_events')
            .insert({
                device_id: deviceId,
                stop_id: stopId,
                line_id: lineId,
                event_type: eventType,
                trust_level: 'L1'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 3. Trust Level 2 (L2) Logic
        const eightMinsAgo = new Date(Date.now() - TRUST_WINDOW_MINS * 60 * 1000).toISOString();

        // Find SIMILAR events from OTHER devices in the last 8 mins
        const { data: similarEvents, error: trustError } = await supabase
            .from('stop_events')
            .select('id, device_id')
            .eq('stop_id', stopId)
            .eq('line_id', lineId)
            .eq('event_type', eventType)
            .neq('device_id', deviceId)
            .gte('occurred_at', eightMinsAgo);

        if (trustError) throw trustError;

        let finalTrustLevel = 'L1';

        // Se achamos pelo menos (REQUIRED_DEVICES - 1) devices diferentes, atingimos L2
        if (similarEvents && similarEvents.length >= (REQUIRED_DEVICES_FOR_L2 - 1)) {
            finalTrustLevel = 'L2';

            // Monta os IDs dos eventos que vão subir pra L2
            const eventIdsToUpgrade = [newEvent.id, ...similarEvents.map(e => e.id)];

            // Atualiza os eventos para L2
            await supabase
                .from('stop_events')
                .update({ trust_level: 'L2' })
                .in('id', eventIdsToUpgrade);

            // Cria confirmações (quem confirmou quem)
            // Para simplificar: dizemos que 'deviceId' confirmou o primeiro evento similar achado.
            const targetEventId = similarEvents[0].id;
            await supabase
                .from('trust_confirmations')
                .insert({
                    event_id: targetEventId,
                    device_id: deviceId,
                    is_confirmed: true
                });
        }

        return NextResponse.json({
            success: true,
            event: { ...newEvent, trust_level: finalTrustLevel },
            message: finalTrustLevel === 'L2' ? 'Event upgraded to L2' : 'Event recorded as L1'
        }, { status: 201 });

    } catch (error: any) {
        console.error('API /record error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
