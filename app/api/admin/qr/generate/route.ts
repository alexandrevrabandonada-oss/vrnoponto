import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { stop_id } = await req.json();

        if (!stop_id) {
            return NextResponse.json({ error: 'stop_id is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Verificar se stop existe e é ativo
        const { data: stop, error: stopError } = await supabase
            .from('stops')
            .select('name, is_active')
            .eq('id', stop_id)
            .single();

        if (stopError || !stop) {
            return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
        }

        // 2. Gerar Token Aleatório (32 bytes base64url)
        const token = crypto.randomBytes(32).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 3. Inativar QRs anteriores para este ponto (opcional, mas recomendado)
        await supabase
            .from('qr_checkins')
            .update({ is_active: false })
            .eq('stop_id', stop_id);

        // 4. Salvar Novo QR
        const { error: insertError } = await supabase
            .from('qr_checkins')
            .insert({
                stop_id,
                token_hash: tokenHash,
                is_active: true
            });

        if (insertError) throw insertError;

        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : 'http://localhost:3000';

        return NextResponse.json({
            qr_url: `${baseUrl}/qr/${token}`,
            stop_name: stop.name,
            stop_id: stop_id
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
