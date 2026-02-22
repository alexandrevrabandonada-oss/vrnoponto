import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Bus, Clock, Users, ShieldCheck, Download, History as HistoryIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { Sparkline } from '@/components/Sparkline';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateNeighborhoodDetailCaption } from '@/lib/editorial/templates';

export const dynamic = 'force-dynamic';

type Summary = { neighborhood: string; avg_delta_min: number | null; stops_count: number; samples_total: number; pct_verified_avg: number };
type StopRow = { stop_id: string; stop_name: string; worst_delta_min: number; avg_delta_min: number; samples_total: number; pct_verified_avg: number };
type LineRow = { line_id: string; line_code: string; line_name: string; avg_delta_min: number; samples_total: number; pct_verified_avg: number };
type MonthlyHistoryItem = { month_start: string; neighborhood_norm: string; avg_delta_min: number; samples_total: number; pct_verified_avg: number };

async function fetchDetail(name: string, baseUrl: string) {
    const res = await fetch(`${baseUrl}/api/neighborhood/detail?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<{ summary: Summary; topStops: StopRow[]; topLines: LineRow[] }>;
}

async function fetchHistory(name: string, baseUrl: string): Promise<MonthlyHistoryItem[]> {
    const res = await fetch(`${baseUrl}/api/neighborhood/history?slug=${encodeURIComponent(name)}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
}

export default async function BairroDetailPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const neighborhoodName = decodeURIComponent(params.slug);
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    const [data, history] = await Promise.all([
        fetchDetail(neighborhoodName, baseUrl),
        fetchHistory(neighborhoodName, baseUrl)
    ]);

    if (!data) notFound();

    const { summary, topStops, topLines } = data;
    const sparkData = history.map((h: MonthlyHistoryItem) => h.avg_delta_min);

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            {/* Nav */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/bairros" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-medium hidden sm:inline">Ranking de Bairros</span>
                    </Link>
                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">DIAGNÓSTICO DO BAIRRO</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <MapPin className="text-orange-500" /> {summary.neighborhood}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Prometido vs Real nos últimos 30 dias.</p>
                </header>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-orange-500 transition-all text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-2"><Clock size={16} /><span className="text-xs font-bold uppercase">Atraso Médio</span></div>
                        <div className="text-3xl font-black text-orange-500">{summary.avg_delta_min !== null ? `+${summary.avg_delta_min}m` : '--'}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-2"><MapPin size={16} /><span className="text-xs font-bold uppercase">Pontos</span></div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{summary.stops_count}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-2"><Users size={16} /><span className="text-xs font-bold uppercase">Amostras</span></div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{summary.samples_total}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-2"><ShieldCheck size={16} /><span className="text-xs font-bold uppercase">Verificado</span></div>
                        <div className="text-3xl font-black text-emerald-500">{summary.pct_verified_avg}%</div>
                    </div>
                </div>

                {/* Monthly Performance Section */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HistoryIcon size={18} className="text-indigo-600" />
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Performance Mensal</h2>
                        </div>
                        {sparkData.length > 1 && (
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Tendência 12m</span>
                                <Sparkline data={sparkData} width={120} height={30} />
                            </div>
                        )}
                    </div>
                    <div className="p-5">
                        {history.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-4">Sem dados históricos suficientes para este bairro.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {history.slice(-3).reverse().map((h: MonthlyHistoryItem, i: number) => {
                                    const prev = history[history.length - (3 - i) - 1];
                                    const diff = prev ? h.avg_delta_min - prev.avg_delta_min : null;
                                    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(h.month_start + 'T12:00:00Z'));

                                    return (
                                        <div key={h.month_start} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
                                            <div className="text-[10px] font-black text-gray-400 uppercase mb-2">{monthName} / {new Date(h.month_start).getFullYear()}</div>
                                            <div className="flex items-end justify-between">
                                                <div className="text-xl font-black text-gray-900 dark:text-white">+{h.avg_delta_min}m</div>
                                                {diff !== null && diff !== 0 && (
                                                    <div className={`text-[10px] font-bold flex items-center gap-0.5 ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                        {Math.abs(diff).toFixed(1)}m
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Top Stops */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <MapPin size={18} className="text-red-500" />
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Pontos Mais Críticos</h2>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {topStops.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Sem dados de pontos neste bairro.</div>
                        ) : topStops.slice(0, 10).map((s: StopRow, i: number) => (
                            <Link key={s.stop_id} href={`/ponto/${s.stop_id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-gray-400 w-6">{i + 1}</span>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{s.stop_name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{s.samples_total} amostras</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <TrustMixBadge total={s.samples_total} pctVerified={s.pct_verified_avg} />
                                    <span className="font-black text-red-500 text-sm">+{s.worst_delta_min}m</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Top Lines */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <Bus size={18} className="text-indigo-500" />
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Linhas Mais Problemáticas</h2>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {topLines.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Sem dados de linhas neste bairro.</div>
                        ) : topLines.map((l: LineRow, i: number) => (
                            <Link key={l.line_id} href={`/linha/${l.line_id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-gray-400 w-6">{i + 1}</span>
                                    <div>
                                        <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold mr-2">{l.line_code}</span>
                                        <span className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{l.line_name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">{l.samples_total} amostras</span>
                                    <span className="font-black text-orange-500 text-sm">+{l.avg_delta_min}m</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Editorial Kit */}
                <EditorialCard
                    data={{ ...summary, topStop: topStops[0] || null }}
                    generator={generateNeighborhoodDetailCaption}
                    title="Kit Editorial: Legenda para este Bairro"
                />

                {/* Download Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <a
                        href={`/api/bulletin/worst-neighborhoods-card?format=square&limit=5`}
                        target="_blank"
                        className="flex items-center justify-center gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-5 rounded-2xl border border-orange-200 dark:border-orange-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <Download size={20} /> Card Bairros (Feed)
                    </a>
                    <a
                        href={`/api/bulletin/worst-neighborhoods-card?format=story&limit=5`}
                        target="_blank"
                        className="flex items-center justify-center gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-5 rounded-2xl border border-orange-200 dark:border-orange-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <Download size={20} /> Card Bairros (Story)
                    </a>
                </div>
            </div>
        </main>
    );
}
