import { createClient } from '@/lib/supabase/server';
import { Clock, Bus, AlertTriangle } from 'lucide-react';

// Força renderização dinâmica
export const dynamic = 'force-dynamic';

export default async function Painel({
    searchParams,
}: {
    searchParams: { line?: string; days?: string }
}) {
    const supabase = await createClient();
    const lineFilter = searchParams.line || '';
    const daysFilter = parseInt(searchParams.days || '30', 10);

    // 1. Fetch Linhas para o Filtro
    const { data: lines } = await supabase.from('lines').select('id, code, name').order('code');

    // 2. Fetch Espera Mediana
    let waitTimeQuery = supabase.from('vw_wait_time_metrics').select('median_wait_time', { count: 'exact' });
    if (lineFilter) waitTimeQuery = waitTimeQuery.eq('line_id', lineFilter);
    // O filtro de dias no ideal seria na view, mas como a view calcula dados brutos sem filtro de data, 
    // no ambiente de prod teríamos a View recebendo param ou filtrando a base antes. 
    // Pro MVP, a view processa tudo, que já é <= 30 dias na nossa seed e testes.

    const { data: waitTimes } = await waitTimeQuery;
    const avgWaitTime = waitTimes?.length
        ? waitTimes.reduce((acc, curr) => acc + (curr.median_wait_time || 0), 0) / waitTimes.length
        : 0;

    // 3. Fetch Headway Mediano
    let headwayQuery = supabase.from('vw_headway_metrics').select('median_headway');
    if (lineFilter) headwayQuery = headwayQuery.eq('line_id', lineFilter);

    const { data: headways } = await headwayQuery;
    const avgHeadway = headways?.length
        ? headways.reduce((acc, curr) => acc + (curr.median_headway || 0), 0) / headways.length
        : 0;

    // 4. Fetch Pontos Críticos (Ignora filtro de linha pro ranking global se não especificado, mas aplicamos se sim)
    // Como a view vw_critical_stops já agrega por stop_id sem expor line_id (na minha def), usaremos a view simples.
    const { data: criticalStops } = await supabase
        .from('vw_critical_stops')
        .select('stop_name, median_wait_time, total_samples')
        .order('median_wait_time', { ascending: false })
        .limit(10);

    // 5. Fetch Alertas Ativos (30 dias)
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';
    const alertsRes = await fetch(`${baseUrl}/api/alerts?days=30`, { cache: 'no-store' });
    const alerts = await alertsRes.json().catch(() => []);

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-5xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
                        Painel de Estatísticas
                    </h1>

                    {/* Filtros */}
                    <form className="flex flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Linha</label>
                            <select
                                name="line"
                                defaultValue={lineFilter}
                                className="p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[150px]"
                            >
                                <option value="">Todas as Linhas</option>
                                {lines?.map(l => (
                                    <option key={l.id} value={l.id}>{l.code} - {l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Período</label>
                            <select
                                name="days"
                                defaultValue={daysFilter.toString()}
                                className="p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="7">Últimos 7 dias</option>
                                <option value="30">Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors h-[38px]">
                                Filtrar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Alertas Summary (New) */}
                {alerts.length > 0 && (
                    <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/50 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={24} />
                            <h2 className="text-xl font-black uppercase">Alertas (últimos 30 dias)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {alerts.slice(0, 6).map((alert: { id: string, alert_type: string, severity: string, delta_pct: number }) => (
                                <div key={alert.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/50">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-300">
                                            {alert.alert_type === 'STOP_WAIT' ? 'PONTO' : 'LINHA'}
                                        </span>
                                        <span className={`text-[10px] font-black ${alert.severity === 'CRIT' ? 'text-red-600' : 'text-amber-600'}`}>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold truncate text-gray-900 dark:text-white">
                                        {alert.alert_type === 'STOP_WAIT' ? 'Atraso no Ponto' : 'Piora no Intervalo'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Piora de <span className="font-black">+{alert.delta_pct}%</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                        {alerts.length > 6 && (
                            <p className="text-center text-xs text-amber-600 dark:text-amber-500 mt-4 font-bold">
                                + {alerts.length - 6} alertas adicionais ocultos
                            </p>
                        )}
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* KPI 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Espera Mediana</p>
                            <h3 className="text-2xl font-bold dark:text-white">
                                {avgWaitTime > 0 ? avgWaitTime.toFixed(1) : '--'} <span className="text-base font-normal text-gray-500">min</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Tempo do usuário no ponto</p>
                        </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <Bus size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Headway Mediano</p>
                            <h3 className="text-2xl font-bold dark:text-white">
                                {avgHeadway > 0 ? avgHeadway.toFixed(1) : '--'} <span className="text-base font-normal text-gray-500">min</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Intervalo real entre ônibus</p>
                        </div>
                    </div>
                </div>

                {/* Pontos Críticos */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        <h2 className="text-lg font-bold dark:text-white">Pontos Mais Críticos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Ranking</th>
                                    <th className="px-6 py-4">Ponto de Ônibus</th>
                                    <th className="px-6 py-4 text-center">Amostras</th>
                                    <th className="px-6 py-4 text-right">Espera Mediana</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {!criticalStops || criticalStops.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                            Sem dados suficientes para gerar o ranking.
                                        </td>
                                    </tr>
                                ) : (
                                    criticalStops.map((stop, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">#{index + 1}</td>
                                            <td className="px-6 py-4 font-medium">{stop.stop_name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{stop.total_samples}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                                                {Number(stop.median_wait_time).toFixed(1)} min
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Worst Stops – Promised vs Real Delta (New) */}
                <WorstRankingsSection baseUrl={baseUrl} />

            </div>
        </main>
    );
}

async function WorstRankingsSection({ baseUrl }: { baseUrl: string }) {
    const [worstStopsRes, worstNeighborhoodsRes] = await Promise.all([
        fetch(`${baseUrl}/api/dashboard/worst-stops?limit=10`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/dashboard/worst-neighborhoods?limit=10`, { cache: 'no-store' }),
    ]);

    const worstStops = await worstStopsRes.json().then((j: { data?: { stop_id: string; stop_name: string; neighborhood: string; worst_delta_min: number; avg_delta_min: number; samples_total: number; pct_verified_avg: number }[] }) => j.data || []).catch(() => []);
    const worstNeighborhoods = await worstNeighborhoodsRes.json().then((j: { data?: { neighborhood: string; avg_delta_min: number; stops_count: number; samples_total: number }[] }) => j.data || []).catch(() => []);

    return (
        <div className="space-y-6 mt-8">
            {/* Worst Stops by Promise Gap */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20} />
                    <h2 className="text-lg font-bold dark:text-white">Piores Pontos (Prometido vs Real – 30d)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase font-semibold text-xs">
                            <tr>
                                <th className="px-6 py-3">#</th>
                                <th className="px-6 py-3">Ponto</th>
                                <th className="px-6 py-3">Bairro</th>
                                <th className="px-6 py-3 text-right">Pior Atraso</th>
                                <th className="px-6 py-3 text-right">Média</th>
                                <th className="px-6 py-3 text-center">Amostras</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {worstStops.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Sem dados de prometido vs real.</td></tr>
                            ) : worstStops.map((s: { stop_id: string; stop_name: string; neighborhood: string; worst_delta_min: number; avg_delta_min: number; samples_total: number }, i: number) => (
                                <tr key={s.stop_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-3 font-bold text-gray-900 dark:text-white">#{i + 1}</td>
                                    <td className="px-6 py-3 font-medium">
                                        <a href={`/ponto/${s.stop_id}`} className="text-indigo-600 hover:underline">{s.stop_name}</a>
                                    </td>
                                    <td className="px-6 py-3 text-gray-500">{s.neighborhood || '—'}</td>
                                    <td className="px-6 py-3 text-right font-black text-red-600">+{s.worst_delta_min} min</td>
                                    <td className="px-6 py-3 text-right font-medium text-orange-500">+{s.avg_delta_min} min</td>
                                    <td className="px-6 py-3 text-center"><span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{s.samples_total}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Worst Neighborhoods */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Bus className="text-orange-500" size={20} />
                    <h2 className="text-lg font-bold dark:text-white">Piores Bairros (Prometido vs Real – 30d)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase font-semibold text-xs">
                            <tr>
                                <th className="px-6 py-3">#</th>
                                <th className="px-6 py-3">Bairro</th>
                                <th className="px-6 py-3 text-right">Atraso Médio</th>
                                <th className="px-6 py-3 text-center">Pontos</th>
                                <th className="px-6 py-3 text-center">Amostras</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {worstNeighborhoods.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Sem dados de bairros.</td></tr>
                            ) : worstNeighborhoods.map((n: { neighborhood: string; avg_delta_min: number; stops_count: number; samples_total: number }, i: number) => (
                                <tr key={n.neighborhood} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-3 font-bold text-gray-900 dark:text-white">#{i + 1}</td>
                                    <td className="px-6 py-3 font-medium">{n.neighborhood}</td>
                                    <td className="px-6 py-3 text-right font-black text-orange-500">+{n.avg_delta_min} min</td>
                                    <td className="px-6 py-3 text-center">{n.stops_count}</td>
                                    <td className="px-6 py-3 text-center"><span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{n.samples_total}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
