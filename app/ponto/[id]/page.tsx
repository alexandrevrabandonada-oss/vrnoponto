import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Share2, TrendingDown, TrendingUp, Users, MapPin, ShieldAlert, BadgeAlert, AlertCircle } from 'lucide-react';
import { Sparkline } from '@/components/metrics/Sparkline';
import { StopPromisedVsRealCard } from '@/components/StopPromisedVsRealCard';
import Link from 'next/link';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateStopCaption } from '@/lib/editorial/templates';

// Tipagem baseada na API
type PointDetail = {
    stop: { id: string; name: string; neighborhood: string; is_active: boolean };
    metrics: { p50_wait_min: number | null; p90_wait_min: number | null; samples: number; delta_7d_pct: number | null };
    trust_mix: { total_events: number; pct_verified: number } | null;
    lines: Array<{ line_id: string; line_code: string; line_name: string; p50_wait_min: number; samples: number }>;
};

type WeeklyData = {
    week_start: string;
    p50_wait_min: number;
    p90_wait_min: number;
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

async function getPointData(id: string, baseUrl: string): Promise<PointDetail> {
    const res = await fetch(`${baseUrl}/api/point/detail?stop_id=${id}`, { cache: 'no-store' });
    if (!res.ok) {
        if (res.status === 404) notFound();
        throw new Error('Falha ao carregar dados do ponto');
    }
    return res.json();
}

async function getWeeklyData(id: string, baseUrl: string): Promise<WeeklyData[]> {
    const res = await fetch(`${baseUrl}/api/timeseries/stop?stop_id=${id}&weeks=8`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
}

async function getPointAlerts(id: string, baseUrl: string): Promise<Alert[]> {
    const res = await fetch(`${baseUrl}/api/alerts?days=30`, { cache: 'no-store' });
    if (!res.ok) return [];
    const allAlerts: Alert[] = await res.json();
    return allAlerts.filter(a => a.target_id === id && a.alert_type === 'STOP_WAIT');
}

export default async function PontoDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    const [data, weekly, alerts] = await Promise.all([
        getPointData(params.id, baseUrl),
        getWeeklyData(params.id, baseUrl),
        getPointAlerts(params.id, baseUrl)
    ]);

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

                {/* Alerts Section (if any) */}
                {alerts.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle size={20} />
                            <h2 className="text-xl font-black uppercase tracking-tight">Alertas Recentes</h2>
                        </div>
                        <div className="space-y-3">
                            {alerts.map(alert => (
                                <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${alert.severity === 'CRIT' ? 'bg-red-50 dark:bg-red-950/20 border-red-600 text-red-900 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-600 text-amber-900 dark:text-amber-400'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">Piora significativa no tempo de espera</p>
                                            <p className="text-sm opacity-80">
                                                Aumento de <span className="font-black">{alert.delta_pct}%</span> na mediana em relação à semana anterior.
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

                {/* Timeline Section */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Linha do Tempo</h2>
                            <p className="text-xs text-gray-500 font-medium">Espera mediana (p50) nas últimas 8 semanas</p>
                        </div>
                        {weekly.length >= 2 && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                                <Sparkline
                                    data={weekly.map(w => ({ week_start: w.week_start, value: w.p50_wait_min, p90: w.p90_wait_min }))}
                                    width={240}
                                    height={60}
                                    color={isWorsening ? '#ef4444' : '#6366f1'}
                                />
                            </div>
                        )}
                    </div>

                    {weekly.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                        <th className="pb-3 font-bold uppercase tracking-widest text-[10px]">Semana</th>
                                        <th className="pb-3 font-bold uppercase tracking-widest text-[10px]">Mediana</th>
                                        <th className="pb-3 font-bold uppercase tracking-widest text-[10px]">P90 (Crítico)</th>
                                        <th className="pb-3 font-bold uppercase tracking-widest text-[10px] text-right">Amostras</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {weekly.slice().reverse().map((w) => (
                                        <tr key={w.week_start} className="text-gray-700 dark:text-gray-300">
                                            <td className="py-3 font-mono text-xs">{new Date(w.week_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                                            <td className="py-3 font-black text-gray-900 dark:text-white">{w.p50_wait_min}m</td>
                                            <td className="py-3 font-medium text-gray-500">{w.p90_wait_min}m</td>
                                            <td className="py-3 text-right text-gray-400 font-bold">{w.samples}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-400 italic text-sm">
                            Dados históricos insuficientes para gerar a linha do tempo.
                        </div>
                    )}
                </section>

                {/* Promised Vs Real Stop Gap Comparison */}
                <StopPromisedVsRealCard stopId={stop.id} />

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

                {/* Editorial Kit */}
                <EditorialCard
                    data={{ stop, metrics }}
                    generator={(d, t) => generateStopCaption(d.stop, d.metrics, t)}
                    title="Kit Editorial: Denúncia deste Ponto"
                />

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
