import { Suspense } from 'react';
import { Info, Loader2, Map as MapIcon, MenuSquare, Zap } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';
import { type StopMapItem } from '@/components/DelayMap';

export const dynamic = 'force-dynamic';

async function fetchStops(baseUrl: string) {
    try {
        const res = await fetch(`${baseUrl}/api/map/stops?days=30`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Falha ao buscar paradas');
        const json = await res.json();
        return json.stops as StopMapItem[];
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function fetchWorstStops(baseUrl: string) {
    try {
        const res = await fetch(`${baseUrl}/api/dashboard/worst-stops?limit=100`, { cache: 'no-store' });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function fetchAlerts(baseUrl: string) {
    try {
        const res = await fetch(`${baseUrl}/api/alerts?days=30`, { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

function ListView({ stops }: { stops: StopMapItem[] }) {
    // Ordenar os pontos para que os piores fiquem em cima
    const sorted = [...stops].sort((a, b) => {
        const aVal = a.metrics?.p50_wait_min ?? -1;
        const bVal = b.metrics?.p50_wait_min ?? -1;
        return bVal - aVal;
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Lista de Pontos (30 dias)</h2>
            <div className="space-y-4">
                {sorted.map(s => {
                    const bgColor = s.metrics ?
                        (s.metrics.p50_wait_min > 20 ? 'bg-red-50 dark:bg-red-900/10 border-red-100' :
                            s.metrics.p50_wait_min > 10 ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100' :
                                s.metrics.p50_wait_min > 5 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100' :
                                    'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100')
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100';

                    return (
                        <a
                            key={s.id}
                            href={`/ponto/${s.id}`}
                            className={`block p-4 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition hover:shadow-md ${bgColor}`}
                        >
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white capitalize">{s.name.toLowerCase()}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapIcon size={14} /> Lat: {s.location?.lat.toFixed(4)}, Lng: {s.location?.lng.toFixed(4)}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase font-semibold">Mediana</div>
                                    <div className="font-black text-gray-900 dark:text-gray-100 text-lg">
                                        {s.metrics ? `${s.metrics.p50_wait_min}m` : '--'}
                                    </div>
                                </div>
                                <div className="text-center border-l pl-4 border-gray-200">
                                    <div className="text-xs text-gray-500 uppercase font-semibold">Crítico</div>
                                    <div className="font-bold text-gray-600 dark:text-gray-400 text-lg">
                                        {s.metrics ? `${s.metrics.p90_wait_min}m` : '--'}
                                    </div>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>
            {sorted.length === 0 && (
                <div className="text-center py-12 text-gray-500">Nenhum ponto registrado.</div>
            )}
        </div>
    );
}

export default async function DelayMapPage(props: { searchParams: Promise<{ m?: string }> }) {
    const searchParams = await props.searchParams;
    const listMode = searchParams.m === 'lista';
    const criticalMode = searchParams.m === 'criticos';
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    const [stopsRaw, alerts, worstStops] = await Promise.all([
        fetchStops(baseUrl),
        fetchAlerts(baseUrl),
        fetchWorstStops(baseUrl)
    ]);

    let stops = stopsRaw.map(s => {
        const stopAlert = (alerts || []).find((a: { target_id: string, alert_type: string }) => a.target_id === s.id && a.alert_type === 'STOP_WAIT');
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
        stops = stops.filter(s => s.metrics?.worst_delta && s.metrics.worst_delta > 10);
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                            Mapa de Atrasos <Zap className="text-amber-500" />
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Visão geoespacial do tempo de espera mediano (P50) nos últimos 30 dias.
                        </p>
                    </div>

                    <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                        <a
                            href="/mapa"
                            className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${!listMode && !criticalMode ? 'bg-white dark:bg-black shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <MapIcon size={16} /> Mapa
                        </a>
                        <a
                            href="/mapa?m=lista"
                            className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${listMode ? 'bg-white dark:bg-black shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <MenuSquare size={16} /> Lista
                        </a>
                        <a
                            href="/mapa?m=criticos"
                            className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition ${criticalMode ? 'bg-white dark:bg-black shadow text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Zap size={16} /> Críticos
                        </a>
                    </div>
                </div>

                {/* Sub-Header Legend */}
                {!listMode && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold">
                            <Info size={16} className="text-indigo-500" /> Legenda de Espera (Mediana):
                        </div>
                        <div className="flex flex-wrap gap-3 font-medium">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Até 5 min</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> 5 a 10 min</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 10 a 20 min</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> +20 min</span>
                            <span className="flex items-center gap-1.5 ml-4"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Sem Escala</span>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="min-h-[600px] h-[calc(100vh-300px)] relative">
                    {listMode ? (
                        <ListView stops={stops} />
                    ) : (
                        <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative z-0">
                            <Suspense fallback={
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <Loader2 className="animate-spin mb-2" size={32} />
                                    <span>Renderizando Mapa...</span>
                                </div>
                            }>
                                <MapWrapper stops={stops} />
                            </Suspense>
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}
