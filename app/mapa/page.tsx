'use client';

import { Suspense, useState, useEffect } from 'react';
import { Info, Loader2, Map as MapIcon } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';
import { type StopMapItem } from '@/components/DelayMap';
import { AppShell, PageHeader, Button, Card } from '@/components/ui';
import { useSearchParams } from 'next/navigation';

function ListView({ stops }: { stops: StopMapItem[] }) {
    const sorted = [...stops].sort((a, b) => {
        const aVal = a.metrics?.p50_wait_min ?? -1;
        const bVal = b.metrics?.p50_wait_min ?? -1;
        return bVal - aVal;
    });

    return (
        <div className="space-y-4">
            <h2 className="font-industrial text-xl tracking-widest italic opacity-50 uppercase mb-6">Lista de Pontos (30 dias)</h2>
            <div className="space-y-3">
                {sorted.map(s => {
                    const isCritical = s.metrics && s.metrics.p50_wait_min > 15;

                    return (
                        <Card
                            key={s.id}
                            variant="surface2"
                            className={`!p-0 overflow-hidden group hover:border-brand/30 transition-all ${isCritical ? 'border-danger/20' : ''
                                }`}
                        >
                            <a
                                href={`/ponto/${s.id}`}
                                className="flex flex-col sm:flex-row justify-between sm:items-center p-5 gap-4"
                            >
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-tight">{s.name.toLowerCase()}</h3>
                                    <p className="text-[10px] text-muted flex items-center gap-1 mt-1 font-black uppercase tracking-widest">
                                        <MapIcon size={12} /> Lat: {s.location?.lat.toFixed(4)}, Lng: {s.location?.lng.toFixed(4)}
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="text-center">
                                        <div className="text-[9px] text-muted uppercase font-black tracking-widest mb-1">Mediana</div>
                                        <div className={`font-industrial text-2xl italic ${isCritical ? 'text-danger' : 'text-brand'
                                            }`}>
                                            {s.metrics ? `${s.metrics.p50_wait_min}M` : '--'}
                                        </div>
                                    </div>
                                    <div className="text-center border-l border-white/5 pl-6">
                                        <div className="text-[9px] text-muted uppercase font-black tracking-widest mb-1">Crítico</div>
                                        <div className="font-industrial text-2xl italic text-white/40">
                                            {s.metrics ? `${s.metrics.p90_wait_min}M` : '--'}
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </Card>
                    );
                })}
            </div>
            {sorted.length === 0 && (
                <div className="text-center py-12 text-muted font-industrial tracking-widest opacity-30 italic">Nenhum ponto registrado.</div>
            )}
        </div>
    );
}

function MapContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get('m');
    const listMode = mode === 'lista';
    const criticalMode = mode === 'criticos';

    const [stops, setStops] = useState<StopMapItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStops() {
            try {
                const baseUrl = window.location.origin;
                const [sRes, aRes, wRes] = await Promise.all([
                    fetch(`${baseUrl}/api/map/stops?days=30`),
                    fetch(`${baseUrl}/api/alerts?days=30`),
                    fetch(`${baseUrl}/api/dashboard/worst-stops?limit=100`)
                ]);

                const sJson = await sRes.json();
                const alerts = await aRes.json();
                const worstStops = (await wRes.json()).data;

                let processedStops = sJson.stops.map((s: StopMapItem) => {
                    const stopAlert = (alerts || []).find((a: { target_id: string; alert_type: string }) => a.target_id === s.id && a.alert_type === 'STOP_WAIT');
                    const worst = (worstStops || []).find((w: { stop_id: string }) => w.stop_id === s.id);

                    return {
                        ...s,
                        metrics: s.metrics ? {
                            ...s.metrics,
                            alert: stopAlert,
                            worst_delta: worst?.worst_delta_min,
                            pct_verified: worst?.pct_verified_avg
                        } : null
                    };
                });

                if (criticalMode) {
                    processedStops = processedStops.filter((s: StopMapItem) => s.metrics?.worst_delta && s.metrics.worst_delta > 10);
                }

                setStops(processedStops);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadStops();
    }, [criticalMode]);

    return (
        <AppShell
            title="MAPA DE CONFIABILIDADE"
            actions={
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <Button
                        variant="ghost"
                        href="/mapa"
                        className={`!px-3 !py-1.5 !text-[10px] ${!listMode && !criticalMode ? '!bg-brand !text-black' : ''}`}
                    >
                        MAPA
                    </Button>
                    <Button
                        variant="ghost"
                        href="/mapa?m=lista"
                        className={`!px-3 !py-1.5 !text-[10px] ${listMode ? '!bg-brand !text-black' : ''}`}
                    >
                        LISTA
                    </Button>
                    <Button
                        variant="ghost"
                        href="/mapa?m=criticos"
                        className={`!px-3 !py-1.5 !text-[10px] ${criticalMode ? '!bg-danger !text-white' : ''}`}
                    >
                        CRÍTICOS
                    </Button>
                </div>
            }
        >
            <PageHeader
                title="Status Geo"
                subtitle="Visão industrial do tempo de espera nos bairros"
            />

            <div className="space-y-6">
                {!listMode && (
                    <Card variant="surface2" className="flex flex-wrap gap-4 items-center justify-between !py-4 !px-6">
                        <div className="flex items-center gap-2 text-muted font-black text-[10px] uppercase tracking-widest">
                            <Info size={14} className="text-brand opacity-50" /> LEGENDA DE ESPERA:
                        </div>
                        <div className="flex flex-wrap gap-4 font-black text-[9px] uppercase tracking-tighter">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> -5 MIN</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 5-10 MIN</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 10-20 MIN</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> +20 MIN</span>
                        </div>
                    </Card>
                )}

                <div className="min-h-[500px] h-[calc(100vh-320px)] relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.02] rounded-3xl border border-white/5">
                            <Loader2 className="animate-spin text-brand" size={32} />
                            <span className="mt-4 font-industrial text-[10px] tracking-widest opacity-30 uppercase">Carregando Dados...</span>
                        </div>
                    ) : listMode ? (
                        <ListView stops={stops} />
                    ) : (
                        <Card className="w-full h-full !p-0 rounded-3xl overflow-hidden border-white/5 shadow-2xl relative z-0">
                            <MapWrapper stops={stops} />
                        </Card>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

export default function DelayMapPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#070707] flex items-center justify-center">
                <Loader2 className="animate-spin text-brand" size={32} />
            </div>
        }>
            <MapContent />
        </Suspense>
    );
}
