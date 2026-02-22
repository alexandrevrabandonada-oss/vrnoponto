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

        // 1. Fetch active subscriptions and preferences
        const { data: subs, error: subErr } = await supabase
            .from('push_subscriptions')
            .select('device_id, endpoint, p256dh, auth')
            .eq('is_active', true);

        if (subErr) throw subErr;
        if (!subs || subs.length === 0) {
            return NextResponse.json({ message: 'No active subscriptions' });
        }

        const { data: allPrefs, error: prefErr } = await supabase
            .from('push_preferences')
            .select('*')
            .eq('is_active', true)
            .eq('mode', 'DIGEST');

        if (prefErr) throw prefErr;

        // Group prefs and subs
        const validDevices = allPrefs.map(p => p.device_id);
        const digestSubs = subs.filter(s => validDevices.includes(s.device_id));

        if (digestSubs.length === 0) {
            return NextResponse.json({ message: 'No digest subscriptions' });
        }

        // 2. Fetch last 24h alerts
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: alerts, error: alertErr } = await supabase
            .from('alerts')
            .select('*')
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false });

        if (alertErr) throw alertErr;

        if (!alerts || alerts.length === 0) {
            return NextResponse.json({ message: 'No alerts in last 24h' });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        let sentCount = 0;
        let failedCount = 0;

        // Process each subscription
        for (const sub of digestSubs) {
            const prefs = allPrefs.find(p => p.device_id === sub.device_id);
            if (!prefs) continue;

            const minSeverity = prefs.severity_min; // CRIT or WARN
            const linesPref = prefs.lines || [];
            const nhoodsPref = prefs.neighborhoods_norm || [];

            // Filter alerts
            const filtered = alerts.filter(a => {
                if (minSeverity === 'CRIT' && a.severity !== 'CRIT') return false;

                // If filters exist, must match at least one
                let matchesLine = linesPref.length === 0;
                let matchesNhood = nhoodsPref.length === 0;

                if (a.line_id && linesPref.includes(a.line_id)) matchesLine = true;
                if (a.neighborhood_norm && nhoodsPref.includes(a.neighborhood_norm)) matchesNhood = true;

                return matchesLine && matchesNhood;
            });

            if (filtered.length === 0) continue;

            const dedupeKey = `digest:${todayStr}:${sub.device_id}`;
            const { error: dedupeErr } = await supabase
                .from('push_sends')
                .insert({
                    send_type: 'DIGEST_DAILY',
                    dedupe_key: dedupeKey,
                    device_id: sub.device_id
                });

            if (dedupeErr) {
                // Unique constraint violation means already sent
                if (dedupeErr.code === '23505') continue;
                console.error('Dedupe error', dedupeErr);
                continue;
            }

            // Formatting message
            let bodyText = '';
            const toSend = filtered.slice(0, 6);
            for (const a of toSend) {
                bodyText += `• [${a.line_id || a.neighborhood_norm || 'Geral'}] ${a.title}\n`;
            }
            if (filtered.length > 6) {
                bodyText += `+ ${filtered.length - 6} outros avisos...`;
            }

            const payload = JSON.stringify({
                title: `VR no Ponto: Resumo (${filtered.length} alertas)`,
                body: bodyText,
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

        return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount });

    } catch (error) {
        console.error('Push digest error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
