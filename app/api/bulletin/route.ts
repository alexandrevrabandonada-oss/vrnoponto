import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '7', 10);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);
        const isoThreshold = thresholdDate.toISOString();

        // 1. Get Aggregated Alert Counts
        const { data: alertsData, error: alertsError } = await supabase
            .from('alerts')
            .select('severity, alert_type')
            .eq('is_active', true)
            .gte('created_at', isoThreshold);

        if (alertsError) throw alertsError;

        const counts = (alertsData || []).reduce((acc: Record<string, number>, curr: { severity: string }) => {
            acc[curr.severity] = (acc[curr.severity] || 0) + 1;
            acc.total = (acc.total || 0) + 1;
            return acc;
        }, { CRIT: 0, WARN: 0, INFO: 0, total: 0 });

        // 2. Get Top Alerts (by delta_pct)
        const { data: topAlerts, error: topError } = await supabase
            .from('alerts')
            .select('*, target_id')
            .eq('is_active', true)
            .gte('created_at', isoThreshold)
            .order('delta_pct', { ascending: false })
            .limit(10);

        if (topError) throw topError;

        const topAlertsCrit = topAlerts?.filter(a => a.severity === 'CRIT').slice(0, 5) || [];
        const topAlertsWarn = topAlerts?.filter(a => a.severity === 'WARN').slice(0, 5) || [];

        // 3. Get Worst Performing (aggregated 30d views since we don't have a 7d specific view yet, but it's a good proxy)
        const { data: worstStops } = await supabase
            .from('vw_stop_wait_30d')
            .select('stop_id, stop_name, p50_wait_min')
            .not('p50_wait_min', 'is', null)
            .order('p50_wait_min', { ascending: false })
            .limit(5);

        const { data: worstLines } = await supabase
            .from('vw_line_headway_weekly')
            .select('line_id, p50_headway_min')
            .order('p50_headway_min', { ascending: false })
            .limit(5);

        return NextResponse.json({
            period: {
                days,
                from: thresholdDate.toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
            },
            summary: counts,
            topAlertsCrit,
            topAlertsWarn,
            worstStops: worstStops || [],
            worstLines: worstLines || []
        });

    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
