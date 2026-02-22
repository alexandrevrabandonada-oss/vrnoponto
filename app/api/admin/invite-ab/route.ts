import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic Auth Check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Fetch variants to know which exist and their status
        const { data: variants, error: vError } = await supabase
            .from('invite_variants')
            .select('key, title, message, is_active')
            .order('key', { ascending: true });

        if (vError) throw vError;

        // Fetch impressions aggregated over time (e.g. last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isoDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: impressions, error: iError } = await supabase
            .from('invite_impressions')
            .select('variant_key, impressions, clicks')
            .gte('day', isoDate);

        if (iError) throw iError;

        // Fetch partner requests created attribution from telemetry
        const { data: telemetry, error: tError } = await supabase
            .from('telemetry_counts')
            .select('event_key, count')
            .like('event_key', 'partner_request_created_%')
            .gte('date', isoDate);

        if (tError) throw tError;

        // Aggregate results back to variant level
        const results = variants.map(v => {
            const variantImpressions = impressions.filter(i => i.variant_key === v.key).reduce((acc, curr) => acc + curr.impressions, 0);
            const variantClicks = impressions.filter(i => i.variant_key === v.key).reduce((acc, curr) => acc + curr.clicks, 0);

            const reqKey = `partner_request_created_${v.key}`;
            const variantRequests = telemetry.filter(t => t.event_key === reqKey).reduce((acc, curr) => acc + curr.count, 0);

            return {
                key: v.key,
                title: v.title,
                message: v.message,
                is_active: v.is_active,
                metrics: {
                    impressions: variantImpressions,
                    clicks: variantClicks,
                    requests: variantRequests,
                    ctr: variantImpressions > 0 ? (variantClicks / variantImpressions) * 100 : 0,
                    conversionRate: variantClicks > 0 ? (variantRequests / variantClicks) * 100 : 0
                }
            };
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error('API Error in invite-ab GET:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { variantKey, isActive } = body;

        if (!variantKey || typeof isActive !== 'boolean') {
            return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Optional logic: we must have at least one active variant
        if (!isActive) {
            const { count } = await supabase
                .from('invite_variants')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .neq('key', variantKey);

            if (count === 0) {
                return NextResponse.json({ error: 'Cannot disable all variants.' }, { status: 400 });
            }
        }

        const { error } = await supabase
            .from('invite_variants')
            .update({ is_active: isActive })
            .eq('key', variantKey);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('API Error in invite-ab POST:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
