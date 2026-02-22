import { Calendar, Download, Share2, Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateMonthlyCaption } from '@/lib/editorial/templates';
import { TrustMixBadge } from '@/components/TrustMixBadge';

export const dynamic = 'force-dynamic';

function getMonthsList() {
    // Retorna os últimos 6 meses no formato YYYY-MM
    const months = [];
    const d = new Date();
    // Start at current month, go back 6
    for (let i = 0; i < 6; i++) {
        const year = d.getFullYear();
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${monthStr}`);
        d.setMonth(d.getMonth() - 1);
    }
    return months;
}

function formatMonthLabel(yyyyMM: string) {
    const [y, m] = yyyyMM.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function DeltaBadge({ percent }: { percent: number | null }) {
    if (percent === null) return <span className="text-gray-400 text-xs flex items-center gap-1"><Minus size={12} /> --</span>;
    if (percent > 0) return <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5"><ArrowUpRight size={12} /> +{percent}% piora</span>;
    if (percent < 0) return <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5"><ArrowDownRight size={12} /> {percent}% melhora</span>;
    return <span className="text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5"><Minus size={12} /> 0%</span>;
}

export default async function MonthlyReportPage({ searchParams }: { searchParams: { m?: string } }) {
    const months = getMonthsList();
    const currentMonth = searchParams.m || months[0];

    // Fetch the data
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';
    let data = null;
    let errorMsg = null;

    try {
        const res = await fetch(`${baseUrl}/api/report/monthly?month=${currentMonth}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Não foi possível carregar os dados');
        const json = await res.json();
        data = json.data;
        data.trust_mix = json.trust_mix;
    } catch (e: unknown) {
        if (e instanceof Error) errorMsg = e.message;
    }

    const reportUrl = `${baseUrl}/relatorio/mensal?m=${currentMonth}`;

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Relatório Público Mensal
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 mb-2">
                            Análise de mobilidade e confiabilidade do transporte em Volta Redonda.
                        </p>
                        {data?.trust_mix && (
                            <TrustMixBadge total={data.trust_mix.total_events} pctVerified={data.trust_mix.pct_verified} />
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <form action="/relatorio/mensal" method="GET">
                                <select
                                    name="m"
                                    onChange={(e) => e.target.form?.submit()}
                                    defaultValue={currentMonth}
                                    className="pl-9 pr-8 py-2 w-full appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium shadow-sm focus:ring-2 focus:ring-brand"
                                >
                                    {months.map(m => (
                                        <option key={m} value={m}>{formatMonthLabel(m)}</option>
                                    ))}
                                </select>
                            </form>
                        </div>
                        <div className="flex gap-2">
                            <a href={`/api/report/monthly.csv?month=${currentMonth}`} download className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-black dark:text-white shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
                                <Download size={16} /> JSON/CSV
                            </a>
                            <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira o relatório do VR no Ponto deste mês: ${reportUrl}`)}`} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-2 bg-brand hover:brightness-110 text-black rounded-lg font-bold shadow-sm transition">
                                <Share2 size={16} /> Compartilhar
                            </a>
                        </div>
                    </div>
                </div>

                {errorMsg && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                        {errorMsg}
                    </div>
                )}

                {/* Resumo */}
                {!errorMsg && data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Ponto mais Crítico</h3>
                            {data.topStops?.length > 0 ? (
                                <div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                                        {data.topStops[0].stop_name.toLowerCase()}
                                    </div>
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="text-red-600 dark:text-red-400 font-bold">
                                            {data.topStops[0].p50_wait_min} min de espera
                                        </div>
                                        <DeltaBadge percent={data.topStops[0].delta_p50_percent} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">Dados insuficientes neste mês.</p>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Linha mais Irregular</h3>
                            {data.topLines?.length > 0 ? (
                                <div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-lg">{data.topLines[0].line_code}</span>
                                        <span className="capitalize">{data.topLines[0].line_name.toLowerCase()}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="text-amber-600 dark:text-amber-400 font-bold">
                                            {data.topLines[0].p50_headway_min} min de intervalo
                                        </div>
                                        <DeltaBadge percent={data.topLines[0].delta_p50_percent} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">Dados insuficientes neste mês.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Editorial Kit */}
                {!errorMsg && data && (
                    <EditorialCard
                        data={{ ...data, month: formatMonthLabel(currentMonth) }}
                        generator={generateMonthlyCaption}
                        title="Kit Editorial: Resumo Mensal"
                    />
                )}

                {/* Tabelas de Ranking */}
                {!errorMsg && data && (
                    <div className="space-y-8">

                        {/* Pontos Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="font-bold text-gray-900 dark:text-white">Top 10: Pontos com Maior Espera</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Rank</th>
                                            <th className="px-6 py-3 font-semibold">Ponto</th>
                                            <th className="px-6 py-3 font-semibold text-right">Mediana (p50)</th>
                                            <th className="px-6 py-3 font-semibold text-right">Crítico (p90)</th>
                                            <th className="px-6 py-3 font-semibold text-center">Confiabilidade</th>
                                            <th className="px-6 py-3 font-semibold text-right">Var. %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {data.topStops?.map((s: { stop_id: string; stop_name: string; p50_wait_min: number; p90_wait_min: number; delta_p50_percent: number | null; trust_mix?: { total_events: number; pct_verified: number } | null }, i: number) => (
                                            <tr key={s.stop_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-black text-gray-400">#{i + 1}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.stop_name}</td>
                                                <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">{s.p50_wait_min}m</td>
                                                <td className="px-6 py-4 text-right text-gray-500">{s.p90_wait_min}m</td>
                                                <td className="px-6 py-4 text-center">
                                                    {s.trust_mix ? (
                                                        <TrustMixBadge total={s.trust_mix.total_events} pctVerified={s.trust_mix.pct_verified} />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end">
                                                    <DeltaBadge percent={s.delta_p50_percent} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Linhas Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="font-bold text-gray-900 dark:text-white">Top 10: Linhas com Maior Intervalo (Headway)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Rank</th>
                                            <th className="px-6 py-3 font-semibold">Linha</th>
                                            <th className="px-6 py-3 font-semibold text-right">Mediana (p50)</th>
                                            <th className="px-6 py-3 font-semibold text-right">Crítico (p90)</th>
                                            <th className="px-6 py-3 font-semibold text-center">Confiabilidade</th>
                                            <th className="px-6 py-3 font-semibold text-right">Var. %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {data.topLines?.map((l: { line_id: string; line_code: string; line_name: string; p50_headway_min: number; p90_headway_min: number; delta_p50_percent: number | null; trust_mix?: { total_events: number; pct_verified: number } | null }, i: number) => (
                                            <tr key={l.line_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 font-black text-gray-400">#{i + 1}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-900 dark:text-white mr-2">{l.line_code}</span>
                                                    <span className="text-gray-500">{l.line_name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-amber-600 dark:text-amber-400">{l.p50_headway_min}m</td>
                                                <td className="px-6 py-4 text-right text-gray-500">{l.p90_headway_min}m</td>
                                                <td className="px-6 py-4 text-center">
                                                    {l.trust_mix ? (
                                                        <TrustMixBadge total={l.trust_mix.total_events} pctVerified={l.trust_mix.pct_verified} />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end">
                                                    <DeltaBadge percent={l.delta_p50_percent} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

                {/* Aviso / Footer */}
                <div className="bg-brand/10 text-brand rounded-xl p-6 flex flex-col sm:flex-row gap-4 border border-brand/20">
                    <Info className="flex-shrink-0" size={24} />
                    <div className="text-sm space-y-2 leading-relaxed">
                        <p>
                            <strong>Aviso de Metodologia:</strong> Os dados deste relatório mensal são construídos de forma colaborativa (`crowdsourcing`), ou seja, alimentados pelos próprios passageiros que usam o sistema <em>VR no Ponto</em>.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Mediana (p50):</strong> Indica que 50% dos tempos reais registrados foram menores ou iguais a este valor. Utilizamos a mediana para eliminar pontos fora da curva (dados incorretos/extremos).</li>
                            <li><strong>Crítico (p90):</strong> Indica o tempo em que 90% das passagens ocorreram (cenário de alta espera).</li>
                            <li>Apenas pontos/linhas com <strong>Mínimo de 3 amostras</strong> validadas no mês aparecem na consolidação final.</li>
                        </ul>
                    </div>
                </div>

            </div>
        </main>
    );
}
