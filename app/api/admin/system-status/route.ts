import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLastAppliedMigration } from '@/lib/dbMigrations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const providedToken = req.headers.get('authorization')?.replace('Bearer ', '') || searchParams.get('t');

        if (providedToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Health Status (Self ping)
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        const now = new Date();

        // ping /api/health directly
        let apiHealth = 'FAIL';
        try {
            const hRes = await fetch(`${baseUrl}/api/health`);
            if (hRes.ok) apiHealth = 'OK';
        } catch { }

        // ping /api/env-audit directly
        let envAudit = 'MISSING';
        try {
            const eRes = await fetch(`${baseUrl}/api/env-audit?t=${process.env.ADMIN_TOKEN}`);
            if (eRes.ok) {
                const eData = await eRes.json();
                const envOk =
                    typeof eData?.env?.ok === 'boolean'
                        ? eData.env.ok
                        : (Array.isArray(eData?.missing) ? eData.missing.length === 0 : false);
                envAudit = envOk ? 'OK' : 'MISSING';
            }
        } catch { }

        // 2. Fetch Job Runs
        const { data: runs } = await supabase
            .from('system_runs')
            .select('*')
            .order('finished_at', { ascending: false })
            .limit(100); // Look at recent history

        const getLatest = (jobName: string) => {
            const run = runs?.find(r => r.job === jobName);
            if (!run) return { status: 'UNKNOWN', finished_at: null, meta: {}, stale: true };

            let stale = false;
            if (run.finished_at) {
                const finishedAt = new Date(run.finished_at);
                const now = new Date();
                const diffDays = (now.getTime() - finishedAt.getTime()) / (1000 * 3600 * 24);

                if (jobName === 'sync_official' && diffDays > 3) stale = true; // should be daily
                if (jobName === 'run_alerts' && diffDays > 2) stale = true; // should be weekly/daily
                if (jobName === 'bulletin_card' && diffDays > 8) stale = true; // should be weekly
            }
            return {
                status: run.status,
                finished_at: run.finished_at,
                meta: run.meta,
                stale
            };
        };

        // 3. Data Freshness
        const { data: latestSchedule } = await supabase
            .from('official_schedules')
            .select('fetched_at')
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

        const { count: activeAlertsCount } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { data: latestAlert } = await supabase
            .from('alerts')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const migrations = await getLastAppliedMigration();

        // 4. Telegram Status
        const { data: latestNotification } = await supabase
            .from('alert_notifications')
            .select('sent_at, status')
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

        const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
        const { count: telegramCount24h } = await supabase
            .from('alert_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'OK')
            .gte('sent_at', yesterday);

        // 5. Telegram Subscriptions Summary
        const { data: subsData } = await supabase
            .from('telegram_subscriptions')
            .select('mode, severity_min')
            .eq('is_active', true);

        const subs = subsData || [];
        const subsCount = subs.length;
        const digestCount = subs.filter(s => s.mode === 'DIGEST').length;
        const immediateCount = subs.filter(s => s.mode === 'IMMEDIATE').length;
        const critMinCount = subs.filter(s => s.severity_min === 'CRIT').length;

        // 6. Web Push Status
        const { count: pushSubsTotal } = await supabase
            .from('push_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { data: pushPrefs } = await supabase
            .from('push_preferences')
            .select('mode, severity_min')
            .eq('is_active', true);

        const pPrefs = pushPrefs || [];
        const pushDigest = pPrefs.filter(p => p.mode === 'DIGEST').length;
        const pushImmediate = pPrefs.filter(p => p.mode === 'IMMEDIATE').length;
        const pushCrit = pPrefs.filter(p => p.severity_min === 'CRIT').length;

        const { data: latestPush } = await supabase
            .from('push_send_logs')
            .select('created_at, status')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const { count: pushFailures24h } = await supabase
            .from('push_send_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'FAIL')
            .gte('created_at', yesterday);

        const { count: pushDeadEndpoints } = await supabase
            .from('push_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', false)
            .in('deactivation_reason', ['404', '410']);

        // 7. Optional Bus Photo Proof Metrics (7d)
        let proofUploads7d = 0;
        let proofReadLine7d = 0;
        let proofConfirmed7d = 0;
        try {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
            const { count: uploads } = await supabase
                .from('bus_photo_events')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo);
            const { count: withLineGuess } = await supabase
                .from('bus_photo_events')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo)
                .not('ai_line_guess', 'is', null);
            const { count: confirmed } = await supabase
                .from('bus_photo_events')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo)
                .eq('user_confirmed', true);

            proofUploads7d = uploads || 0;
            proofReadLine7d = withLineGuess || 0;
            proofConfirmed7d = confirmed || 0;
        } catch {
            // Optional feature can be absent in environments without migration.
        }

        const pctLineRead = proofUploads7d > 0 ? Math.round((proofReadLine7d / proofUploads7d) * 100) : 0;
        const pctConfirmed = proofUploads7d > 0 ? Math.round((proofConfirmed7d / proofUploads7d) * 100) : 0;

        return NextResponse.json({
            health: {
                api_health: apiHealth,
                env_audit: envAudit
            },
            jobs: {
                sync_official: getLatest('sync_official'),
                run_alerts: getLatest('run_alerts'),
                bulletin_card: getLatest('bulletin_card')
            },
            dataFreshness: {
                official_schedules_last_fetched_at: latestSchedule?.fetched_at || null,
                alerts_last_created_at: latestAlert?.created_at || null,
                active_alerts_count: activeAlertsCount || 0
            },
            telegram: {
                last_sent_at: latestNotification?.sent_at || null,
                last_status: latestNotification?.status || 'UNKNOWN',
                count_24h: telegramCount24h || 0,
                subscriptions: {
                    total: subsCount,
                    digest: digestCount,
                    immediate: immediateCount,
                    crit_only: critMinCount
                }
            },
            webpush: {
                vapid_ok: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
                last_sent_at: latestPush?.created_at || null,
                last_status: latestPush?.status || (latestPush ? 'OK' : 'UNKNOWN'),
                failures_24h: pushFailures24h || 0,
                dead_endpoints: pushDeadEndpoints || 0,
                subscriptions: {
                    total: pushSubsTotal || 0,
                    digest: pushDigest,
                    immediate: pushImmediate,
                    crit_only: pushCrit
                }
            },
            proofPhotos: {
                uploads_7d: proofUploads7d,
                with_line_read_7d: proofReadLine7d,
                confirmed_7d: proofConfirmed7d,
                pct_line_read_7d: pctLineRead,
                pct_confirmed_7d: pctConfirmed
            },
            migrations
        });

    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
    }
}
