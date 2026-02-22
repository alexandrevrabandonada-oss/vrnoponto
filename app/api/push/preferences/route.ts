import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get('deviceId');

        if (!deviceId) {
            return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { data, error } = await supabase
            .from('push_preferences')
            .select('*')
            .eq('device_id', deviceId)
            .single();

        if (error && error.code !== 'PGRST116') { // not found
            throw error;
        }

        return NextResponse.json({ preferences: data || null });
    } catch (error) {
        console.error('Fetch prefs error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
