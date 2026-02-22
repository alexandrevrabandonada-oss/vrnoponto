import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram/sendMessage';

export const dynamic = 'force-dynamic';

interface AlertData {
    id: string;
    alert_type: string;
    target_id: string;
    severity: string;
    delta_pct: number;
    metric_p50: number;
    prev_metric_p50: number;
    target_name: string;
    line_code: string;
    neighborhood: string;
}

interface TelegramResult {
    sent: number;
    failed: number;
    details: Array<{ id: string; error: string | null }>;
}

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
            .rpc('get_unsent_telegram_alerts', { lim: limit }) as { data: AlertData[] | null, error: unknown };

        if (fetchError) throw fetchError;

        if (!alerts || alerts.length === 0) {
            return NextResponse.json({ sent: 0, skipped: 0, message: 'No new alerts to notify' });
        }

        // Fetch IMMEDIATE subscribers
        const { data: subs, error: subsError } = await supabase
            .from('telegram_subscriptions')
            .select('*')
            .eq('is_active', true)
            .eq('mode', 'IMMEDIATE');

        if (subsError) throw subsError;

        // Fallback to env chat_id if no subs (for backward compatibility before users subscribe)
        const activeSubs = subs && subs.length > 0 ? subs : [];
        const fallbackChatId = process.env.TELEGRAM_CHAT_ID;
        if (activeSubs.length === 0 && fallbackChatId) {
            activeSubs.push({ chat_id: fallbackChatId, severity_min: 'WARN', lines: [], neighborhoods_norm: [] });
        }

        const results: TelegramResult = { sent: 0, failed: 0, details: [] };

        for (const alert of alerts) {
            const isLine = alert.alert_type === 'LINE_HEADWAY';
            const emoji = alert.severity === 'CRIT' ? '🚨' : '⚠️';
            const typeLabel = isLine ? 'LINHA' : 'PONTO';
            const name = alert.target_name || 'Desconhecido';
            const changeLabel = alert.delta_pct > 0 ? 'Piorou' : 'Melhorou';

            // Filter subscribers for this alert
            const validSubs = activeSubs.filter(sub => {
                if (sub.severity_min === 'CRIT' && alert.severity !== 'CRIT') return false;
                if (isLine && sub.lines && sub.lines.length > 0 && !sub.lines.includes(alert.line_code)) return false;
                if (!isLine && sub.neighborhoods_norm && sub.neighborhoods_norm.length > 0 && !sub.neighborhoods_norm.includes(alert.neighborhood)) return false;
                return true;
            });

            if (validSubs.length === 0) {
                // Mark as OK even if nobody received it so we don't spam later, or leave it?
                // Just mark it as processed and skipped.
                await supabase.from('alert_notifications').insert({
                    alert_id: alert.id,
                    channel: 'telegram',
                    status: 'SKIPPED'
                });
                continue;
            }

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

            let allFailed = true;
            for (const sub of validSubs) {
                const telegramRes = await sendTelegramMessage(message, { chat_id: sub.chat_id });
                if (telegramRes.success) {
                    allFailed = false;
                    results.sent++;
                } else {
                    results.failed++;
                    results.details.push({ id: alert.id, error: telegramRes.error });
                }
            }

            if (!allFailed) {
                await supabase.from('alert_notifications').insert({
                    alert_id: alert.id,
                    channel: 'telegram',
                    status: 'OK'
                });
            } else {
                await supabase.from('alert_notifications').insert({
                    alert_id: alert.id,
                    channel: 'telegram',
                    status: 'FAIL',
                    error: 'All deliveries failed'
                });
            }
        }

        return NextResponse.json(results);
    } catch (err: unknown) {
        console.error('Notify Telegram Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
