import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        let monthParam = searchParams.get('month');

        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            monthParam = `${monthParam}-01`;
        } else {
            monthParam = defaultMonth;
        }

        const supabase = await createClient();

        // 1. Buscar Todos os Pontos do Mês
        const { data: stops, error: stopsError } = await supabase
            .from('vw_monthly_summary_stops')
            .select('*')
            .eq('report_month', monthParam)
            .order('p50_wait_min', { ascending: false });

        if (stopsError) throw stopsError;

        // 2. Buscar Todas as Linhas do Mês
        const { data: lines, error: linesError } = await supabase
            .from('vw_monthly_summary_lines')
            .select('*')
            .eq('report_month', monthParam)
            .order('p50_headway_min', { ascending: false });

        if (linesError) throw linesError;

        // Montar CSV String (Duas tabelas combinadas ou em sequencia)
        let csvContent = `RELATORIO DE MOBILIDADE VR NO PONTO - ${monthParam.substring(0, 7)}\n`;
        csvContent += `METODOLOGIA: Mediana (p50) e P90 em minutos baseadas em crowdsourcing (minimo 3 amostras)\n\n`;

        // Seção Pontos
        csvContent += `--- PONTOS MAIS CRITICOS (ESPERA) ---\n`;
        csvContent += `TIPO,ID,NOME,AMOSTRAS,MEDIANA_MIN,P90_MIN,VAR_MES_ANT_PCT\n`;

        if (stops && stops.length > 0) {
            for (const s of stops) {
                // Escape simple CSV string if contains comma
                const safeName = s.stop_name.includes(',') ? `"${s.stop_name}"` : s.stop_name;
                const delta = s.delta_p50_percent !== null ? s.delta_p50_percent : '';
                csvContent += `PONTO,${s.stop_id},${safeName},${s.total_samples},${s.p50_wait_min},${s.p90_wait_min},${delta}\n`;
            }
        } else {
            csvContent += `Nenhum dado de ponto para este mes\n`;
        }

        csvContent += `\n`;

        // Seção Linhas
        csvContent += `--- LINHAS MAIS CRITICAS (HEADWAY/INTERVALO) ---\n`;
        csvContent += `TIPO,ID,COD_LINHA,NOME_LINHA,AMOSTRAS,MEDIANA_MIN,P90_MIN,VAR_MES_ANT_PCT\n`;

        if (lines && lines.length > 0) {
            for (const l of lines) {
                const safeName = l.line_name.includes(',') ? `"${l.line_name}"` : l.line_name;
                const safeCode = l.line_code || '';
                const delta = l.delta_p50_percent !== null ? l.delta_p50_percent : '';
                csvContent += `LINHA,${l.line_id},${safeCode},${safeName},${l.total_samples},${l.p50_headway_min},${l.p90_headway_min},${delta}\n`;
            }
        } else {
            csvContent += `Nenhum dado de linha para este mes\n`;
        }

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="vrnoponto-${monthParam.substring(0, 7)}.csv"`
            }
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return new NextResponse(`ERROR: ${message}`, { status: 500 });
    }
}
