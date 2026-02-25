import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Feature Flag: Rankings for lines/neighborhoods in Service Quality
const FEATURE_SERVICE_RANKINGS = false;

/**
 * GET /api/bulletin?days=7
 *
 * Always returns a stable shape:
 * {
 *   ok: boolean,
 *   generatedAt: string,
 *   periodDays: number,
 *   summary: { samplesTotal: number, critCount: number, warnCount: number, infoCount: number } | null,
 *   worstStops: [],
 *   worstNeighborhoods: [],
 *   topAlertsCrit: [],
 *   topAlertsWarn: [],
 *   worstLines: [],
 *   serviceQuality: null | { ... },
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
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
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

        // Use service role if available for consolidation tasks
        const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

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

        // 6. Service Quality (User Ratings) - v1.2 Hotfix Street Safe
        const MIN_SAMPLE = 10;
        const MIN_BUCKET = 20;

        interface RatingBucket {
            GOOD: number;
            REGULAR: number;
            BAD: number;
            total: number;
        }

        const { data: ratingsData } = await supabase
            .from('event_service_ratings')
            .select(`
                rating,
                line_id,
                client_event_id,
                event_id,
                lines (code)
            `)
            .gte('rating_at', isoThreshold);

        const ratingsDistribution = (ratingsData || []).reduce(
            (acc, curr) => {
                const r = curr.rating as 'GOOD' | 'REGULAR' | 'BAD';
                acc[r] = (acc[r] || 0) + 1;
                acc.total++;
                return acc;
            },
            { GOOD: 0, REGULAR: 0, BAD: 0, total: 0 } as RatingBucket
        );

        // Initial suppression: if lower than MIN_SAMPLE, return null early
        if (ratingsDistribution.total < MIN_SAMPLE) {
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
                serviceQuality: null,
                notes,
            });
        }

        const calculateScore = (dist: RatingBucket) => {
            if (dist.total === 0) return 0;
            return Math.round(((dist.GOOD * 100) + (dist.REGULAR * 50)) / dist.total);
        };

        const overallScore = calculateScore(ratingsDistribution);

        // Rankings Logic (Only if feature flag is TRUE)
        let topLines: any[] = [];
        let topNeighborhoods: any[] = [];

        if (FEATURE_SERVICE_RANKINGS) {
            // Group by Line
            const lineMetrics = (ratingsData || []).reduce((acc: Record<string, RatingBucket>, curr: any) => {
                const lineCode = curr.lines?.code || 'N/A';
                if (!acc[lineCode]) acc[lineCode] = { GOOD: 0, REGULAR: 0, BAD: 0, total: 0 };
                const r = curr.rating as 'GOOD' | 'REGULAR' | 'BAD';
                acc[lineCode][r]++;
                acc[lineCode].total++;
                return acc;
            }, {});

            topLines = Object.entries(lineMetrics)
                .filter(([_, dist]) => dist.total >= MIN_BUCKET)
                .map(([code, dist]) => ({
                    line_code: code,
                    score: calculateScore(dist),
                    count: dist.total
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            // Group by Neighborhood
            const eventIds = (ratingsData || []).map(r => r.event_id).filter(Boolean);
            const clientIds = (ratingsData || []).map(r => r.client_event_id).filter(Boolean);
            let neighborhoodMap: Record<string, string> = {};

            if (eventIds.length > 0 || clientIds.length > 0) {
                const validEventIds = eventIds.map(id => `'${id}'`).join(',');
                const validClientIds = clientIds.map(id => `'${id}'`).join(',');

                let query = supabase.from('stop_events').select('id, client_event_id, stops(neighborhood)');
                if (eventIds.length > 0 && clientIds.length > 0) {
                    query = query.or(`id.in.(${validEventIds}),client_event_id.in.(${validClientIds})`);
                } else if (eventIds.length > 0) {
                    query = query.in('id', eventIds);
                } else {
                    query = query.in('client_event_id', clientIds);
                }
                const { data: stopEvents } = await query;

                neighborhoodMap = (stopEvents || []).reduce((acc: Record<string, string>, curr: any) => {
                    const neighborhood = curr.stops?.neighborhood;
                    if (neighborhood) {
                        if (curr.id) acc[curr.id] = neighborhood;
                        if (curr.client_event_id) acc[curr.client_event_id] = neighborhood;
                    }
                    return acc;
                }, {});
            }

            const neighborhoodMetrics = (ratingsData || []).reduce((acc: Record<string, RatingBucket>, curr: any) => {
                const neighborhood = neighborhoodMap[curr.event_id] || neighborhoodMap[curr.client_event_id] || 'N/A';
                if (neighborhood === 'N/A') return acc;
                if (!acc[neighborhood]) acc[neighborhood] = { GOOD: 0, REGULAR: 0, BAD: 0, total: 0 };
                const r = curr.rating as 'GOOD' | 'REGULAR' | 'BAD';
                acc[neighborhood][r]++;
                acc[neighborhood].total++;
                return acc;
            }, {});

            topNeighborhoods = Object.entries(neighborhoodMetrics)
                .filter(([_, dist]) => dist.total >= MIN_BUCKET)
                .map(([name, dist]) => ({
                    neighborhood: name,
                    score: calculateScore(dist),
                    count: dist.total
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        }

        const serviceQuality = {
            overallScore,
            totalRatings: ratingsDistribution.total,
            distribution: {
                GOOD: ratingsDistribution.GOOD,
                REGULAR: ratingsDistribution.REGULAR,
                BAD: ratingsDistribution.BAD,
                pct_good: Math.round((ratingsDistribution.GOOD / ratingsDistribution.total) * 100),
                pct_regular: Math.round((ratingsDistribution.REGULAR / ratingsDistribution.total) * 100),
                pct_bad: Math.round((ratingsDistribution.BAD / ratingsDistribution.total) * 100),
            },
            topLines: topLines.length > 0 ? topLines : null,
            topNeighborhoods: topNeighborhoods.length > 0 ? topNeighborhoods : null
        };

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
            serviceQuality,
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
