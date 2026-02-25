'use client';

import { useState } from 'react';
import { DownloadCloud, CheckCircle, AlertCircle, FileText, MapPin, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });

import 'leaflet/dist/leaflet.css';

interface OsmImportResult {
    dryRun: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
    errors?: string[];
    cacheHit?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodes?: any[];
}

export function OsmImportCard() {
    const [bbox, setBbox] = useState('-22.56,-44.15,-22.47,-44.05'); // Default: Volta Redonda Center
    const [dryRun, setDryRun] = useState(true);
    const [limit, setLimit] = useState<number>(1000);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OsmImportResult | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`/api/admin/stops/import-osm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bbox, dryRun, limit }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao importar via OSM API');
        } finally {
            setLoading(false);
        }
    };

    const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-colors text-sm font-medium";
    const labelBase = "block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 ml-1";

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <DownloadCloud size={18} className="text-brand" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Consulta Overpass API</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className={labelBase}>Região (S, W, N, E):</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => { setBbox('-22.5350,-44.1150,-22.5050,-44.0850'); setDryRun(false); setLimit(50); }}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${bbox === '-22.5350,-44.1150,-22.5050,-44.0850' ? 'bg-brand text-black border-brand' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                                >
                                    🌱 VR Center (50 pts)
                                </button>
                            </div>
                            <input
                                type="text"
                                value={bbox}
                                onChange={(e) => setBbox(e.target.value)}
                                placeholder="minLat, minLon, maxLat, maxLon"
                                className={`${inputBase} font-mono`}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className={labelBase}>Limite de Pontos</label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                    className={inputBase}
                                />
                            </div>
                            <div className="flex items-end flex-1">
                                <label className="flex items-center gap-3 text-xs font-bold text-white/60 cursor-pointer group mb-3">
                                    <div className={`w-5 h-5 rounded border ${dryRun ? 'bg-brand border-brand' : 'border-white/20 group-hover:border-white/40'} flex items-center justify-center transition-all`}>
                                        <input
                                            type="checkbox"
                                            checked={dryRun}
                                            onChange={(e) => setDryRun(e.target.checked)}
                                            className="sr-only"
                                        />
                                        {dryRun && <CheckCircle size={14} className="text-black" />}
                                    </div>
                                    Dry Run (Simular)
                                </label>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full !h-14 uppercase font-black italic tracking-widest shadow-xl shadow-brand/10"
                    >
                        {loading ? 'Consultando OSM...' : 'Importar de Sincronizar'}
                    </Button>
                </form>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-shake">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {result && (
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 animate-in zoom-in-95 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />

                    <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-2">
                            {result.dryRun ? (
                                <FileText size={20} className="text-amber-400" />
                            ) : (
                                <CheckCircle size={20} className="text-emerald-400" />
                            )}
                            <h4 className="text-sm font-black uppercase tracking-widest text-white">
                                {result.dryRun ? 'Pré-visualização OSM' : 'OSM Sincronizado'}
                            </h4>
                        </div>
                        {result.cacheHit && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                <Layers size={10} className="text-white/40" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Cache (6h)</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                        {[
                            { label: 'Encontrados', val: result.total, color: 'text-white' },
                            { label: 'Novos', val: result.inserted, color: 'text-emerald-400' },
                            { label: 'Atualizados', val: result.updated, color: 'text-amber-400' },
                            { label: 'Pulados', val: result.skipped, color: 'text-white/20' }
                        ].map((stat, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <div className={`text-2xl font-industrial italic ${stat.color}`}>{stat.val}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {result.nodes && result.nodes.length > 0 && (
                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40 relative">
                            <div className="h-48 w-full relative z-0">
                                <MapContainer
                                    center={[result.nodes[0].lat, result.nodes[0].lon]}
                                    zoom={13}
                                    scrollWheelZoom={false}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {result.nodes.map((node: any, idx: number) => (
                                        <CircleMarker
                                            key={idx}
                                            center={[node.lat, node.lon]}
                                            radius={6}
                                            pathOptions={{
                                                color: node.action === 'inserted' ? '#10b981' : node.action === 'updated' ? '#fbbf24' : '#ffffff',
                                                fillOpacity: 0.8,
                                                weight: 2
                                            }}
                                        >
                                            <Tooltip className="!bg-black !border-white/10 !text-white !font-bold !text-[10px] !rounded-lg !px-3 !py-1">
                                                {node.name}
                                            </Tooltip>
                                        </CircleMarker>
                                    ))}
                                </MapContainer>
                            </div>
                            <div className="p-3 bg-white/[0.03] border-t border-white/5 flex justify-between items-center">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Novo</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Atualizado</span>
                                    </div>
                                </div>
                                <a href="/mapa" target="_blank" className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-brand hover:underline">
                                    Explorar Mapa <MapPin size={12} />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
