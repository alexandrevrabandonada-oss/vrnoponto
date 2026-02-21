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

        // 3. Buscar Trust Mix (Confiabilidade)
        // 3.1 Global da Cidade
        const { data: cityTrust } = await supabase
            .from('vw_trust_mix_city_30d')
            .select('*')
            .single();

        // 3.2 Por Ponto (apenas para os top 10 retornados)
        const stopIds = topStops?.map(s => s.stop_id) || [];
        const { data: stopsTrustMix } = await supabase
            .from('vw_trust_mix_stop_30d')
            .select('*')
            .in('stop_id', stopIds);

        const stopTrustMap = new Map();
        if (stopsTrustMix) {
            stopsTrustMix.forEach(t => stopTrustMap.set(t.stop_id, t));
        }

        // 3.3 Por Linha (apenas para as top 10 retornadas)
        const lineIds = topLines?.map(l => l.line_id) || [];
        const { data: linesTrustMix } = await supabase
            .from('vw_trust_mix_line_30d')
            .select('*')
            .in('line_id', lineIds);

        const lineTrustMap = new Map();
        if (linesTrustMix) {
            linesTrustMix.forEach(t => lineTrustMap.set(t.line_id, t));
        }

        // 4. Formatar arrays unindo os dados
        const formattedStops = topStops?.map(s => ({
            ...s,
            trust_mix: stopTrustMap.get(s.stop_id) || null
        })) || [];

        const formattedLines = topLines?.map(l => ({
            ...l,
            trust_mix: lineTrustMap.get(l.line_id) || null
        })) || [];

        // Retornar JSON unificado
        return NextResponse.json({
            period: monthParam.substring(0, 7), // YYYY-MM
            generated_at: new Date().toISOString(),
            data: {
                topStops: formattedStops,
                topLines: formattedLines
            },
            trust_mix: cityTrust || null,
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
