import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // Mês default: atual (YYYY-MM-01)
        const now = new Date();
        const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        let monthParam = searchParams.get('month');

        // Validação básica do formato YYYY-MM
        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            monthParam = `${monthParam}-01`;
        } else {
            monthParam = defaultMonth;
        }

        const supabase = await createClient();

        // 1. Buscar Top 10 Pontos Críticos do mês
        const { data: topStops, error: stopsError } = await supabase
            .from('vw_monthly_summary_stops')
            .select('*')
            .eq('report_month', monthParam)
            .order('p50_wait_min', { ascending: false })
            .limit(10);

        if (stopsError) throw stopsError;

        // 2. Buscar Top 10 Linhas Críticas do mês (Maiores headways)
        const { data: topLines, error: linesError } = await supabase
            .from('vw_monthly_summary_lines')
            .select('*')
            .eq('report_month', monthParam)
            .order('p50_headway_min', { ascending: false })
            .limit(10);

        if (linesError) throw linesError;

        // Retornar JSON unificado
        return NextResponse.json({
            period: monthParam.substring(0, 7), // YYYY-MM
            generated_at: new Date().toISOString(),
            data: {
                topStops: topStops || [],
                topLines: topLines || []
            },
            methodology: {
                metric: "Mediana (p50) e P90 baseadas em contribuições de usuários (crowdsourcing).",
                min_samples_required: 3
            }
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
