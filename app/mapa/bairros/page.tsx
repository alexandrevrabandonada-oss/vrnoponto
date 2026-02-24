import { Suspense } from 'react';
import Link from 'next/link';
import { Info, Loader2, Map as MapIcon, MenuSquare, Zap, MapPin, ArrowLeft, Hexagon, CircleDot } from 'lucide-react';
import NeighborhoodMapWrapper from '@/components/NeighborhoodMapWrapper';
import { type NeighborhoodMapItem } from '@/components/NeighborhoodMap';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { EmptyState } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

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
        <div className="rounded-2xl p-4 md:p-6 bg-[#0c0f14] border border-white/10 shadow-2xl">
            <h2 className="text-xl font-industrial tracking-wide italic uppercase text-white mb-6">Bairros por atraso (30 dias)</h2>
            <div className="space-y-3">
                {filtered.map((n, i) => {
                    const riskClasses = getRiskColor(n.risk_band);
                    return (
                        <Link
                            key={n.neighborhood}
                            href={`/bairro/${encodeURIComponent(n.neighborhood)}`}
                            className={`block p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition hover:scale-[1.01] ${riskClasses}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white/40 w-6">{i + 1}</span>
                                <div>
                                    <h3 className="font-bold text-zinc-900">{n.neighborhood}</h3>
                                    <div className="text-xs text-zinc-600 mt-0.5 flex items-center gap-2">
                                        <span>{n.stops_count} pontos</span>
                                        <span>·</span>
                                        <span>{n.samples_total} relatos</span>
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
                    <EmptyState
                        icon={AlertTriangle}
                        title="Mapa Sem Dados"
                        description="Nenhum bairro atingiu a amostragem mínima para visualização espacial. Colabore registrando 3 pontos hoje."
                        actionLabel="Auditar Ponto"
                        onAction={() => window.location.href = '/no-ponto'}
                        secondaryActionLabel="Ver Ranking"
                        onSecondaryAction={() => window.location.href = '/bairros'}
                        className="bg-transparent border-none text-white"
                    />
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
        <main className="min-h-screen bg-[#070707] text-white p-4 md:p-8">
            <div className="fixed inset-0 industrial-texture opacity-15 pointer-events-none" />
            <div className="max-w-7xl mx-auto space-y-6 relative z-10">
                {/* Header */}
                <div className="rounded-2xl border border-white/10 bg-[#0c0f14] p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/bairros" className="text-white/50 hover:text-brand transition-colors">
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-3xl font-industrial italic uppercase tracking-wide text-white flex items-center gap-3">
                                Mapa de bairros <MapPin className="text-brand" />
                            </h1>
                        </div>
                        <p className="text-white/70 mt-1">
                            {hasPolygons ? 'Mapa detalhado dos bairros' : 'Visualização aproximada por centroide'} — cores indicam o nível de atraso (30d).
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            <a href={toggleParam('m', '__clear__').replace('m=__clear__&', '').replace('?m=__clear__', '').replace('&m=__clear__', '')}
                                className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${!listMode ? 'bg-brand/20 text-brand border border-brand/30' : 'text-white/70 hover:text-white'}`}>
                                <MapIcon size={14} /> Mapa
                            </a>
                            <a href={toggleParam('m', 'lista')}
                                className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${listMode ? 'bg-brand/20 text-brand border border-brand/30' : 'text-white/70 hover:text-white'}`}>
                                <MenuSquare size={14} /> Lista
                            </a>
                        </div>

                        {/* Layer Toggle */}
                        {!listMode && (
                            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                <a href={`/mapa/bairros${searchParams.f ? `?f=${searchParams.f}` : ''}`}
                                    className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${!polyMode ? 'bg-brand/20 text-brand border border-brand/30' : 'text-white/70 hover:text-white'}`}>
                                    <CircleDot size={14} /> Círculos
                                </a>
                                <a href={`/mapa/bairros?v=polygons${searchParams.f ? `&f=${searchParams.f}` : ''}`}
                                    className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition ${polyMode ? 'bg-brand/20 text-brand border border-brand/30' : 'text-white/70 hover:text-white'}`}>
                                    <Hexagon size={14} /> Polígonos
                                </a>
                            </div>
                        )}

                        {/* Critical Filter */}
                        <a href={critOnly ? '/mapa/bairros' : `/mapa/bairros?f=criticos${polyMode ? '&v=polygons' : ''}`}
                            className={`px-3 py-2 rounded-md font-medium text-sm flex items-center gap-1.5 transition border ${critOnly ? 'bg-red-500/15 text-red-400 border-red-500/40' : 'bg-white/5 text-white/70 border-white/10 hover:text-white'}`}>
                            <Zap size={14} /> Críticos
                        </a>
                    </div>
                </div>

                {/* Polygon fallback notice */}
                {polyMode && !hasPolygons && (
                    <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-xl text-sm text-amber-200 flex items-center gap-2">
                        <Info size={16} />
                        Polígonos não disponíveis. Exibindo modo círculos. Importe um GeoJSON pelo painel admin.
                    </div>
                )}

                {/* Legend */}
                {!listMode && (
                    <div className="bg-[#0c0f14] p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-white/90 font-semibold">
                            <Info size={16} className="text-brand" /> Legenda de Risco:
                        </div>
                        <div className="flex flex-wrap gap-3 font-medium text-white/80">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> OK (&lt;=3m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Atenção (3-8m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Ruim (8-15m)</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Crítico (+15m)</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="min-h-[600px] h-[calc(100vh-300px)] relative">
                    {listMode ? (
                        <ListView neighborhoods={neighborhoods} critOnly={critOnly} />
                    ) : (
                        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-0 bg-[#0c0f14]">
                            <Suspense fallback={
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0f14] text-white/70">
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
