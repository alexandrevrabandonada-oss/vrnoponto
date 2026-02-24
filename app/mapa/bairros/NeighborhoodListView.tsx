'use client';

import React, { useState } from 'react';
import { Search, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';
import { Input, ListItem, SectionCard, EmptyState, MetricCard, Button } from '@/components/ui';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';
import { t } from '@/lib/copy';

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

    return (
        <SectionCard
            title="Lista de Bairros"
            subtitle="Toque em um bairro para ver detalhes da auditoria"
        >
            <div className="space-y-6">
                {/* Search Bar - High Contrast for Seniors */}
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                        <Search size={20} />
                    </div>
                    <Input
                        placeholder="Buscar bairro..."
                        className="pl-12 !h-14 !text-base bg-white/5 border-white/10 focus:border-brand"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    {filtered.map((n, i) => (
                        <ListItem
                            key={n.neighborhood}
                            title={n.neighborhood}
                            subtitle={`${n.stops_count} pontos • ${n.samples_total} relatos`}
                            leftIcon={<MapPin size={18} />}
                            tone={n.risk_band === 'CRIT' || n.risk_band === 'BAD' ? 'danger' : 'neutral'}
                            rightElement={
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <div className={`text-lg font-industrial italic leading-none ${n.risk_band === 'CRIT' || n.risk_band === 'BAD' ? 'text-red-400' : 'text-brand'}`}>
                                            +{n.avg_delta_min}m
                                        </div>
                                        <div className="text-[10px] font-black uppercase opacity-40 tracking-tighter">
                                            Atraso
                                        </div>
                                    </div>
                                    <Button variant="secondary" className="!h-10 !px-4 !text-[10px] font-black uppercase tracking-widest pointer-events-none">
                                        Ver Bairro
                                    </Button>
                                    <ChevronRight size={20} className="text-white/20" />
                                </div>
                            }
                            href={`/bairro/${encodeURIComponent(n.neighborhood)}`}
                            className="!p-5 !rounded-2xl border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                        />
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

                {/* Senior Friendly Help */}
                <p className="text-[10px] text-white/30 text-center font-bold uppercase tracking-widest pt-4">
                    Mostrando {filtered.length} de {neighborhoods.length} bairros
                </p>
            </div>
        </SectionCard>
    );
}
