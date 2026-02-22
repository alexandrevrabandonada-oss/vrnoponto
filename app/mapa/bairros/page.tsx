import { Suspense } from 'react';
import Link from 'next/link';
import { Info, Loader2, Map as MapIcon, MenuSquare, Zap, MapPin, ArrowLeft, Hexagon, CircleDot } from 'lucide-react';
import NeighborhoodMapWrapper from '@/components/NeighborhoodMapWrapper';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';
import { TrustMixBadge } from '@/components/TrustMixBadge';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = { type: string; data?: NeighborhoodMapItem[]; geojson?: any };

async function fetchNeighborhoods(baseUrl: string, polygons: boolean): Promise<ApiResponse> {
    try {
        const url = `${baseUrl}/api/map/neighborhoods?limit=200${polygons ? '&polygons=true' : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return { type: 'circles', data: [] };
        return res.json();
    } catch {
        return { type: 'circles', data: [] };
    }
}

function getRiskColor(band: string): string {
    switch (band) {
        case 'CRIT': return 'text-red-600 bg-red-50 border-red-200';
        case 'BAD': return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'ATTENTION': return 'text-amber-600 bg-amber-50 border-amber-200';
        default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
}

function getRiskLabel(band: string): string {
    switch (band) {
        case 'CRIT': return 'CRÍTICO';
        case 'BAD': return 'RUIM';
        case 'ATTENTION': return 'ATENÇÃO';
        default: return 'OK';
    }
}

function ListView({ neighborhoods, critOnly }: { neighborhoods: NeighborhoodMapItem[], critOnly: boolean }) {
    let filtered = [...neighborhoods].sort((a, b) => b.avg_delta_min - a.avg_delta_min);
    if (critOnly) filtered = filtered.filter(n => n.risk_band === 'CRIT' || n.risk_band === 'BAD');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Bairros por Atraso (30 dias)</h2>
            <div className="space-y-3">
                {filtered.map((n, i) => {
                    const riskClasses = getRiskColor(n.risk_band);
                    return (
                        <Link
                            key={n.neighborhood}
                            href={`/bairro/${encodeURIComponent(n.neighborhood)}`}
                            className={`block p-4 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition hover:shadow-md ${riskClasses}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-gray-400 w-6">{i + 1}</span>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{n.neighborhood}</h3>
                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                        <span>{n.stops_count} pontos</span>
                                        <span>·</span>
                                        <span>{n.samples_total} amostras</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <TrustMixBadge total={n.samples_total} pctVerified={n.pct_verified_avg} />
                                <div className="text-center">
                                    <div className="font-black text-lg">+{n.avg_delta_min}m</div>
                                    <div className="text-[10px] font-bold uppercase">{getRiskLabel(n.risk_band)}</div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-400">Nenhum bairro encontrado com os filtros atuais.</div>
                )}
            </div>
        </div>
    );
}

export default async function MapaBairrosPage(props: { searchParams: Promise<{ m?: string; f?: string; v?: string }> }) {
    const searchParams = await props.searchParams;
    const listMode = searchParams.m === 'lista';
    const critOnly = searchParams.f === 'criticos';
    const polyMode = searchParams.v === 'polygons';
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000';

    const apiResponse = await fetchNeighborhoods(baseUrl, polyMode);

    // Determine what we got back from the API
    const hasPolygons = apiResponse.type === 'polygons' && apiResponse.geojson;
    let neighborhoods: NeighborhoodMapItem[] = apiResponse.data || [];

    if (critOnly && !listMode) {
        neighborhoods = neighborhoods.filter(n => n.risk_band === 'CRIT' || n.risk_band === 'BAD');
    }

    // Build current query string helpers
    const toggleParam = (key: string, val: string) => {
        const params = new URLSearchParams();
        if (searchParams.m) params.set('m', searchParams.m);
        if (searchParams.f) params.set('f', searchParams.f);
        if (searchParams.v) params.set('v', searchParams.v);

        if (params.get(key) === val) {
            params.delete(key);
        } else {
            params.set(key, val);
        }
        const qs = params.toString();
        return `/mapa/bairros${qs ? `?${qs}` : ''}`;
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/bairros" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                                Mapa de Bairros <MapPin className="text-orange-500" />
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {hasPolygons ? 'Polígonos reais dos bairros' : 'Círculos por centroide'} — coloridos por nível de atraso (30d).
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                            <a href={toggleParam('m', '__clear__').replace('m=__clear__&', '').replace('?m=__clear__', '').replace('&m=__clear__', '')}
                                className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${!listMode ? 'bg-white dark:bg-black shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                <MapIcon size={14} /> Mapa
                            </a>
                            <a href={toggleParam('m', 'lista')}
                                className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${listMode ? 'bg-white dark:bg-black shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                <MenuSquare size={14} /> Lista
                            </a>
                        </div>

                        {/* Layer Toggle */}
                        {!listMode && (
                            <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                                <a href={`/mapa/bairros${searchParams.f ? `?f=${searchParams.f}` : ''}`}
                                    className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${!polyMode ? 'bg-white dark:bg-black shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <CircleDot size={14} /> Círculos
                                </a>
                                <a href={`/mapa/bairros?v=polygons${searchParams.f ? `&f=${searchParams.f}` : ''}`}
                                    className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${polyMode ? 'bg-white dark:bg-black shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Hexagon size={14} /> Polígonos
                                </a>
                            </div>
                        )}

                        {/* Critical Filter */}
                        <a href={critOnly ? '/mapa/bairros' : `/mapa/bairros?f=criticos${polyMode ? '&v=polygons' : ''}`}
                            className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${critOnly ? 'bg-red-100 text-red-600 shadow' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:text-gray-700'}`}>
                            <Zap size={14} /> Críticos
                        </a>
                    </div>
                </div>

                {/* Polygon fallback notice */}
                {polyMode && !hasPolygons && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <Info size={16} />
                        Polígonos não disponíveis. Exibindo modo círculos. Importe um GeoJSON pelo painel admin.
                    </div>
                )}

                {/* Legend */}
                {!listMode && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold">
                            <Info size={16} className="text-indigo-500" /> Legenda de Risco:
                        </div>
                        <div className="flex flex-wrap gap-3 font-medium">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> OK (≤3m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Atenção (3–8m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Ruim (8–15m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Crítico (+15m)</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="min-h-[600px] h-[calc(100vh-300px)] relative">
                    {listMode ? (
                        <ListView neighborhoods={neighborhoods} critOnly={critOnly} />
                    ) : (
                        <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative z-0">
                            <Suspense fallback={
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <Loader2 className="animate-spin mb-3" size={32} />
                                    <span className="font-medium text-sm">Carregando mapa...</span>
                                </div>
                            }>
                                <NeighborhoodMapWrapper
                                    neighborhoods={neighborhoods}
                                    geojsonData={hasPolygons ? apiResponse.geojson : undefined}
                                    mode={hasPolygons ? 'polygons' : 'circles'}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
