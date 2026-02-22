import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

        const body = await req.json().catch(() => ({}));

        const chat_id = body.chat_id || process.env.TELEGRAM_CHAT_ID;
        if (!chat_id) {
            return NextResponse.json({ error: 'Missing chat_id parameter or TELEGRAM_CHAT_ID env' }, { status: 400 });
        }

        const mode = body.mode || 'DIGEST';
        const severity_min = body.severity_min || 'CRIT';
        const neighborhoods_norm = body.neighborhoods_norm || [];
        const lines = body.lines || [];
        const is_active = body.is_active !== undefined ? body.is_active : true;

        if (!['DIGEST', 'IMMEDIATE'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }
        if (!['WARN', 'CRIT'].includes(severity_min)) {
            return NextResponse.json({ error: 'Invalid severity_min' }, { status: 400 });
        }

        const { data, error } = await supabase.from('telegram_subscriptions').upsert({
            chat_id,
            mode,
            severity_min,
            neighborhoods_norm,
            lines,
            is_active
        }, { onConflict: 'chat_id' }).select().single();

        if (error) {
            console.error('Failed to upsert subscription:', error);
            throw error;
        }

        return NextResponse.json({ success: true, subscription: data });

    } catch (err: unknown) {
        console.error('Subscribe error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
