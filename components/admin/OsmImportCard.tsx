'use client';

import { useState } from 'react';
import { DownloadCloud, CheckCircle, AlertCircle, Map, FileText } from 'lucide-react';

interface OsmImportResult {
    dryRun: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
    errors?: string[];
    cacheHit?: boolean;
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
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Região de Bounding Box (S, W, N, E):</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setBbox('-22.56,-44.15,-22.47,-44.05')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1 ${bbox === '-22.56,-44.15,-22.47,-44.05' ? 'bg-brand/10 border-brand text-brand' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Map size={14} /> Centro Expandido
                        </button>
                        <button
                            type="button"
                            onClick={() => setBbox('-22.60,-44.20,-22.40,-44.00')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1 ${bbox === '-22.60,-44.20,-22.40,-44.00' ? 'bg-brand/10 border-brand text-brand' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Map size={14} /> VR Inteira
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
                </div>
            )}
        </div>
    );
}
