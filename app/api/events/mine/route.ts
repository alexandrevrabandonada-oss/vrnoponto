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
            stop_id: string;
            line_id: string;
            event_type: string;
            occurred_at: string;
            trust_level: string;
            stops?: { name: string } | null;
            lines?: { code: string, name: string } | null;
        }

        // Clean up the response to match a simpler format
        const events = (data as unknown as RawEvent[] || []).map((ev) => ({
            id: ev.id,
            stopId: ev.stop_id,
            stopName: ev.stops?.name || 'Ponto desconhecido',
            lineId: ev.line_id,
            lineCode: ev.lines?.code || 'N/A',
            lineName: ev.lines?.name || 'Linha N/A',
            eventType: ev.event_type,
            occurredAt: ev.occurred_at,
            trustLevel: ev.trust_level,
            status: 'SENT' as const
        }));

        return NextResponse.json({ events });

    } catch (error: unknown) {
        console.error('API /mine error:', error);
        const errMessage = error instanceof Error ? error.message : 'Internal error';
        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
