'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, AlertTriangle } from 'lucide-react';
import { Input, SectionCard, EmptyState, MetricCard } from '@/components/ui';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';

interface NeighborhoodListViewProps {
    neighborhoods: NeighborhoodMapItem[];
    critOnly: boolean;
}

export function NeighborhoodListView({ neighborhoods, critOnly }: NeighborhoodListViewProps) {
    const [search, setSearch] = useState('');

    let filtered = [...neighborhoods].sort((a, b) => b.avg_delta_min - a.avg_delta_min);

    if (critOnly) {
        filtered = filtered.filter(n => n.risk_band === 'CRIT' || n.risk_band === 'BAD');
    }

    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(n => n.neighborhood.toLowerCase().includes(s));
    }

    const getSituationLabel = (band: NeighborhoodMapItem['risk_band']) => {
        if (band === 'CRIT') return 'Crítico';
        if (band === 'BAD') return 'Ruim';
        if (band === 'ATTENTION') return 'Atenção';
        return 'Normal';
    };

    const getSituationChipClass = (band: NeighborhoodMapItem['risk_band']) => {
        if (band === 'CRIT') return 'bg-red-600 text-white border-red-300';
        if (band === 'BAD') return 'bg-orange-500 text-black border-orange-200';
        if (band === 'ATTENTION') return 'bg-amber-400 text-black border-amber-100';
        return 'bg-emerald-600 text-white border-emerald-200';
    };

    return (
        <SectionCard
            title="Lista de bairros"
            subtitle="Busque o bairro e toque em Ver bairro"
        >
            <div className="space-y-6">
                <div className="relative">
                    <label htmlFor="search-neighborhood" className="mb-2 block text-[11px] font-black uppercase tracking-widest text-white/75">
                        Buscar bairro
                    </label>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                        <Search size={20} />
                    </div>
                    <Input
                        id="search-neighborhood"
                        placeholder="Buscar bairro..."
                        className="pl-12 !h-14 !text-base bg-white/5 border-white/10 focus:border-brand"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    {filtered.map((n) => (
                        <Link
                            key={n.neighborhood}
                            href={`/bairro/${encodeURIComponent(n.neighborhood)}`}
                            className="block rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-brand shrink-0" />
                                        <h3 className="text-base sm:text-lg font-black text-white truncate">{n.neighborhood}</h3>
                                    </div>
                                    <p className="mt-1 text-xs text-white/70 font-semibold">
                                        {n.stops_count} pontos • {n.samples_total} relatos
                                    </p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-wide ${getSituationChipClass(n.risk_band)}`}>
                                    {getSituationLabel(n.risk_band)}
                                </span>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="text-left">
                                    <div className={`text-xl font-industrial italic leading-none ${n.risk_band === 'CRIT' || n.risk_band === 'BAD' ? 'text-red-300' : 'text-brand'}`}>
                                        +{n.avg_delta_min}m
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
                                        atraso médio
                                    </div>
                                </div>
                                <span className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-brand text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-brand/20">
                                    Ver bairro
                                </span>
                            </div>
                        </Link>
                    ))}

                    {filtered.length === 0 && (
                        <EmptyState
                            icon={search ? Search : AlertTriangle}
                            title={search ? "Nenhum bairro encontrado" : "Ainda sem dados"}
                            description={search ? `Não encontramos nada para "${search}".` : "Nenhum bairro atingiu a amostragem mínima hoje."}
                            className="bg-transparent border-none py-12"
                        >
                            {!search && (
                                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-4 opacity-50">
                                    <MetricCard label="Exemplo" value="+15m" />
                                    <MetricCard label="Relatos" value="12" />
                                </div>
                            )}
                        </EmptyState>
                    )}
                </div>

                <p className="text-[10px] text-white/30 text-center font-bold uppercase tracking-widest pt-4">
                    Mostrando {filtered.length} de {neighborhoods.length} bairros
                </p>
            </div>
        </SectionCard>
    );
}
