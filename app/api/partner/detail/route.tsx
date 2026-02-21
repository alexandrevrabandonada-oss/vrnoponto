import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('*')
            .eq('id', id)
            .single();

        if (partnerError || !partner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        const { data: qr } = await supabase
            .from('qr_checkins')
            .select('token_plain')
            .eq('partner_id', id)
            .eq('is_active', true)
            .maybeSingle();

        return NextResponse.json({
            partner,
            qr_token: qr?.token_plain || null
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
