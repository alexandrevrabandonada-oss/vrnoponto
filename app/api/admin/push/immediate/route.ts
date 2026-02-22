import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    try {
        webpush.setVapidDetails(
            'mailto:admin@vrnoponto.com.br',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Fetch active IMMEDIATE subscriptions
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('device_id, endpoint, p256dh, auth')
            .eq('is_active', true);

        if (!subs || subs.length === 0) return NextResponse.json({ message: 'No active subscriptions' });

        const { data: allPrefs, error: prefErr } = await supabase
            .from('push_preferences')
            .select('*')
            .eq('is_active', true)
            .eq('mode', 'IMMEDIATE');

        if (prefErr) throw prefErr;

        const validDevices = allPrefs.map(p => p.device_id);
        const immSubs = subs.filter(s => validDevices.includes(s.device_id));

        if (immSubs.length === 0) return NextResponse.json({ message: 'No immediate subscriptions' });

        // Fetch recent CRIT alerts (last 1 hour to prevent massive backlog send)
        const hourAgo = new Date();
        hourAgo.setHours(hourAgo.getHours() - 1);

        const { data: alerts, error: alertErr } = await supabase
            .from('alerts')
            .select('*')
            .eq('severity', 'CRIT')
            .gte('created_at', hourAgo.toISOString())
            .order('created_at', { ascending: false });

        if (alertErr) throw alertErr;
        if (!alerts || alerts.length === 0) return NextResponse.json({ message: 'No new CRIT alerts' });

        let sentCount = 0;
        let failedCount = 0;

        for (const sub of immSubs) {
            const prefs = allPrefs.find(p => p.device_id === sub.device_id);
            if (!prefs) continue;

            const linesPref = prefs.lines || [];
            const nhoodsPref = prefs.neighborhoods_norm || [];

            for (const a of alerts) {
                // Filter matches
                let matchesLine = linesPref.length === 0;
                let matchesNhood = nhoodsPref.length === 0;

                if (a.line_id && linesPref.includes(a.line_id)) matchesLine = true;
                if (a.neighborhood_norm && nhoodsPref.includes(a.neighborhood_norm)) matchesNhood = true;

                if (!(matchesLine && matchesNhood)) continue;

                // Deduplicate
                const dedupeKey = `alert:${a.id}:${sub.device_id}`;
                const { error: dedupeErr } = await supabase
                    .from('push_sends')
                    .insert({
                        send_type: 'ALERT_IMMEDIATE',
                        dedupe_key: dedupeKey,
                        device_id: sub.device_id
                    });

                if (dedupeErr) {
                    if (dedupeErr.code === '23505') continue; // Already sent this alert to this device
                    continue; // Other error, skip
                }

                // Send 
                const payload = JSON.stringify({
                    title: `🚨 CRÍTICO: ${a.line_id || a.neighborhood_norm || 'Geral'}`,
                    body: a.title,
                    data: { url: '/painel' }
                });

                const pushSub = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                };

                try {
                    await webpush.sendNotification(pushSub, payload);
                    sentCount++;
                } catch (e: unknown) {
                    failedCount++;
                    if (e && typeof e === 'object' && 'statusCode' in e) {
                        const err = e as { statusCode: number };
                        if (err.statusCode === 404 || err.statusCode === 410) {
                            await supabase.from('push_subscriptions').update({ is_active: false }).eq('endpoint', sub.endpoint);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount });

    } catch (error) {
        console.error('Push immediate error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
