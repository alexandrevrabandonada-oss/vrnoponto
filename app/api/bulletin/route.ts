import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bulletin?days=7
 *
 * Always returns a stable shape:
 * {
 *   ok: boolean,
 *   generatedAt: string,
 *   periodDays: number,
 *   summary: { samplesTotal: number, verifiedPct: number } | null,
 *   worstStops: [],
 *   worstNeighborhoods: [],
 *   topAlertsCrit: [],
 *   topAlertsWarn: [],
 *   worstLines: [],
 *   notes: string[]
 * }
 */
export async function GET(req: Request) {
    const notes: string[] = [];

    try {
        const { searchParams } = new URL(req.url);
        const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10) || 7, 1), 90);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({
                ok: true,
                generatedAt: new Date().toISOString(),
                periodDays: days,
                summary: null,
                worstStops: [],
                worstNeighborhoods: [],
                topAlertsCrit: [],
                topAlertsWarn: [],
                worstLines: [],
                notes: ['Conexão com banco de dados não configurada.'],
            });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);
        const isoThreshold = thresholdDate.toISOString();

        // 1. Aggregated Alert Counts
        const { data: alertsData } = await supabase
            .from('alerts')
            .select('severity, alert_type')
            .eq('is_active', true)
            .gte('created_at', isoThreshold);

        const counts = (alertsData || []).reduce(
            (acc: Record<string, number>, curr: { severity: string }) => {
                acc[curr.severity] = (acc[curr.severity] || 0) + 1;
                acc.total = (acc.total || 0) + 1;
                return acc;
            },
            { CRIT: 0, WARN: 0, INFO: 0, total: 0 }
        );

        // 2. Top Alerts (by delta_pct)
        const { data: topAlerts } = await supabase
            .from('alerts')
            .select('*, target_id')
            .eq('is_active', true)
            .gte('created_at', isoThreshold)
            .order('delta_pct', { ascending: false })
            .limit(10);

        const topAlertsCrit = (topAlerts || []).filter((a: { severity: string }) => a.severity === 'CRIT').slice(0, 5);
        const topAlertsWarn = (topAlerts || []).filter((a: { severity: string }) => a.severity === 'WARN').slice(0, 5);

        // 3. Worst Stops
        const { data: worstStops } = await supabase
            .from('vw_stop_wait_30d')
            .select('stop_id, stop_name, p50_wait_min')
            .not('p50_wait_min', 'is', null)
            .order('p50_wait_min', { ascending: false })
            .limit(5);

        // 4. Worst Lines
        const { data: worstLines } = await supabase
            .from('vw_line_headway_weekly')
            .select('line_id, p50_headway_min')
            .order('p50_headway_min', { ascending: false })
            .limit(5);

        // 5. Worst Neighborhoods
        const { data: worstNeighborhoods } = await supabase
            .from('vw_neighborhood_30d')
            .select('neighborhood, avg_delta_min, stops_count, samples_total')
            .not('avg_delta_min', 'is', null)
            .order('avg_delta_min', { ascending: false })
            .limit(5);

        // Summary
        const samplesTotal = counts.total;
        const hasData = samplesTotal > 0 ||
            (worstStops && worstStops.length > 0) ||
            (worstLines && worstLines.length > 0);

        if (!hasData) {
            notes.push('Sem amostra mínima no período selecionado. Registre horários para gerar o boletim.');
        }

        return NextResponse.json({
            ok: true,
            generatedAt: new Date().toISOString(),
            periodDays: days,
            summary: {
                samplesTotal: counts.total,
                critCount: counts.CRIT,
                warnCount: counts.WARN,
                infoCount: counts.INFO,
            },
            topAlertsCrit,
            topAlertsWarn,
            worstStops: worstStops || [],
            worstLines: worstLines || [],
            worstNeighborhoods: worstNeighborhoods || [],
            notes,
        });
    } catch (err: unknown) {
        console.error('[/api/bulletin] Error:', err);
        return NextResponse.json({
            ok: false,
            generatedAt: new Date().toISOString(),
            periodDays: 7,
            summary: null,
            topAlertsCrit: [],
            topAlertsWarn: [],
            worstStops: [],
            worstLines: [],
            worstNeighborhoods: [],
            notes: ['Erro ao gerar boletim. Tente novamente em alguns minutos.'],
        }, { status: 500 });
    }
}
