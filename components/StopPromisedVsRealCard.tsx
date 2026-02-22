'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Clock } from 'lucide-react';
import { TrustMixBadge } from '@/components/TrustMixBadge';

type StopHourlyGap = {
    line_code: string;
    line_name: string;
    has_promise: boolean;
    samples_total: number;
    avg_delta: number;
    pct_verified_avg: number;
    hours: {
        hour: number;
        promised_headway_min: number | null;
        real_p50_headway_min: number | null;
        delta_min: number | null;
        delta_pct: number | null;
        samples: number;
        pct_verified: number;
        meta: string;
    }[];
};

export function StopPromisedVsRealCard({ stopId }: { stopId: string }) {
    const [dayGroup, setDayGroup] = useState<'WEEKDAY' | 'SAT' | 'SUN'>('WEEKDAY');
    const [data, setData] = useState<StopHourlyGap[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        fetch(`/api/stop/promised-vs-real?stop_id=${stopId}&day=${dayGroup}`)
            .then(res => res.json())
            .then(json => {
                if (isMounted) {
                    setData(json.data || []);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [stopId, dayGroup]);

    // Linhas Críticas (onde o delta médio absoluto estourou > 10 min de atraso global)
    const worstLines = [...data]
        .filter(d => d.has_promise && d.avg_delta > 10 && d.samples_total >= 5)
        .sort((a, b) => b.avg_delta - a.avg_delta)
        .slice(0, 3);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Clock className="w-5 h-5 text-brand dark:text-brand" /> Prometido vs Real
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Comparação oficial de intervalos reais vs tabela estipulada neste ponto (30 dias).
                    </p>
                </div>
                <div className="relative">
                    <select
                        value={dayGroup}
                        onChange={(e) => {
                            setDayGroup(e.target.value as 'WEEKDAY' | 'SAT' | 'SUN');
                            setLoading(true);
                        }}
                        className="appearance-none bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white text-sm rounded-lg block w-full pl-3 pr-8 py-2.5 font-medium focus:ring-brand focus:border-brand"
                    >
                        <option value="WEEKDAY">Dias Úteis</option>
                        <option value="SAT">Sábados</option>
                        <option value="SUN">Domingos e Feriados</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-500 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center text-gray-400 text-sm">Carregando dados horários do ponto...</div>
            ) : data.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    Nenhuma leitura suficiente de linhas neste ponto aos {dayGroup === 'WEEKDAY' ? 'Dias Úteis' : dayGroup === 'SAT' ? 'Sábados' : 'Domingos/Feriados'} para montar correlações.
                </div>
            ) : (
                <>
                    {/* Alertas Críticos */}
                    {worstLines.length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-lg">
                            <h3 className="text-sm font-bold text-red-900 dark:text-red-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Linhas em Estado de Alerta neste Ponto
                            </h3>
                            <ul className="mt-2 space-y-1">
                                {worstLines.map(w => (
                                    <li key={w.line_code} className="text-sm text-red-800 dark:text-red-300">
                                        A <span className="font-bold">Linha {w.line_code}</span> atrasa em média <strong>+{Math.round(w.avg_delta)} min</strong> comparada à Tabela Oficial.
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tabela de Top Linhas no Ponto */}
                    <div className="space-y-6">
                        {data.slice(0, 5).map((lineData) => (
                            <div key={lineData.line_code} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="bg-brand/20 text-brand px-2 py-0.5 rounded text-sm font-black tracking-tight">{lineData.line_code}</span>
                                        {lineData.line_name}
                                    </h3>
                                    <div className="text-xs">
                                        <TrustMixBadge total={lineData.samples_total} pctVerified={lineData.pct_verified_avg} />
                                    </div>
                                </div>

                                {lineData.has_promise ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                                <tr>
                                                    <th className="px-4 py-2">Hora</th>
                                                    <th className="px-4 py-2 text-right">Prometido</th>
                                                    <th className="px-4 py-2 text-right">Real Médio</th>
                                                    <th className="px-4 py-2 text-center">Atraso</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {lineData.hours.map((h) => (
                                                    <tr key={h.hour} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-300">{h.hour}h</td>
                                                        <td className="px-4 py-2 text-right text-gray-500">{h.promised_headway_min ? `${h.promised_headway_min}m` : '--'}</td>
                                                        <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{h.real_p50_headway_min}m</td>
                                                        <td className="px-4 py-2 text-center font-bold">
                                                            {h.delta_min !== null ? (
                                                                <span className={h.delta_min > 5 ? 'text-red-500' : h.delta_min < -2 ? 'text-emerald-500' : 'text-gray-500'}>
                                                                    {h.delta_min > 0 ? '+' : ''}{h.delta_min}m
                                                                </span>
                                                            ) : '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-4 text-sm text-center text-gray-500">
                                        Nenhum PDF Oficial com grade horária foi parseado para a {lineData.line_code} ainda. Apenas {lineData.samples_total} observações de vida real coletadas.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
