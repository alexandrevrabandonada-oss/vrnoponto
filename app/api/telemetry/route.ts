import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
    'cta_click',
    'pageview_como_usar',
    'pageview_no_ponto',
    'pageview_registrar',
    'page_view_partners',
    'page_view_partner_apply',
    'click_partner_apply_submit',
    'partner_kit_generated',
    'offline_queue_enqueued',
    'offline_queue_synced',
    'offline_queue_failed',
    'invite_impression_A',
    'invite_impression_B',
    'invite_click_A',
    'invite_click_B',
    'partner_request_created_A',
    'partner_request_created_B'
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
