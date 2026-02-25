"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, Navigation, Info, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { AppShell, Button, Card, PrimaryCTA } from '@/components/ui';
import { useRouter } from 'next/navigation';

// Load map dynamically to avoid SSR issues
const PointsMap = dynamic(() => import('@/components/PointsMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center text-white/20 uppercase font-black tracking-widest italic">Carregando Mapa...</div>
});

interface Stop {
    id: string;
    name: string;
    neighborhood: string;
    lat: number;
    lng: number;
}

export default function PointsMapPage() {
    const router = useRouter();
    const [stops, setStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([-22.518, -44.095]);
    const [mapZoom, setMapZoom] = useState(14);

    useEffect(() => {
        async function fetchStops() {
            try {
                const res = await fetch('/api/stops/all');
                const data = await res.json();
                if (data.stops) setStops(data.stops);
            } catch (err) {
                console.error('Failed to fetch stops:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStops();
    }, []);

    const filteredStops = useMemo(() => {
        if (!search.trim()) return stops;
        const q = search.toLowerCase();
        return stops.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.neighborhood.toLowerCase().includes(q)
        );
    }, [stops, search]);

    const handleSelectStop = (stop: Stop) => {
        setSelectedStop(stop);
        setMapCenter([stop.lat, stop.lng]);
        setMapZoom(17);
    };

    return (
        <AppShell title="Mapa de Pontos" hideFooter>
            <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-black">
                {/* Search Bar Floating */}
                <div className="absolute top-4 left-0 right-0 z-[1000] px-4 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-brand transition-colors">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar ponto ou bairro..."
                                className="w-full h-14 pl-12 pr-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-brand/40 shadow-2xl transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Map Area */}
                <div className="absolute inset-0 z-0">
                    <PointsMap
                        stops={filteredStops}
                        selectedId={selectedStop?.id || null}
                        onSelect={handleSelectStop}
                        center={mapCenter}
                        zoom={mapZoom}
                    />
                </div>

                {/* Bottom Sheet / Selection Info */}
                {selectedStop && (
                    <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-in slide-in-from-bottom-full duration-300 p-4 pb-8 pointer-events-none">
                        <div className="max-w-md mx-auto pointer-events-auto">
                            <Card className="bg-black/90 backdrop-blur-2xl border-brand/20 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                                <div className="p-6 space-y-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin size={14} className="text-brand" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{selectedStop.neighborhood}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-white italic leading-tight uppercase tracking-tight">{selectedStop.name}</h3>
                                        </div>
                                        <button
                                            onClick={() => setSelectedStop(null)}
                                            className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="secondary"
                                            onClick={() => router.push(`/ponto/${selectedStop.id}`)}
                                            className="!h-14 font-black italic uppercase tracking-widest text-[10px] bg-white/5 border-white/10"
                                        >
                                            Ver Detalhes
                                        </Button>
                                        <PrimaryCTA
                                            onClick={() => router.push(`/ponto/${selectedStop.id}?record=true`)}
                                            icon={<CheckCircle2 size={18} />}
                                            className="!h-14 font-black italic uppercase tracking-widest text-[10px]"
                                        >
                                            Registrar
                                        </PrimaryCTA>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Empty State Overlay */}
                {!loading && filteredStops.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm z-[500]">
                        <div className="text-center space-y-4">
                            <Info size={48} className="mx-auto text-white/20" />
                            <p className="text-white/40 font-black uppercase tracking-widest text-sm">Nenhum ponto encontrado</p>
                            <Button variant="secondary" onClick={() => setSearch('')}>Limpar busca</Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
