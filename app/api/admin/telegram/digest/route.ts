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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const providedToken = req.headers.get('authorization')?.replace('Bearer ', '') || searchParams.get('t');

        if (providedToken !== process.env.ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const days = parseInt(searchParams.get('days') || '1');
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
            : 'http://localhost:3000';

        // 1. Fetch DIGEST subscribers
        const { data: subs, error: subsError } = await supabase
            .from('telegram_subscriptions')
            .select('*')
            .eq('is_active', true)
            .eq('mode', 'DIGEST');

        if (subsError) throw subsError;

        if (!subs || subs.length === 0) {
            return NextResponse.json({ sent: 0, message: 'No active DIGEST subscribers' });
        }

        // 2. Fetch recent alerts
        // We can use the existing vw_active_alerts or get_unsent_telegram_alerts. 
        // For digest, we want alerts *created* or *active* in the last N days.
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const { data: alerts, error: alertsError } = await supabase
            .from('vw_active_alerts')
            .select('*')
            .gte('week_start', dateLimit.toISOString().split('T')[0]) as { data: AlertData[] | null, error: unknown };

        if (alertsError) throw alertsError;

        if (!alerts || alerts.length === 0) {
            return NextResponse.json({ sent: 0, message: 'No alerts in the period to digest' });
        }

        const results = { sent: 0, failed: 0, details: [] as Array<{ chat_id: string; error: string | null }> };

        for (const sub of subs) {
            // Filter alerts for this subscriber
            const subAlerts = alerts.filter(a => {
                if (sub.severity_min === 'CRIT' && a.severity !== 'CRIT') return false;
                if (sub.lines && sub.lines.length > 0 && a.alert_type === 'LINE_HEADWAY' && !sub.lines.includes(a.line_code)) return false;
                if (sub.neighborhoods_norm && sub.neighborhoods_norm.length > 0 && a.alert_type === 'STOP_WAIT' && !sub.neighborhoods_norm.includes(a.neighborhood)) return false;
                return true;
            });

            if (subAlerts.length === 0) continue;

            const critAlerts = subAlerts.filter(a => a.severity === 'CRIT');
            const warnAlerts = subAlerts.filter(a => a.severity === 'WARN');

            let message = `📊 *BOLETIM DIÁRIO - VR NO PONTO*\n`;
            message += `Resumo dos alertas de transporte coletivo (${days} dia${days > 1 ? 's' : ''})\n\n`;

            if (critAlerts.length > 0) {
                message += `🚨 *CRÍTICOS (${critAlerts.length})*\n`;
                critAlerts.slice(0, 10).forEach(a => {
                    const type = a.alert_type === 'LINE_HEADWAY' ? `L ${a.line_code}` : `Ponto ${a.target_name}`;
                    const varText = a.delta_pct > 0 ? `+${Math.round(a.delta_pct)}%` : `${Math.round(a.delta_pct)}%`;
                    message += `• ${type}: ${a.metric_p50}m (${varText})\n`;
                });
                if (critAlerts.length > 10) message += `_...e mais ${critAlerts.length - 10}_\n`;
                message += `\n`;
            }

            if (warnAlerts.length > 0) {
                message += `⚠️ *ATENÇÃO (${warnAlerts.length})*\n`;
                warnAlerts.slice(0, 5).forEach(a => {
                    const type = a.alert_type === 'LINE_HEADWAY' ? `L ${a.line_code}` : `Ponto ${a.target_name}`;
                    const varText = a.delta_pct > 0 ? `+${Math.round(a.delta_pct)}%` : `${Math.round(a.delta_pct)}%`;
                    message += `• ${type}: ${a.metric_p50}m (${varText})\n`;
                });
                if (warnAlerts.length > 5) message += `_...e mais ${warnAlerts.length - 5}_\n`;
                message += `\n`;
            }

            message += `🔗 [Painel Completo](${baseUrl}/admin/status)`;

            const res = await sendTelegramMessage(message, { chat_id: sub.chat_id });
            if (res.success) {
                results.sent++;
            } else {
                results.failed++;
                results.details.push({ chat_id: sub.chat_id, error: res.error });
            }
        }

        return NextResponse.json(results);

    } catch (err: unknown) {
        console.error('Digest Error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
