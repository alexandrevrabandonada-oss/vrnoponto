'use client';

import { useState } from 'react';
import { DownloadCloud, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

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

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <DownloadCloud size={20} className="text-brand" />
                <h2 className="text-xl font-bold">Importar via OpenStreetMap (Overpass)</h2>
            </div>
            <p className="text-sm text-gray-500">
                Consulta a API pública do OSM buscando nós em <code className="bg-gray-100 p-0.5 rounded">highway=bus_stop</code> na região selecionada.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {dryRun && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
                        Dry run: nada foi salvo.
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Região de Bounding Box (S, W, N, E):</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => { setBbox('-22.5350,-44.1150,-22.5050,-44.0850'); setDryRun(false); setLimit(50); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1 ${bbox === '-22.5350,-44.1150,-22.5050,-44.0850' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100'}`}
                        >
                            🌱 Seed Mínimo VR (50 pts)
                        </button>
                    </div>
                    <input
                        type="text"
                        value={bbox}
                        onChange={(e) => setBbox(e.target.value)}
                        placeholder="minLat, minLon, maxLat, maxLon"
                        className="w-full text-sm p-2 border border-gray-300 rounded focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                    />
                </div>

                <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-gray-100 mt-2">
                    <div className="w-24">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Limite</label>
                        <input
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="w-full text-sm p-2 border border-gray-300 rounded focus:border-brand"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer h-10">
                        <input
                            type="checkbox"
                            checked={dryRun}
                            onChange={(e) => setDryRun(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        Dry Run (simular)
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand text-black px-6 py-2 rounded-md font-bold hover:brightness-110 transition h-[40px] disabled:opacity-50"
                    >
                        {loading ? 'Consultando...' : 'Importar OSM'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {result && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2 relative overflow-hidden">
                    {result.dryRun && (
                        <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            Dry run: nada foi salvo.
                        </div>
                    )}
                    {result.cacheHit && (
                        <div className="absolute top-2 right-2 text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            Respondeu do Cache (6h)
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        {result.dryRun ? (
                            <FileText size={16} className="text-yellow-400" />
                        ) : (
                            <CheckCircle size={16} className="text-green-500" />
                        )}
                        <span className="font-bold text-sm">
                            {result.dryRun ? 'Simulação de Importação' : 'Importação e Sincronização OSM'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-gray-900">{result.total}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Total da API</div>
                        </div>
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-green-600">{result.inserted}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Inseridos (Novos)</div>
                        </div>
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-yellow-500">{result.updated}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Atualizados</div>
                        </div>
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-gray-400">{result.skipped}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Pulados (Iguais)</div>
                        </div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                        <div className="mt-2 p-3 rounded bg-red-50 border border-red-100 text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                            {result.errors.map((err, i) => (
                                <div key={i}>{err}</div>
                            ))}
                        </div>
                    )}

                    {!result.dryRun && result.nodes && result.nodes.length > 0 && (
                        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <div className="h-48 w-full relative z-0">
                                <MapContainer
                                    center={[result.nodes[0].lat, result.nodes[0].lon]}
                                    zoom={13}
                                    scrollWheelZoom={false}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {result.nodes.map((node: any, idx: number) => (
                                        <CircleMarker
                                            key={idx}
                                            center={[node.lat, node.lon]}
                                            radius={5}
                                            pathOptions={{
                                                color: node.action === 'inserted' ? '#10b981' : node.action === 'updated' ? '#eab308' : '#9ca3af',
                                                fillOpacity: 0.7
                                            }}
                                        >
                                            <Tooltip>{node.name} ({node.action})</Tooltip>
                                        </CircleMarker>
                                    ))}
                                </MapContainer>
                            </div>
                            <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <a href="/mapa" target="_blank" className="text-xs font-bold flex items-center gap-1 text-brand hover:underline">
                                    Ver Mapa Completo <ArrowRight size={12} />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
