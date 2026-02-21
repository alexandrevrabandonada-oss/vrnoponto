import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { stop_id, partner_id } = await req.json();

        if (!stop_id && !partner_id) {
            return NextResponse.json({ error: 'stop_id or partner_id is required' }, { status: 400 });
        }

        const supabase = await createClient();
        let name = '';

        if (stop_id) {
            const { data: stop, error: stopError } = await supabase
                .from('stops')
                .select('name')
                .eq('id', stop_id)
                .single();
            if (stopError || !stop) return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
            name = stop.name;
        } else {
            const { data: partner, error: partnerError } = await supabase
                .from('partners')
                .select('name')
                .eq('id', partner_id)
                .single();
            if (partnerError || !partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
            name = partner.name;
        }

        // 2. Gerar Token Aleatório
        const token = crypto.randomBytes(32).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 3. Inativar QRs anteriores
        const query = supabase.from('qr_checkins').update({ is_active: false });
        if (stop_id) query.eq('stop_id', stop_id);
        else query.eq('partner_id', partner_id);
        await query;

        // 4. Salvar Novo QR
        const { error: insertError } = await supabase
            .from('qr_checkins')
            .insert({
                stop_id: stop_id || null,
                partner_id: partner_id || null,
                token_hash: tokenHash,
                is_active: true
            });

        if (insertError) throw insertError;

        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : 'http://localhost:3000';

        return NextResponse.json({
            qr_url: `${baseUrl}/qr/${token}`,
            name,
            id: stop_id || partner_id
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
