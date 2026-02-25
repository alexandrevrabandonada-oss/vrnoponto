import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, lat, lon, token } = body;

        if (!name || lat === undefined || lon === undefined || !token) {
            return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
        }

        const supabase = await createClient(); // Service role via server client

        // 1. Validate Token
        const { data: tokenData, error: tokenError } = await supabase
            .from('operator_tokens')
            .select('*')
            .eq('token', token)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Link expirado ou inválido.' }, { status: 401 });
        }

        // 2. Rate Limit (1/min per token)
        const ONE_MINUTE_AGO = new Date(Date.now() - 60000).toISOString();
        const { count: recentCount } = await supabase
            .from('stop_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('notes', `token:${tokenData.id}`) // Storing token ref in notes for limiting
            .gt('created_at', ONE_MINUTE_AGO);

        if (recentCount && recentCount > 0) {
            return NextResponse.json({ error: 'Aguarde um momento antes de enviar outro.' }, { status: 429 });
        }

        // 3. Rate Limit (30/day per token)
        const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: dailyCount } = await supabase
            .from('stop_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('notes', `token:${tokenData.id}`)
            .gt('created_at', ONE_DAY_AGO);

        if (dailyCount && dailyCount >= 30) {
            return NextResponse.json({ error: 'Limite diário de rascunhos atingido para este link.' }, { status: 429 });
        }

        // 4. Submit Draft
        const pointWKT = `POINT(${lon} ${lat})`;
        const deviceId = request.headers.get('x-device-id') || 'operator-unknown';

        const { error: insertError } = await supabase
            .from('stop_suggestions')
            .insert({
                name_suggested: name.trim(),
                geom: pointWKT,
                source: 'operator',
                device_id: deviceId,
                notes: `token:${tokenData.id}`, // Traceability
                status: 'PENDING'
            });

        if (insertError) throw insertError;

        console.log(`[Telemetry] operator_draft_sent: ${tokenData.label}`);

        return NextResponse.json({
            ok: true,
            message: 'Rascunho enviado para aprovação!'
        });

    } catch (err: unknown) {
        console.error('API /operator/stops/draft:', err);
        return NextResponse.json({ error: 'Erro ao processar rascunho.' }, { status: 500 });
    }
}
