import Link from 'next/link';
import { ArrowLeft, MapPin, TrendingDown, AlertTriangle, BarChart3, Map as MapIcon } from 'lucide-react';
import { TrustMixBadge } from '@/components/TrustMixBadge';

export const dynamic = 'force-dynamic';

type NeighborhoodRow = {
    neighborhood: string;
    avg_delta_min: number;
    stops_count: number;
    samples_total: number;
    pct_verified_avg: number;
};

async function fetchNeighborhoods(baseUrl: string): Promise<NeighborhoodRow[]> {
    try {
        const res = await fetch(`${baseUrl}/api/neighborhoods?limit=50`, { cache: 'no-store' });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}

export default async function BairrosPage() {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';
    const neighborhoods = await fetchNeighborhoods(baseUrl);

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/mapa" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-medium hidden sm:inline">Voltar</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">RANKING DE BAIRROS</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <MapPin className="text-orange-500" /> Ranking de Bairros
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Bairros com maior defasagem entre o horário oficial e a realidade observada (últimos 30 dias).
                    </p>
                    <Link href="/mapa/bairros" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm mt-2">
                        <MapIcon size={16} /> Ver no mapa
                    </Link>
                </header>

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <div className="text-3xl font-black text-gray-900 dark:text-white">{neighborhoods.length}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Bairros</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <div className="text-3xl font-black text-orange-500">
                            {neighborhoods.length > 0 ? `+${neighborhoods[0]?.avg_delta_min}m` : '--'}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Pior Atraso Médio</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <div className="text-3xl font-black text-gray-900 dark:text-white">
                            {neighborhoods.reduce((a, b) => a + b.stops_count, 0)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Pontos Monitorados</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                        <div className="text-3xl font-black text-gray-900 dark:text-white">
                            {neighborhoods.reduce((a, b) => a + b.samples_total, 0)}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase mt-1">Amostras Totais</div>
                    </div>
                </div>

                {/* Ranking Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-500" />
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Classificação por Atraso Médio</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-5 py-3">#</th>
                                    <th className="px-5 py-3">Bairro</th>
                                    <th className="px-5 py-3 text-right">Atraso Médio</th>
                                    <th className="px-5 py-3 text-center">Pontos</th>
                                    <th className="px-5 py-3 text-center">Amostras</th>
                                    <th className="px-5 py-3 text-center">Confiabilidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {neighborhoods.length === 0 ? (
                                    <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Sem dados suficientes para gerar o ranking.</td></tr>
                                ) : neighborhoods.map((n, i) => {
                                    const severity = n.avg_delta_min > 15 ? 'text-red-600' : n.avg_delta_min > 8 ? 'text-orange-500' : 'text-amber-500';
                                    return (
                                        <tr key={n.neighborhood} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-5 py-4 font-black text-gray-900 dark:text-white">{i + 1}</td>
                                            <td className="px-5 py-4">
                                                <Link href={`/bairro/${encodeURIComponent(n.neighborhood)}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5">
                                                    <MapPin size={14} className="text-gray-400" />
                                                    {n.neighborhood}
                                                </Link>
                                            </td>
                                            <td className={`px-5 py-4 text-right font-black ${severity}`}>
                                                <span className="flex items-center justify-end gap-1">
                                                    <TrendingDown size={14} /> +{n.avg_delta_min} min
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center font-medium text-gray-600 dark:text-gray-300">{n.stops_count}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold">{n.samples_total}</span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <TrustMixBadge total={n.samples_total} pctVerified={n.pct_verified_avg} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-6 rounded-r-2xl">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="text-orange-600 flex-shrink-0" size={28} />
                        <div>
                            <h3 className="text-orange-900 dark:text-orange-400 font-black text-lg">O ranking é baseado em dados de auditoria popular.</h3>
                            <p className="text-orange-800 dark:text-orange-300 text-sm leading-relaxed mt-1">
                                Cada registro de espera fortalece as estatísticas. Quanto mais gente participar, mais forte fica a cobrança por melhorias.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
