import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Rate limit params
const RATE_LIMIT_MINS = 10;
const TRUST_WINDOW_MINS = 8;
const REQUIRED_DEVICES_FOR_L2 = 2;
const REQUIRED_DEVICES_FOR_L3 = 3;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, stopId, lineId, eventType, clientEventId } = body;

        // lineId is now optional for "unknown line" cases
        if (!deviceId || !stopId || !eventType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // Handle 'unknown' lineId string from client
        const sanitizedLineId = lineId === 'unknown' ? null : lineId;

        // 1. Rate Limiting Check
        const tenMinsAgo = new Date(Date.now() - RATE_LIMIT_MINS * 60 * 1000).toISOString();

        const { data: recentEvents, error: rlError } = await supabase
            .from('stop_events')
            .select('id')
            .eq('device_id', deviceId)
            .eq('line_id', sanitizedLineId)
            .eq('event_type', eventType)
            .gte('occurred_at', tenMinsAgo)
            .limit(1);

        if (rlError) throw rlError;

        if (recentEvents && recentEvents.length > 0) {
            return NextResponse.json(
                { error: 'Rate limit exceeded for this event type on this line.' },
                { status: 429 } // This 429 status code is watched by offline sync hook
            );
        }

        // 2. Trajectory Logic (Boarding -> Alighted)
        let trajectoryL3 = false;
        let trajectoryMeta: Record<string, unknown> = {};

        if (eventType === 'alighted') {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const { data: lastBoarding } = await supabase
                .from('stop_events')
                .select('id, stop_id, occurred_at')
                .eq('device_id', deviceId)
                .eq('event_type', 'boarding')
                .neq('stop_id', stopId) // Must be a different stop
                .gte('occurred_at', twoHoursAgo)
                .order('occurred_at', { ascending: false })
                .maybeSingle();

            if (lastBoarding) {
                const { data: distM } = await supabase.rpc('get_stops_distance', {
                    stop_id_1: lastBoarding.stop_id,
                    stop_id_2: stopId
                });

                const timeDiffMins = (Date.now() - new Date(lastBoarding.occurred_at).getTime()) / (60 * 1000);

                // Regra: Diferente stop + tempo >= 5 min + distancia >= 800m
                if (timeDiffMins >= 5 && (distM === null || distM >= 800)) {
                    trajectoryL3 = true;
                    trajectoryMeta = {
                        boarding_event_id: lastBoarding.id,
                        time_mins: Math.round(timeDiffMins),
                        dist_m: distM ? Math.round(distM as number) : 0
                    };
                }
            }
        }

        // 3. Insert Event
        let initialTrust = 'L1';
        let initialMethod = 'L1';
        if (trajectoryL3) {
            initialTrust = 'L3';
            initialMethod = 'TRAJETO';
        }

        let newEvent;
        if (clientEventId) {
            const { data, error: insertError } = await supabase
                .from('stop_events')
                .upsert({
                    client_event_id: clientEventId,
                    device_id: deviceId,
                    stop_id: stopId,
                    line_id: sanitizedLineId,
                    event_type: eventType,
                    trust_level: initialTrust,
                    trust_method: initialMethod,
                    meta: trajectoryMeta
                }, { onConflict: 'client_event_id' })
                .select()
                .single();
            if (insertError) throw insertError;
            newEvent = data;
        } else {
            const { data, error: insertError } = await supabase
                .from('stop_events')
                .insert({
                    device_id: deviceId,
                    stop_id: stopId,
                    line_id: sanitizedLineId,
                    event_type: eventType,
                    trust_level: initialTrust,
                    trust_method: initialMethod,
                    meta: trajectoryMeta
                })
                .select()
                .single();
            if (insertError) throw insertError;
            newEvent = data;
        }

        // If promoted via trajectory, also promote the boarding event
        if (trajectoryL3 && trajectoryMeta.boarding_event_id) {
            await supabase
                .from('stop_events')
                .update({
                    trust_level: 'L3',
                    trust_method: 'TRAJETO',
                    meta: { alighted_event_id: newEvent.id }
                })
                .eq('id', trajectoryMeta.boarding_event_id);
        }

        // 4. Collective Trust Logic (L2/L3)
        if (!trajectoryL3) {
            const eightMinsAgo = new Date(Date.now() - TRUST_WINDOW_MINS * 60 * 1000).toISOString();

            const { data: similarEvents, error: trustError } = await supabase
                .from('stop_events')
                .select('id, device_id, trust_level')
                .eq('stop_id', stopId)
                .eq('line_id', sanitizedLineId)
                .eq('event_type', eventType)
                .neq('device_id', deviceId)
                .gte('occurred_at', eightMinsAgo);

            if (trustError) throw trustError;

            let finalTrustLevel = 'L1';
            let finalMethod = 'L1';

            if (similarEvents && similarEvents.length > 0) {
                const uniqueDevices = new Set(similarEvents.map(e => e.device_id));
                const totalDevices = uniqueDevices.size + 1; // + current device

                if (totalDevices >= REQUIRED_DEVICES_FOR_L3) {
                    finalTrustLevel = 'L3';
                    finalMethod = 'COLETIVO';
                } else if (totalDevices >= REQUIRED_DEVICES_FOR_L2) {
                    finalTrustLevel = 'L2';
                    finalMethod = 'L2';
                }

                if (finalTrustLevel !== 'L1') {
                    const eventIdsToUpgrade = [newEvent.id, ...similarEvents.map(e => e.id)];
                    await supabase
                        .from('stop_events')
                        .update({
                            trust_level: finalTrustLevel,
                            trust_method: finalMethod,
                            meta: { devices_count: totalDevices }
                        })
                        .in('id', eventIdsToUpgrade);

                    // Confirmations
                    const targetEventId = similarEvents[0].id;
                    await supabase
                        .from('trust_confirmations')
                        .insert({
                            event_id: targetEventId,
                            device_id: deviceId,
                            is_confirmed: true
                        });

                    return NextResponse.json({
                        success: true,
                        event: { ...newEvent, trust_level: finalTrustLevel, trust_method: finalMethod },
                        message: `Event upgraded to ${finalTrustLevel} (${finalMethod})`
                    }, { status: 201 });
                }
            }
        }

        return NextResponse.json({
            success: true,
            event: newEvent,
            message: trajectoryL3 ? 'Event promoted via Trajectory' : 'Event recorded'
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('API /record error:', error);
        const errMessage = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
