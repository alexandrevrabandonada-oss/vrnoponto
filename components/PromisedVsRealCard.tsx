'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, Clock, BarChart3 } from 'lucide-react';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { Card, InlineAlert, SkeletonMetric, EmptyState } from '@/components/ui';

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
        <Card className="!p-6 border-white/5 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="space-y-1">
                    <h3 className="font-industrial text-sm tracking-widest uppercase text-white/80 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand" /> Prometido vs Real
                    </h3>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Conformidade com a tabela oficial (30 dias)</p>
                </div>

                <div className="relative group">
                    <select
                        value={dayGroup}
                        onChange={(e) => {
                            setDayGroup(e.target.value as 'WEEKDAY' | 'SAT' | 'SUN');
                            setLoading(true);
                        }}
                        className="appearance-none bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-2.5 hover:border-brand/40 transition-colors focus:ring-1 focus:ring-brand cursor-pointer outline-none"
                    >
                        <option value="WEEKDAY" className="bg-gray-900">Dias Úteis</option>
                        <option value="SAT" className="bg-gray-900">Sábados</option>
                        <option value="SUN" className="bg-gray-900">Domingos/Feriados</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-brand transition-colors pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SkeletonMetric />
                    <SkeletonMetric />
                </div>
            ) : data.length === 0 ? (
                <EmptyState
                    icon={BarChart3}
                    title="Sem dados oficiais"
                    description="Não há dados oficiais para este período."
                />
            ) : (
                <div className="space-y-6">
                    {/* Alertas Rápidos */}
                    {worstHours.length > 0 && (
                        <div className="space-y-2">
                            {worstHours.map(w => (
                                <InlineAlert key={w.hour} variant="warning">
                                    Às <span className="text-white">{w.hour}h</span> o intervalo é <span className="text-white">{Math.round(w.delta_pct!)}% maior</span> do que o prometido.
                                </InlineAlert>
                            ))}
                        </div>
                    )}

                    {/* Tabela de Gaps Industrial */}
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
                        <table className="w-full text-left text-[11px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-4 py-3 font-black text-muted uppercase tracking-widest">Hora</th>
                                    <th className="px-4 py-3 font-black text-muted uppercase tracking-widest text-right">Prometido</th>
                                    <th className="px-4 py-3 font-black text-muted uppercase tracking-widest text-right">Vida Real</th>
                                    <th className="px-4 py-3 font-black text-muted uppercase tracking-widest text-center">Déficit</th>
                                    <th className="px-4 py-3 font-black text-muted uppercase tracking-widest text-center">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {data.map((row) => (
                                    <tr key={row.hour} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-4 py-3 font-industrial text-brand italic">{row.hour}h</td>
                                        <td className="px-4 py-3 text-right font-bold text-white/40">
                                            {row.promised_headway_min ? `${row.promised_headway_min}m` : '--'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-industrial text-base italic text-white/80">
                                            {row.real_p50_headway_min ? `${row.real_p50_headway_min}m` : '--'}
                                        </td>
                                        <td className="px-4 py-3 font-industrial text-center">
                                            {row.delta_pct !== null ? (
                                                <span className={row.delta_pct > 20 ? 'text-danger' : row.delta_pct < -10 ? 'text-emerald-500' : 'text-white/40'}>
                                                    {row.delta_pct > 0 ? '+' : ''}{Math.round(row.delta_pct)}%
                                                </span>
                                            ) : '--'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <TrustMixBadge total={row.samples} pctVerified={row.pct_verified} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
}

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

    const worstLines = [...data]
        .filter(d => d.has_promise && d.avg_delta > 10 && d.samples_total >= 5)
        .sort((a, b) => b.avg_delta - a.avg_delta)
        .slice(0, 3);

    return (
        <Card className="!p-6 border-white/5 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="space-y-1">
                    <h3 className="font-industrial text-sm tracking-widest uppercase text-white/80 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand" /> Prometido vs Real (PONTO)
                    </h3>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Performance de todas as linhas neste local</p>
                </div>

                <div className="relative group">
                    <select
                        value={dayGroup}
                        onChange={(e) => {
                            setDayGroup(e.target.value as 'WEEKDAY' | 'SAT' | 'SUN');
                            setLoading(true);
                        }}
                        className="appearance-none bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-2.5 hover:border-brand/40 transition-colors focus:ring-1 focus:ring-brand cursor-pointer outline-none"
                    >
                        <option value="WEEKDAY" className="bg-gray-900">Dias Úteis</option>
                        <option value="SAT" className="bg-gray-900">Sábados</option>
                        <option value="SUN" className="bg-gray-900">Domingos/Feriados</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-brand transition-colors pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <SkeletonMetric />
                    <SkeletonMetric />
                </div>
            ) : data.length === 0 ? (
                <EmptyState
                    icon={BarChart3}
                    title="Sem Correlações"
                    description="Não há dados suficientes para montar a comparação prometido vs real neste ponto."
                />
            ) : (
                <div className="space-y-8">
                    {/* Alertas Críticos */}
                    {worstLines.length > 0 && (
                        <div className="space-y-2">
                            {worstLines.map(w => (
                                <InlineAlert key={w.line_code} variant="error" title="Linha Crítica">
                                    A <span className="text-white">Linha {w.line_code}</span> atrasa em média <span className="text-white">+{Math.round(w.avg_delta)} min</span> comparada à Tabela Oficial.
                                </InlineAlert>
                            ))}
                        </div>
                    )}

                    {/* Tabela de Top Linhas no Ponto */}
                    <div className="space-y-6">
                        {data.slice(0, 5).map((lineData) => (
                            <div key={lineData.line_code} className="rounded-2xl border border-white/5 overflow-hidden bg-black/20">
                                <div className="bg-white/[0.03] px-4 py-3 border-b border-white/5 flex justify-between items-center">
                                    <h4 className="font-industrial text-xs italic text-white/80 flex items-center gap-2">
                                        <span className="bg-brand text-black font-black px-2 py-0.5 rounded text-[10px] not-italic">{lineData.line_code}</span>
                                        {lineData.line_name}
                                    </h4>
                                    <TrustMixBadge total={lineData.samples_total} pctVerified={lineData.pct_verified_avg} />
                                </div>

                                {lineData.has_promise ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[10px]">
                                            <thead className="bg-white/[0.01] border-b border-white/5">
                                                <tr className="text-muted font-black uppercase tracking-widest">
                                                    <th className="px-4 py-2">Hora</th>
                                                    <th className="px-4 py-2 text-right">Prometido</th>
                                                    <th className="px-4 py-2 text-right">Real Médio</th>
                                                    <th className="px-4 py-2 text-center">Déficit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {lineData.hours.map((h) => (
                                                    <tr key={h.hour} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-4 py-2 font-industrial text-brand italic">{h.hour}h</td>
                                                        <td className="px-4 py-2 text-right text-white/30">{h.promised_headway_min ? `${h.promised_headway_min}m` : '--'}</td>
                                                        <td className="px-4 py-2 text-right font-industrial text-white/80">{h.real_p50_headway_min}m</td>
                                                        <td className="px-4 py-2 text-center font-industrial text-base">
                                                            {h.delta_min !== null ? (
                                                                <span className={h.delta_min > 5 ? 'text-danger' : h.delta_min < -2 ? 'text-emerald-500' : 'text-white/40'}>
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
                                    <div className="p-6 text-center">
                                        <p className="text-[10px] text-muted font-black uppercase tracking-widest opacity-40">Sem tabela oficial parseada</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
