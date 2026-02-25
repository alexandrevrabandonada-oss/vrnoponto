import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get('deviceId');

        if (!deviceId) {
            return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('stop_events')
            .select(`
                id,
                client_event_id,
                stop_id,
                line_id,
                event_type,
                occurred_at,
                trust_level,
                stops (name),
                lines (code, name)
            `)
            .eq('device_id', deviceId)
            .order('occurred_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        interface RawEvent {
            id: string;
            client_event_id?: string | null;
            stop_id: string;
            line_id: string;
            event_type: string;
            occurred_at: string;
            trust_level: string;
            stops?: { name: string } | null;
            lines?: { code: string, name: string } | null;
        }

        interface RatingRow {
            client_event_id: string;
            rating: 'GOOD' | 'REGULAR' | 'BAD';
            rating_at: string;
        }

        const rawEvents = (data as unknown as RawEvent[]) || [];
        const clientEventIds = rawEvents
            .map((ev) => ev.client_event_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);

        const ratingsByClientEventId = new Map<string, RatingRow>();

        if (clientEventIds.length > 0) {
            const { data: ratingsData, error: ratingsError } = await supabase
                .from('event_service_ratings')
                .select('client_event_id, rating, rating_at')
                .eq('device_id', deviceId)
                .in('client_event_id', clientEventIds);

            if (ratingsError) throw ratingsError;

            ((ratingsData as unknown as RatingRow[]) || []).forEach((row) => {
                ratingsByClientEventId.set(row.client_event_id, row);
            });
        }

        // Clean up the response to match a simpler format
        const events = rawEvents.map((ev) => {
            const ratingRow = ev.client_event_id ? ratingsByClientEventId.get(ev.client_event_id) : undefined;

            return {
            id: ev.id,
            clientEventId: ev.client_event_id || null,
            stopId: ev.stop_id,
            stopName: ev.stops?.name || 'Ponto desconhecido',
            lineId: ev.line_id,
            lineCode: ev.lines?.code || 'N/A',
            lineName: ev.lines?.name || 'Linha N/A',
            eventType: ev.event_type,
            occurredAt: ev.occurred_at,
            trustLevel: ev.trust_level,
            service_rating: ratingRow?.rating || null,
            service_rating_at: ratingRow?.rating_at || null,
            status: 'SENT' as const
            };
        });

        return NextResponse.json({ events });

    } catch (error: unknown) {
        console.error('API /mine error:', error);
        const errMessage = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
