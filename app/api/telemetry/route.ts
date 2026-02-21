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
]);

export async function POST(req: Request) {
    try {
        const { event } = await req.json();

        if (!event || !ALLOWED_EVENTS.has(event)) {
            return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const today = new Date().toISOString().slice(0, 10);

        // Upsert: insert or increment
        const { error } = await supabase.rpc('increment_telemetry', {
            p_event_key: event,
            p_date: today,
        });

        if (error) {
            // Fallback: manual upsert if RPC not available
            await supabase.from('telemetry_counts').upsert(
                { event_key: event, date: today, count: 1 },
                { onConflict: 'event_key,date', ignoreDuplicates: false }
            );
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true }); // Silent fail — never break UX for telemetry
    }
}
