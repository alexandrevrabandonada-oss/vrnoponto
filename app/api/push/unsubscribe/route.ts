import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const { deviceId, endpoint } = await req.json();

        if (!deviceId || !endpoint) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { error } = await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('device_id', deviceId)
            .eq('endpoint', endpoint);

        if (error) throw error;

        await supabase
            .from('push_preferences')
            .update({ is_active: false })
            .eq('device_id', deviceId);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
