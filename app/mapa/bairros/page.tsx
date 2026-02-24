import { Suspense } from 'react';
import Link from 'next/link';
import { Loader2, CircleDot } from 'lucide-react';
import NeighborhoodMapWrapper from '@/components/NeighborhoodMapWrapper';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';
import {
    AppShell, PublicTopBar, PageHeader, SectionCard,
    SecondaryCTA
} from '@/components/ui';
import { NeighborhoodListView } from './NeighborhoodListView';

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
        <AppShell title="Mapa de Bairros">

            <div className="max-w-7xl mx-auto py-4 space-y-8">
                <SectionCard>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex-1">
                            <PageHeader
                                title="Mapa de Bairros"
                                subtitle={hasPolygons ? 'Mapa detalhado com áreas geodemográficas (30d)' : 'Visualização aproximada por centroide (30d)'}
                                className="!pb-0"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {/* View Mode */}
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-1">Visualização</p>
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                    <Link
                                        href={toggleParam('m', '__clear__').replace('m=__clear__&', '').replace('?m=__clear__', '').replace('&m=__clear__', '')}
                                        className={`min-w-[88px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest text-center transition-all ${!listMode ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/60 hover:text-white'}`}
                                    >
                                        Mapa
                                    </Link>
                                    <Link
                                        href={toggleParam('m', 'lista')}
                                        className={`min-w-[88px] px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest text-center transition-all ${listMode ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/60 hover:text-white'}`}
                                    >
                                        Lista
                                    </Link>
                                </div>
                            </div>

                            {/* Type Mode (Circles vs Polygons) */}
                            {!listMode && (
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                    <Link
                                        href={`/mapa/bairros${searchParams.f ? `?f=${searchParams.f}` : ''}`}
                                        className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${!polyMode ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Círculos
                                    </Link>
                                    <Link
                                        href={`/mapa/bairros?v=polygons${searchParams.f ? `&f=${searchParams.f}` : ''}`}
                                        className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${polyMode ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Polígonos
                                    </Link>
                                </div>
                            )}

                            {/* Critical Filter */}
                            <Link
                                href={critOnly ? '/mapa/bairros' : `/mapa/bairros?f=criticos${polyMode ? '&v=polygons' : ''}`}
                                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${critOnly ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:border-white/10'}`}
                            >
                                Críticos
                            </Link>
                        </div>
                    </div>
                </SectionCard>

                {polyMode && !hasPolygons && (
                    <SecondaryCTA className="w-full !justify-start !bg-red-500/10 !border-red-500/20 !text-red-400 !h-auto !py-4">
                        <div className="flex items-center gap-3">
                            <CircleDot className="animate-pulse" />
                            <div className="text-left">
                                <p className="font-bold uppercase tracking-widest text-[10px]">Aviso Técnico</p>
                                <p className="text-xs opacity-80">Polígonos em processamento. Usando centroides temporariamente.</p>
                            </div>
                        </div>
                    </SecondaryCTA>
                )}

                {listMode ? (
                    <NeighborhoodListView neighborhoods={neighborhoods} critOnly={critOnly} />
                ) : (
                    <div className="space-y-6">
                        {/* Legend */}
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Crítico (+15m)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Ruim (+10m)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Atenção (+5m)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Normal</span>
                            </div>
                        </div>

                        {/* Map Container */}
                        <div className="min-h-[600px] h-[calc(100vh-450px)] relative bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <Suspense fallback={
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                                    <Loader2 className="animate-spin text-brand mb-4" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Renderizando Geometrias...</p>
                                </div>
                            }>
                                <NeighborhoodMapWrapper
                                    neighborhoods={neighborhoods}
                                    geojsonData={apiResponse.geojson}
                                    mode={polyMode ? 'polygons' : 'circles'}
                                />
                            </Suspense>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
