import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, variantKey } = body;

        if (!type || !variantKey || !['impression', 'click'].includes(type) || !['A', 'B'].includes(variantKey)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        // Call the RPC to atomic increment
        const { error } = await supabase.rpc('increment_invite_stat', {
            p_variant_key: variantKey,
            p_stat_type: type
        });

        if (error) {
            console.error('RPC Error incrementing stat:', error);
            // Fallback to inserting a raw impression row if RPC is missing/failed, though it shouldn't happen
        }

        // Also track via telemetry for generic dashboard purposes
        const telemetryEventName = `invite_${type}_${variantKey}`;
        fetch(new URL('/api/telemetry', req.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: telemetryEventName })
        }).catch(() => { });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Unhandled error in invite-stats:', error);
        return NextResponse.json({ ok: true }); // Silent fail, don't break frontend
    }
}
