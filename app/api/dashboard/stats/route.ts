import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type WaitMetricRow = {
    stop_id: string;
    sample_size: number;
    median_wait_time: number;
};

type WeeklyWaitRow = {
    p50_wait_min: number;
    samples: number;
};

type WeeklyHeadwayRow = {
    p50_headway_min: number;
    samples: number;
};

type StopRow = {
    id: string;
    name: string;
};

type CriticalStopRow = {
    stop_name: string;
    median_wait_time: number;
    total_samples: number;
};

function toPositiveInt(value: string | null, fallback: number) {
    const n = Number.parseInt(value || '', 10);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return n;
}

function averageWeighted(rows: Array<{ value: number; weight: number }>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const row of rows) {
        if (!Number.isFinite(row.value)) continue;
        const weight = Number.isFinite(row.weight) && row.weight > 0 ? row.weight : 1;
        weightedSum += row.value * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) return 0;
    return Number((weightedSum / totalWeight).toFixed(1));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lineFilter = (searchParams.get('line') || '').trim();
        const days = Math.min(toPositiveInt(searchParams.get('days'), 30), 90);

        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);
        const thresholdDate = threshold.toISOString().slice(0, 10);
        const thresholdIso = threshold.toISOString();

        const supabase = await createClient();

        let avgWaitTime = 0;
        let criticalStops: CriticalStopRow[] = [];

        if (lineFilter) {
            const { data: waitRows, error: waitError } = await supabase
                .from('vw_wait_time_metrics')
                .select('stop_id, sample_size, median_wait_time')
                .eq('line_id', lineFilter)
                .order('median_wait_time', { ascending: false })
                .limit(100);

            if (waitError) {
                throw waitError;
            }

            const waitMetrics = (waitRows || []) as WaitMetricRow[];
            avgWaitTime = averageWeighted(
                waitMetrics.map(row => ({
                    value: Number(row.median_wait_time || 0),
                    weight: Number(row.sample_size || 0)
                }))
            );

            const stopIds = waitMetrics.map(row => row.stop_id).filter(Boolean);
            let stopMap = new Map<string, string>();

            if (stopIds.length > 0) {
                const { data: stopRows, error: stopError } = await supabase
                    .from('stops')
                    .select('id, name')
                    .in('id', stopIds);

                if (stopError) {
                    throw stopError;
                }

                stopMap = new Map((stopRows || []).map((stop: StopRow) => [stop.id, stop.name]));
            }

            criticalStops = waitMetrics
                .slice(0, 10)
                .map(row => ({
                    stop_name: stopMap.get(row.stop_id) || 'Ponto sem nome',
                    median_wait_time: Number(row.median_wait_time || 0),
                    total_samples: Number(row.sample_size || 0)
                }));
        } else {
            const { data: weeklyWaitRows, error: weeklyWaitError } = await supabase
                .from('vw_stop_wait_weekly')
                .select('p50_wait_min, samples')
                .gte('week_start', thresholdDate);

            if (weeklyWaitError) {
                throw weeklyWaitError;
            }

            avgWaitTime = averageWeighted(
                ((weeklyWaitRows || []) as WeeklyWaitRow[]).map(row => ({
                    value: Number(row.p50_wait_min || 0),
                    weight: Number(row.samples || 0)
                }))
            );

            const { data: criticalRows, error: criticalError } = await supabase
                .from('vw_critical_stops')
                .select('stop_name, median_wait_time, total_samples')
                .order('median_wait_time', { ascending: false })
                .limit(10);

            if (criticalError) {
                throw criticalError;
            }

            criticalStops = ((criticalRows || []) as CriticalStopRow[]).map(row => ({
                stop_name: row.stop_name,
                median_wait_time: Number(row.median_wait_time || 0),
                total_samples: Number(row.total_samples || 0)
            }));
        }

        let headwayQuery = supabase
            .from('vw_line_headway_weekly')
            .select('p50_headway_min, samples')
            .gte('week_start', thresholdDate);

        if (lineFilter) {
            headwayQuery = headwayQuery.eq('line_id', lineFilter);
        }

        const { data: headwayRows, error: headwayError } = await headwayQuery;
        if (headwayError) {
            throw headwayError;
        }

        const avgHeadway = averageWeighted(
            ((headwayRows || []) as WeeklyHeadwayRow[]).map(row => ({
                value: Number(row.p50_headway_min || 0),
                weight: Number(row.samples || 0)
            }))
        );

        let alertsQuery = supabase
            .from('alerts')
            .select('id, alert_type, severity, delta_pct, target_id, created_at')
            .eq('is_active', true)
            .gte('created_at', thresholdIso)
            .order('created_at', { ascending: false })
            .limit(20);

        if (lineFilter) {
            alertsQuery = alertsQuery.eq('target_id', lineFilter);
        }

        const { data: alerts, error: alertsError } = await alertsQuery;
        if (alertsError) {
            throw alertsError;
        }

        return NextResponse.json({
            avgWaitTime,
            avgHeadway,
            criticalStops,
            alerts: alerts || []
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
