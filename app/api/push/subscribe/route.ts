import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { deviceId, subscription, prefs } = await req.json();

        if (!deviceId || !subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Upsert subscription
        const { error: subError } = await supabase
            .from('push_subscriptions')
            .upsert({
                device_id: deviceId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                user_agent: req.headers.get('user-agent') || 'Unknown',
                is_active: true,
                last_seen: new Date().toISOString()
            }, { onConflict: 'device_id, endpoint' });

        if (subError) throw subError;

        // Upsert preferences
        const mode = prefs?.mode || 'DIGEST';
        const severity_min = prefs?.severity_min || 'CRIT';
        const neighborhoods_norm = prefs?.neighborhoods_norm || [];
        const lines = prefs?.lines || [];

        const { error: prefError } = await supabase
            .from('push_preferences')
            .upsert({
                device_id: deviceId,
                mode,
                severity_min,
                neighborhoods_norm,
                lines,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'device_id' });

        if (prefError) throw prefError;

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Subscribe error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
