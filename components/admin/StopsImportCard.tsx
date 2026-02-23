'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye } from 'lucide-react';

interface ImportResult {
    dryRun: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
    errors?: string[];
}

interface PreviewRow {
    name: string;
    lat: number;
    lng: number;
    neighborhood?: string;
}

export function StopsImportCard() {
    const [file, setFile] = useState<File | null>(null);
    const [dryRun, setDryRun] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);

    useEffect(() => {
        if (!file) {
            setPreviewRows([]);
            return;
        }

        // Generate client-side preview
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) return;

                const rows: PreviewRow[] = [];
                const fileName = file.name.toLowerCase();

                if (fileName.endsWith('.csv')) {
                    const lines = text.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length > 1) {
                        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                        const nameIdx = header.findIndex(h => h === 'name' || h === 'nome');
                        const latIdx = header.findIndex(h => h === 'lat' || h === 'latitude');
                        const lngIdx = header.findIndex(h => h === 'lng' || h === 'longitude' || h === 'lon');
                        const nhIdx = header.findIndex(h => h === 'neighborhood' || h === 'bairro');

                        if (nameIdx >= 0 && latIdx >= 0 && lngIdx >= 0) {
                            for (let i = 1; i < lines.length; i++) {
                                const cols = lines[i].split(',').map(c => c.trim());
                                const name = cols[nameIdx];
                                const lat = parseFloat(cols[latIdx]);
                                const lng = parseFloat(cols[lngIdx]);
                                if (name && !isNaN(lat) && !isNaN(lng)) {
                                    rows.push({
                                        name, lat, lng,
                                        neighborhood: nhIdx >= 0 ? cols[nhIdx] : undefined
                                    });
                                }
                            }
                        }
                    }
                } else if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
                    const json = JSON.parse(text);
                    const features = Array.isArray(json) ? json : json.features || [];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    for (const f of features as any[]) {
                        if (f.geometry?.type === 'Point' && f.geometry?.coordinates) {
                            const [lng, lat] = f.geometry.coordinates;
                            const name = f.properties?.name || f.properties?.nome || f.properties?.Name;
                            if (name && !isNaN(lat) && !isNaN(lng)) {
                                rows.push({
                                    name, lat, lng,
                                    neighborhood: f.properties?.neighborhood || f.properties?.bairro
                                });
                            }
                        }
                    }
                }

                setPreviewRows(rows);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                // Ignore parse errors on preview
            }
        };
        reader.readAsText(file);
    }, [file]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/admin/stops/import?dryRun=${dryRun}`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult(data);
            if (!dryRun) setFile(null); // Clear on success
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <Upload size={20} className="text-brand" />
                <h2 className="text-xl font-bold">Importar Arquivo (CSV/GeoJSON)</h2>
            </div>
            <p className="text-sm text-gray-500">
                Upload manual de CSV (<code>name,lat,lng,neighborhood</code>) ou GeoJSON (Point features).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo</label>
                        <input
                            type="file"
                            accept=".csv,.geojson,.json"
                            onChange={(e) => {
                                setFile(e.target.files?.[0] || null);
                                setResult(null);
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
                        disabled={!file || loading}
                        className="bg-brand text-black px-6 py-2 rounded-md font-bold hover:brightness-110 transition h-[42px] disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : 'Importar'}
                    </button>
                </div>
            </form>

            {/* Client-side Preview */}
            {previewRows.length > 0 && !result && !loading && (
                <div className="mt-4 border rounded-lg bg-gray-50 overflow-hidden text-sm">
                    <div className="p-2 border-b bg-gray-100 flex items-center justify-between">
                        <div className="font-semibold flex items-center gap-2 text-gray-700">
                            <Eye size={14} /> Preview da Importação
                        </div>
                        <div className="text-xs text-brand bg-brand/10 px-2 py-0.5 rounded font-bold">
                            {previewRows.length} pontos válidos detectados
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b text-[10px] uppercase text-gray-500 sticky top-0">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Neighborhood</th>
                                    <th className="p-2">Coords</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs text-gray-600">
                                {previewRows.slice(0, 20).map((r, i) => (
                                    <tr key={i}>
                                        <td className="p-2 font-medium text-gray-800">{r.name}</td>
                                        <td className="p-2">{r.neighborhood || '-'}</td>
                                        <td className="p-2 font-mono text-[10px]">{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewRows.length > 20 && (
                            <div className="p-2 text-center text-[10px] text-gray-400 font-medium bg-white">
                                + {previewRows.length - 20} pontos ocultos no preview
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {result && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                        {result.dryRun ? (
                            <FileText size={16} className="text-yellow-400" />
                        ) : (
                            <CheckCircle size={16} className="text-green-500" />
                        )}
                        <span className="font-bold text-sm">
                            {result.dryRun ? 'Simulação (Dry Run)' : 'Importação Efetivada'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-gray-900">{result.total}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Lidos</div>
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
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Pulados</div>
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
