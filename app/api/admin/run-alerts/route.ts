import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startRun, finishRun } from '@/lib/systemRuns';

export const dynamic = 'force-dynamic';

interface StopWaitMetric {
    stop_id: string;
    p50_wait_min: number;
    week_start: string;
}

interface LineHeadwayMetric {
    line_id: string;
    p50_headway_min: number;
    week_start: string;
}

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const providedToken = req.headers.get('authorization')?.replace('Bearer ', '') || searchParams.get('t');

        if (providedToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const runId = await startRun('run_alerts', {});

        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
        currentWeekStart.setHours(0, 0, 0, 0);

        const prevWeekStart = new Date(currentWeekStart);
        prevWeekStart.setDate(currentWeekStart.getDate() - 7);

        const results = { generated: 0, updated: 0, errors: [] as string[] };

        // 1. Process STOP_WAIT alerts
        const { data: stopWaits, error: stopError } = await supabase
            .from('vw_stop_wait_weekly')
            .select('*')
            .in('week_start', [
                currentWeekStart.toISOString().split('T')[0],
                prevWeekStart.toISOString().split('T')[0]
            ]) as { data: StopWaitMetric[] | null, error: unknown };

        if (stopError) throw stopError;

        // Group by stop_id
        const stopGroups = (stopWaits || []).reduce((acc: Record<string, { curr?: StopWaitMetric, prev?: StopWaitMetric }>, curr) => {
            if (!acc[curr.stop_id]) acc[curr.stop_id] = {};
            const isCurrent = curr.week_start === currentWeekStart.toISOString().split('T')[0];
            acc[curr.stop_id][isCurrent ? 'curr' : 'prev'] = curr;
            return acc;
        }, {});

        for (const stopId in stopGroups) {
            const group = stopGroups[stopId];
            if (group.curr && group.prev) {
                const delta = ((group.curr.p50_wait_min - group.prev.p50_wait_min) / group.prev.p50_wait_min) * 100;
                if (delta >= 30) {
                    const severity = delta >= 60 ? 'CRIT' : 'WARN';
                    const { error } = await supabase.from('alerts').upsert({
                        alert_type: 'STOP_WAIT',
                        target_id: stopId,
                        week_start: currentWeekStart.toISOString().split('T')[0],
                        metric_p50: group.curr.p50_wait_min,
                        prev_metric_p50: group.prev.p50_wait_min,
                        delta_pct: Math.round(delta),
                        severity,
                        is_active: true
                    }, { onConflict: 'alert_type,target_id,week_start' });
                    if (error) results.errors.push(`Stop ${stopId}: ${error.message}`);
                    else results.generated++;
                }
            }
        }

        // 2. Process LINE_HEADWAY alerts
        const { data: lineHeadways, error: lineError } = await supabase
            .from('vw_line_headway_weekly')
            .select('*')
            .in('week_start', [
                currentWeekStart.toISOString().split('T')[0],
                prevWeekStart.toISOString().split('T')[0]
            ]) as { data: LineHeadwayMetric[] | null, error: unknown };

        if (lineError) throw lineError;

        const lineGroups = (lineHeadways || []).reduce((acc: Record<string, { curr?: LineHeadwayMetric, prev?: LineHeadwayMetric }>, curr) => {
            if (!acc[curr.line_id]) acc[curr.line_id] = {};
            const isCurrent = curr.week_start === currentWeekStart.toISOString().split('T')[0];
            acc[curr.line_id][isCurrent ? 'curr' : 'prev'] = curr;
            return acc;
        }, {});

        for (const lineId in lineGroups) {
            const group = lineGroups[lineId];
            if (group.curr && group.prev) {
                const delta = ((group.curr.p50_headway_min - group.prev.p50_headway_min) / group.prev.p50_headway_min) * 100;
                if (delta >= 30) {
                    const severity = delta >= 60 ? 'CRIT' : 'WARN';
                    const { error } = await supabase.from('alerts').upsert({
                        alert_type: 'LINE_HEADWAY',
                        target_id: lineId,
                        week_start: currentWeekStart.toISOString().split('T')[0],
                        metric_p50: group.curr.p50_headway_min,
                        prev_metric_p50: group.prev.p50_headway_min,
                        delta_pct: Math.round(delta),
                        severity,
                        is_active: true
                    }, { onConflict: 'alert_type,target_id,week_start' });
                    if (error) results.errors.push(`Line ${lineId}: ${error.message}`);
                    else results.generated++;
                }
            }
        }

        const runStatus = results.errors.length > 0 ? 'WARN' : 'OK';
        await finishRun(runId, runStatus, results);

        // Auto-trigger digest for daily alert aggregation
        try {
            const baseUrl = req.url.split('/api/')[0];
            await fetch(`${baseUrl}/api/admin/telegram/digest?days=1&t=${process.env.ADMIN_TOKEN}`);
        } catch (err: unknown) {
            console.error('Failed to trigger digest:', err);
            results.errors.push(`Digest trigger failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            await finishRun(runId, 'WARN', results);
        }

        return NextResponse.json(results);
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
