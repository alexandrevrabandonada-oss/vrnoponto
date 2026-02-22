import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';

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

        const limit = parseInt(process.env.TELEGRAM_MAX_PER_RUN || '10');
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : 'http://localhost:3000';

        // 1. Fetch active alerts (WARN/CRIT) that haven't been sent to telegram
        const { data: alerts, error: fetchError } = await supabase
            .rpc('get_unsent_telegram_alerts', { lim: limit });

        if (fetchError) throw fetchError;

        if (!alerts || alerts.length === 0) {
            return NextResponse.json({ sent: 0, skipped: 0, message: 'No new alerts to notify' });
        }

        const results = { sent: 0, failed: 0, details: [] as any[] };

        for (const alert of alerts) {
            const isLine = alert.alert_type === 'LINE_HEADWAY';
            const emoji = alert.severity === 'CRIT' ? '🚨' : '⚠️';
            const typeLabel = isLine ? 'LINHA' : 'PONTO';
            const name = alert.target_name || 'Desconhecido';
            const changeLabel = alert.delta_pct > 0 ? 'Piorou' : 'Melhorou';

            // Format message
            let message = `${emoji} *ALERTA DE DESEMPENHO*\n\n`;
            message += `*Setor:* ${typeLabel}\n`;
            message += `*Alvo:* ${name} ${isLine ? `(${alert.line_code})` : ''}\n`;
            if (alert.neighborhood) message += `*Bairro:* ${alert.neighborhood}\n`;
            message += `*Variação:* ${changeLabel} ${Math.abs(alert.delta_pct)}%\n`;
            message += `*Atual:* ${alert.metric_p50} min | *Anterior:* ${alert.prev_metric_p50} min\n\n`;

            const link = isLine
                ? `${baseUrl}/linha/${alert.target_id}`
                : `${baseUrl}/ponto/${alert.target_id}`;

            message += `🔗 [Ver detalhes](${link})`;

            const telegramRes = await sendTelegramMessage(message);

            if (telegramRes.success) {
                await supabase.from('alert_notifications').insert({
                    alert_id: alert.id,
                    channel: 'telegram',
                    status: 'OK'
                });
                results.sent++;
            } else {
                await supabase.from('alert_notifications').insert({
                    alert_id: alert.id,
                    channel: 'telegram',
                    status: 'FAIL',
                    error: telegramRes.error
                });
                results.failed++;
                results.details.push({ id: alert.id, error: telegramRes.error });
            }
        }

        // Summary message if many sent
        if (results.sent >= 3) {
            const summary = `📊 *RESUMO DO DIA*\n\nEnviamos ${results.sent} notificações de performance hoje. Confira o painel completo: ${baseUrl}/admin/status`;
            await sendTelegramMessage(summary);
        }

        return NextResponse.json(results);
    } catch (err: any) {
        console.error('Notify Telegram Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
