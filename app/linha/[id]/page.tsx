import { createClient } from '@/lib/supabase/server';
import { Sparkline } from '@/components/metrics/Sparkline';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateLineCaption } from '@/lib/editorial/templates';
import { PromisedVsRealCard } from '@/components/PromisedVsRealCard';

type WeeklyHeadway = {
    week_start: string;
    p50_headway_min: number;
    p90_headway_min: number;
    samples: number;
};

type Alert = {
    id: string;
    alert_type: string;
    target_id: string;
    week_start: string;
    metric_p50: number;
    prev_metric_p50: number;
    delta_pct: number;
    severity: 'INFO' | 'WARN' | 'CRIT';
    created_at: string;
};

export default async function LinhaDetails({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;
    const supabase = await createClient();
    const lineId = params.id;
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    // Busca detalhes da linha
    const { data: line } = await supabase
        .from('lines')
        .select('*')
        .eq('id', lineId)
        .single();

    if (!line) {
        return <div className="p-8 text-center text-red-500 font-bold">Linha não encontrada.</div>;
    }

    // Busca dados semanais, alertas e trust mix
    const [weeklyRes, alertsRes, trustMixRes] = await Promise.all([
        fetch(`${baseUrl}/api/timeseries/line?line_id=${lineId}&weeks=8`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/alerts?days=30`, { cache: 'no-store' }),
        // Utilizando o Supabase Client para dar bypass numa chamada via fetch na TrustMix
        supabase.from('vw_trust_mix_line_30d').select('total_events, pct_verified').eq('line_id', lineId).single()
    ]);

    const weekly: WeeklyHeadway[] = await weeklyRes.json().catch(() => []);
    const allAlerts: Alert[] = await alertsRes.json().catch(() => []);
    const alerts = allAlerts.filter(a => a.target_id === lineId && a.alert_type === 'LINE_HEADWAY');
    const trustMix = trustMixRes.data;

    const lastWeekly = weekly[weekly.length - 1];
    const prevWeekly = weekly[weekly.length - 2];
    const hasTrend = !!(lastWeekly && prevWeekly);
    const delta = hasTrend ? Math.round(((lastWeekly.p50_headway_min - prevWeekly.p50_headway_min) / prevWeekly.p50_headway_min) * 100) : null;
    const isWorsening = delta !== null && delta > 0;

    // Busca variantes pra podermos linkar a tabela
    const { data: variants } = await supabase
        .from('line_variants')
        .select('id, name')
        .eq('line_id', lineId);

    const variantIds = variants?.map(v => v.id) || [];

    // Busca Tabelas de Horários (PDFs manuais e automáticos da PMVR)
    let schedules: { id: string, title: string, valid_from: string, pdf_path: string, doc_type?: string, meta?: Record<string, string> }[] = [];

    // Constrói a query usando Variante (Upload Manual) OU Line Code (Crawler PMVR)
    let orQuery = `line_code.eq.${line.code}`;
    if (variantIds.length > 0) {
        orQuery = `line_variant_id.in.(${variantIds.join(',')}),` + orQuery;
    }

    const { data: scheds } = await supabase
        .from('official_schedules')
        .select('id, title, valid_from, pdf_path, doc_type, meta')
        .or(orQuery)
        .order('id', { ascending: false });

    if (scheds) schedules = scheds;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl space-y-8">

                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">VIAÇÃO SUL FLUMINENSE</p>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                {line.code} - {line.name}
                            </h1>
                            {trustMix && (
                                <div className="mt-2">
                                    <TrustMixBadge total={trustMix.total_events} pctVerified={trustMix.pct_verified} />
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${line.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {line.is_active ? 'Em Operação' : 'Desativada'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle size={20} />
                            <h2 className="text-lg font-black uppercase tracking-tight">Alertas de Confiabilidade</h2>
                        </div>
                        <div className="space-y-3">
                            {alerts.map(alert => (
                                <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${alert.severity === 'CRIT' ? 'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-900 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-600 text-amber-900 dark:text-amber-400'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm">Aumento no intervalo médio (Headway)</p>
                                            <p className="text-xs opacity-80 mt-1">
                                                Intervalo subiu <span className="font-black">{alert.delta_pct}%</span> nesta semana ({alert.metric_p50}m) vs anterior ({alert.prev_metric_p50}m).
                                            </p>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black ${alert.severity === 'CRIT' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                                            {alert.severity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Editorial Kit */}
                <EditorialCard
                    data={{ line, metrics: lastWeekly }}
                    generator={(d, t) => generateLineCaption(d.line, d.metrics, t)}
                    title="Kit Editorial: Denúncia desta Linha"
                />

                {/* Weekly Trends / Sparkline */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tendência de Intervalo (Headway)</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Mediana de minutos entre ônibus nas últimas 8 semanas</p>
                        </div>
                        {weekly.length >= 2 && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <Sparkline
                                    data={weekly.map(w => ({ week_start: w.week_start, value: w.p50_headway_min, p90: w.p90_headway_min }))}
                                    width={260}
                                    height={50}
                                    color={isWorsening ? '#ef4444' : '#10b981'}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Último p50</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{lastWeekly?.p50_headway_min || '--'}m</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amostras Semana</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{lastWeekly?.samples || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variação 7d</p>
                            <div className={`flex items-center gap-1 text-xl font-black ${delta === null ? 'text-gray-400' : isWorsening ? 'text-red-600' : 'text-emerald-600'}`}>
                                {delta !== null ? (
                                    <>
                                        {isWorsening ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        <span>{isWorsening ? `+${delta}%` : `${delta}%`}</span>
                                    </>
                                ) : (
                                    <span className="text-sm font-normal italic">N/A</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Promised vs Real Hourly Gap */}
                <PromisedVsRealCard lineId={lineId} />

                {/* Tabelas de Horários Officiais */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Horários Oficiais</h2>

                    {schedules.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Nenhuma tabela de horário oficial foi disponibilizada para esta linha ainda.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {schedules.map((sched) => {
                                const isHorario = !sched.doc_type || sched.doc_type === 'HORARIO';
                                const parsedDate = sched.valid_from ? new Date(sched.valid_from).toLocaleDateString('pt-BR') : sched.meta?.em_vigor;
                                const updateDate = sched.meta?.data_atualizacao;

                                return (
                                    <div key={sched.id} className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                        <div className="mb-3 sm:mb-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${isHorario ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {isHorario ? 'HORÁRIOS' : 'ITINERÁRIO'}
                                                </span>
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{sched.title || 'Tabela Oficial'}</p>
                                            </div>

                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                                                {parsedDate && <p>Válido a partir de: {parsedDate}</p>}
                                                {updateDate && <p>Atualizado em: {updateDate}</p>}
                                                {sched.meta?.operator && <p>Operadora: {sched.meta.operator}</p>}
                                            </div>
                                        </div>
                                        <a
                                            href={`${supabaseUrl}/storage/v1/object/public/official/${sched.pdf_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Abrir PDF
                                        </a>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div >
        </main >
    );
}
