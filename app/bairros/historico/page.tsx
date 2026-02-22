import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, History as HistoryIcon, AlertTriangle, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

type MonthlyChange = {
    month_start: string;
    neighborhood_norm: string;
    cur_avg_delta_min: number;
    prev_avg_delta_min: number | null;
    delta_change_min: number | null;
    delta_change_pct: number | null;
    samples_total: number;
    pct_verified_avg: number;
};

async function fetchHistoricalData(baseUrl: string): Promise<MonthlyChange[]> {
    try {
        const resChanges = await fetch(`${baseUrl}/api/neighborhoods/changes`, { cache: 'no-store' });
        if (!resChanges.ok) return [];
        const json = await resChanges.json();
        return json.data || [];
    } catch {
        return [];
    }
}

export default async function HistoricoBairrosPage() {
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';
    const changes = await fetchHistoricalData(baseUrl);

    // Get latest month available
    const latestMonth = changes.length > 0 ? changes[0].month_start : null;
    const currentMonthData = changes.filter(c => c.month_start === latestMonth);

    const worsening = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min > 0)
        .sort((a, b) => (b.delta_change_min || 0) - (a.delta_change_min || 0))
        .slice(0, 5);

    const improving = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min < 0)
        .sort((a, b) => (a.delta_change_min || 0) - (b.delta_change_min || 0))
        .slice(0, 5);

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
            .format(new Date(dateStr + 'T12:00:00Z'));
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/bairros" className="flex items-center gap-2 text-gray-500 hover:text-brand transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-medium hidden sm:inline">Voltar</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="bg-brand text-black text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">HISTÓRICO MENSAL</span>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <HistoryIcon className="text-brand" /> Histórico de Bairros
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Comparativo mensal de desempenho e tendências de atraso em Volta Redonda.
                    </p>
                </header>

                {latestMonth && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Worsening */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
                            <div className="p-5 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between">
                                <h2 className="font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                                    <TrendingUp size={18} /> MAIOR PIORA
                                </h2>
                                <span className="text-[10px] font-bold text-red-600/50 uppercase">{formatDate(latestMonth)}</span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {worsening.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm italic">Nenhuma piora significativa detectada.</div>
                                ) : worsening.map(w => (
                                    <div key={w.neighborhood_norm} className="p-4 flex items-center justify-between hover:bg-red-50/20 dark:hover:bg-red-900/5">
                                        <div className="font-bold text-gray-900 dark:text-white">{w.neighborhood_norm}</div>
                                        <div className="text-right">
                                            <div className="text-red-600 font-black">+{w.delta_change_min} min</div>
                                            <div className="text-[10px] text-gray-400">{w.cur_avg_delta_min}m total</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Improving */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                                <h2 className="font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    <TrendingDown size={18} /> MELHOROU
                                </h2>
                                <span className="text-[10px] font-bold text-emerald-600/50 uppercase">{formatDate(latestMonth)}</span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {improving.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm italic">Nenhuma melhoria significativa detectada.</div>
                                ) : improving.map(i => (
                                    <div key={i.neighborhood_norm} className="p-4 flex items-center justify-between hover:bg-emerald-50/20 dark:hover:bg-emerald-900/5">
                                        <div className="font-bold text-gray-900 dark:text-white">{i.neighborhood_norm}</div>
                                        <div className="text-right">
                                            <div className="text-emerald-600 font-black">{i.delta_change_min} min</div>
                                            <div className="text-[10px] text-gray-400">{i.cur_avg_delta_min}m total</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Full Historical Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                        <Calendar size={20} className="text-brand" />
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Linha do Tempo por Bairro</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-5 py-3">Mês</th>
                                    <th className="px-5 py-3">Bairro</th>
                                    <th className="px-5 py-3 text-right">Atraso Médio</th>
                                    <th className="px-5 py-3 text-right">Mudança</th>
                                    <th className="px-5 py-3 text-center">Amostras</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {changes.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Sem dados históricos suficientes.</td></tr>
                                ) : changes.map((c) => {
                                    const isWorsening = c.delta_change_min && c.delta_change_min > 0;
                                    const isImproving = c.delta_change_min && c.delta_change_min < 0;

                                    return (
                                        <tr key={`${c.month_start}-${c.neighborhood_norm}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-5 py-4 font-bold text-gray-500 capitalize">{formatDate(c.month_start)}</td>
                                            <td className="px-5 py-4">
                                                <Link href={`/bairro/${encodeURIComponent(c.neighborhood_norm)}`} className="font-bold text-brand dark:text-brand hover:underline">
                                                    {c.neighborhood_norm}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-gray-900 dark:text-white">
                                                +{c.cur_avg_delta_min} min
                                            </td>
                                            <td className={`px-5 py-4 text-right font-bold text-xs ${isWorsening ? 'text-red-600' : isImproving ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {c.delta_change_min ? (
                                                    <span className="flex items-center justify-end gap-1">
                                                        {isWorsening ? <TrendingUp size={12} /> : isImproving ? <TrendingDown size={12} /> : null}
                                                        {c.delta_change_min > 0 ? `+${c.delta_change_min}` : c.delta_change_min} min
                                                    </span>
                                                ) : '--'}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">{c.samples_total}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="bg-brand/10 border-l-4 border-brand p-6 rounded-r-2xl">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="text-brand flex-shrink-0" size={28} />
                        <div>
                            <h3 className="text-white font-black text-lg font-industrial uppercase tracking-tight">Os dados mostram a evolução do serviço.</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mt-1">
                                Pioras constantes em determinados bairros indicam necessidade de revisão de frota ou itinerário pelas autoridades.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
