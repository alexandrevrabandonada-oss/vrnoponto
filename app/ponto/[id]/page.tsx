import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Share2, TrendingDown, TrendingUp, Users, MapPin, ShieldAlert, BadgeAlert } from 'lucide-react';
import Link from 'next/link';

// Tipagem baseada na API
type PointDetail = {
    stop: { id: string; name: string; neighborhood: string; is_active: boolean };
    metrics: { p50_wait_min: number | null; p90_wait_min: number | null; samples: number; delta_7d_pct: number | null };
    lines: Array<{ line_id: string; line_code: string; line_name: string; p50_wait_min: number; samples: number }>;
};

async function getPointData(id: string, baseUrl: string): Promise<PointDetail> {
    const res = await fetch(`${baseUrl}/api/point/detail?stop_id=${id}`, { cache: 'no-store' });
    if (!res.ok) {
        if (res.status === 404) notFound();
        throw new Error('Falha ao carregar dados do ponto');
    }
    return res.json();
}

export default async function PontoDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    const data = await getPointData(params.id, baseUrl);
    const { stop, metrics, lines } = data;

    const hasTrend = metrics.delta_7d_pct !== null;
    const isWorsening = hasTrend && metrics.delta_7d_pct! > 0;

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            {/* Top Bar Navigation */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/mapa" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-medium hidden sm:inline">Voltar ao Mapa</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">AUDITORIA POPULAR</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Header Section */}
                <header className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                {stop.name}
                            </h1>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1">
                                <MapPin size={18} className="text-red-500" />
                                <span className="font-medium">{stop.neighborhood}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs font-mono uppercase">ID: {stop.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* MEDIANA */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-2 border-transparent shadow-sm hover:border-indigo-500 transition-all">
                        <div className="flex items-center gap-2 text-gray-500 mb-3">
                            <Clock size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Espera Mediana</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">
                                {metrics.p50_wait_min ? `${metrics.p50_wait_min}m` : '--'}
                            </span>
                            {metrics.p50_wait_min && <span className="text-xs font-bold text-gray-400">P50</span>}
                        </div>
                    </div>

                    {/* PIOR CASO P90 */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-red-500 transition-all">
                        <div className="flex items-center gap-2 text-gray-500 mb-3">
                            <BadgeAlert size={18} className="text-red-500" />
                            <span className="text-xs font-bold uppercase tracking-wider">Atraso Crítico</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">
                                {metrics.p90_wait_min ? `${metrics.p90_wait_min}m` : '--'}
                            </span>
                            {metrics.p90_wait_min && <span className="text-xs font-bold text-gray-400">P90</span>}
                        </div>
                    </div>

                    {/* AMOSTRAS */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-3">
                            <Users size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Amostras (30d)</span>
                        </div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white">
                            {metrics.samples}
                        </div>
                    </div>

                    {/* TENDÊNCIA */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Tendência 7d</span>
                        </div>
                        {hasTrend ? (
                            <div className={`flex items-center gap-2 font-black text-xl ${isWorsening ? 'text-red-600' : 'text-emerald-600'}`}>
                                {isWorsening ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                <span>{isWorsening ? `+${metrics.delta_7d_pct}%` : `${metrics.delta_7d_pct}%`}</span>
                            </div>
                        ) : (
                            <span className="text-gray-400 font-medium italic text-sm">Dados insuficientes</span>
                        )}
                    </div>
                </div>

                {/* Audit Action / Alert */}
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-6 rounded-r-2xl">
                    <div className="flex items-start gap-4">
                        <ShieldAlert className="text-red-600 flex-shrink-0" size={32} />
                        <div>
                            <h3 className="text-red-900 dark:text-red-400 font-black text-lg">Isto é uma auditoria popular.</h3>
                            <p className="text-red-800 dark:text-red-300 text-sm leading-relaxed mt-1">
                                Os tempos acima são baseados em relatos de usuários reais. Use estes dados para cobrar melhorias da prefeitura.
                                Compartilhe este relatório para mostrar a realidade do transporte em {stop.neighborhood}.
                            </p>
                            <button
                                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full inline-flex items-center gap-2 shadow-lg shadow-red-200 dark:shadow-none transition-transform active:scale-95"
                                onClick={() => { /* Implementar share via browser API se disponível */ }}
                            >
                                <Share2 size={18} />
                                Compartilhar Denúncia
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Linhas que mais demoram aqui</h2>
                    </div>

                    {lines.length > 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Linha</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Espera (P50)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Amostras</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {lines.map((l) => (
                                        <tr key={l.line_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900 dark:text-white">{l.line_code}</span>
                                                    <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">{l.line_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${l.p50_wait_min > 15 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                                                    <span className="text-xl font-black text-gray-900 dark:text-white">{l.p50_wait_min}m</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-500">
                                                {l.samples}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-gray-100 dark:bg-gray-900/50 p-12 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 font-medium">Nenhuma linha com amostragem suficiente ainda.</p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
