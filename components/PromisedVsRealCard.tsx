'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Clock } from 'lucide-react';
import { TrustMixBadge } from '@/components/TrustMixBadge';

type HourlyGap = {
    hour: number;
    promised_trips: number;
    promised_headway_min: number | null;
    real_p50_headway_min: number | null;
    real_p90_headway_min: number | null;
    samples: number;
    delta_min: number | null;
    delta_pct: number | null;
    pct_verified: number;
};

export function PromisedVsRealCard({ lineId }: { lineId: string }) {
    const [dayGroup, setDayGroup] = useState<'WEEKDAY' | 'SAT' | 'SUN'>('WEEKDAY');
    const [data, setData] = useState<HourlyGap[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        fetch(`/api/line/promised-vs-real?line_id=${lineId}&day=${dayGroup}`)
            .then(res => res.json())
            .then(json => {
                if (isMounted) {
                    setData(json.hourly_gaps || []);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [lineId, dayGroup]);

    const worstHours = [...data]
        .filter(d => d.delta_pct !== null && d.delta_pct > 20 && d.samples >= 3)
        .sort((a, b) => (b.delta_pct || 0) - (a.delta_pct || 0))
        .slice(0, 3);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Prometido vs Real
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Comparação entre a tabela oficial de horários e a realidade dos últimos 30 dias.
                    </p>
                </div>
                <div className="relative">
                    <select
                        value={dayGroup}
                        onChange={(e) => {
                            setDayGroup(e.target.value as 'WEEKDAY' | 'SAT' | 'SUN');
                            setLoading(true); // Loading explicitly managed here
                        }}
                        className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg block w-full pl-3 pr-8 py-2.5 font-medium focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="WEEKDAY">Dias Úteis</option>
                        <option value="SAT">Sábados</option>
                        <option value="SUN">Domingos e Feriados</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-500 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center text-gray-400 text-sm">Carregando dados horários...</div>
            ) : data.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    Nenhum horário prometido para {dayGroup === 'WEEKDAY' ? 'Dias Úteis' : dayGroup === 'SAT' ? 'Sábados' : 'Domingos/Feriados'} localizado no último PDF oficial.
                </div>
            ) : (
                <>
                    {/* Alertas Rápidos */}
                    {worstHours.length > 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-lg">
                            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Horários de Pico Afetados
                            </h3>
                            <ul className="mt-2 space-y-1">
                                {worstHours.map(w => (
                                    <li key={w.hour} className="text-sm text-amber-800 dark:text-amber-300">
                                        Às <strong>{w.hour}h</strong> o intervalo é {Math.round(w.delta_pct!)}% maior do que o prometido (Promete {w.promised_headway_min}m, Faz {w.real_p50_headway_min}m)
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tabela de Gaps */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Hora</th>
                                    <th className="px-4 py-3 font-semibold text-right">Prometido (m)</th>
                                    <th className="px-4 py-3 font-semibold text-right">Real (m)</th>
                                    <th className="px-4 py-3 font-semibold text-right">Pior (p90)</th>
                                    <th className="px-4 py-3 font-semibold text-center">Déficit</th>
                                    <th className="px-4 py-3 font-semibold text-center">Confiabilidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {data.map((row) => (
                                    <tr key={row.hour} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{row.hour}h</td>
                                        <td className="px-4 py-3 text-right">
                                            {row.promised_headway_min ? (
                                                <span className="text-gray-600 dark:text-gray-300">{row.promised_headway_min}</span>
                                            ) : (
                                                <span className="text-gray-400 italic font-light text-xs">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {row.real_p50_headway_min ? (
                                                <span className="font-bold text-gray-900 dark:text-white">{row.real_p50_headway_min}</span>
                                            ) : (
                                                <span className="text-gray-400 italic font-light text-xs">0 avistamentos</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500">{row.real_p90_headway_min || '--'}</td>

                                        <td className="px-4 py-3 font-black text-center">
                                            {row.delta_pct !== null ? (
                                                <span className={row.delta_pct > 20 ? 'text-red-600 dark:text-red-400' : row.delta_pct < -10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}>
                                                    {row.delta_pct > 0 ? '+' : ''}{Math.round(row.delta_pct)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-normal italic text-xs">--</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            <TrustMixBadge total={row.samples} pctVerified={row.pct_verified} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
