import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
    'home_start',
    'gps_ok',
    'stop_selected',
    'checkin_confirmed',
    'registrar_open',
    'event_recorded',
    'share_clicked',
    'follow_optin'
]);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const metrics: string[] = body.metrics || (body.event ? [body.event] : []);

        if (metrics.length === 0) {
            return NextResponse.json({ error: 'Missing metrics' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const today = new Date().toISOString().slice(0, 10);

        for (const m of metrics) {
            if (!ALLOWED_EVENTS.has(m)) continue;

            // Upsert: insert or increment
            const { error } = await supabase.rpc('increment_telemetry', {
                p_event_key: m,
                p_date: today,
            });

            if (error) {
                await supabase.from('telemetry_counts').upsert(
                    { event_key: m, date: today, count: 1 },
                    { onConflict: 'event_key,date', ignoreDuplicates: false }
                );
            }
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true }); // Silent fail — never break UX for telemetry
    }
}
