'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui';

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
            } catch {
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

    const labelBase = "block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 ml-1";

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <Upload size={18} className="text-brand" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Upload de Arquivo</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex-1">
                            <label className={labelBase}>Selecione CSV ou GeoJSON</label>
                            <input
                                type="file"
                                accept=".csv,.geojson,.json"
                                onChange={(e) => {
                                    setFile(e.target.files?.[0] || null);
                                    setResult(null);
                                }}
                                className="w-full text-xs text-white/40 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/5 file:text-white hover:file:bg-white/10 file:transition-colors cursor-pointer"
                            />
                        </div>

                        <label className="flex items-center gap-3 text-xs font-bold text-white/60 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border ${dryRun ? 'bg-brand border-brand' : 'border-white/20 group-hover:border-white/40'} flex items-center justify-center transition-all`}>
                                <input
                                    type="checkbox"
                                    checked={dryRun}
                                    onChange={(e) => setDryRun(e.target.checked)}
                                    className="sr-only"
                                />
                                {dryRun && <CheckCircle size={14} className="text-black" />}
                            </div>
                            Simular Importação (Dry Run)
                        </label>
                    </div>

                    <Button
                        type="submit"
                        disabled={!file || loading}
                        className="w-full !h-14 uppercase font-black italic tracking-widest shadow-xl shadow-brand/10"
                    >
                        {loading ? 'Processando...' : 'Iniciar Importação'}
                    </Button>
                </form>
            </div>

            {/* Client-side Preview */}
            {previewRows.length > 0 && !result && !loading && (
                <div className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden text-sm">
                    <div className="p-4 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-white/60">
                            <Eye size={14} /> Preview dos Dados
                        </div>
                        <div className="text-[9px] text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                            {previewRows.length} pontos detectados
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="text-[9px] uppercase tracking-tighter text-white/30 sticky top-0 bg-[#0c0f14]">
                                <tr>
                                    <th className="px-4 py-2 border-b border-white/5">Name</th>
                                    <th className="px-4 py-2 border-b border-white/5">Bairro</th>
                                    <th className="px-4 py-2 border-b border-white/5">Coords</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {previewRows.slice(0, 50).map((r, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2 font-bold text-white/80">{r.name}</td>
                                        <td className="px-4 py-2 text-white/40 italic">{r.neighborhood || '—'}</td>
                                        <td className="px-4 py-2 font-mono text-[10px] text-white/20">{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewRows.length > 50 && (
                            <div className="p-3 text-center text-[10px] text-white/20 font-black uppercase tracking-widest bg-white/[0.01]">
                                + {previewRows.length - 50} pontos ocultos
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-shake">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {result && (
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {result.dryRun ? (
                                <Info size={20} className="text-amber-400" />
                            ) : (
                                <CheckCircle size={20} className="text-emerald-400" />
                            )}
                            <h4 className="text-sm font-black uppercase tracking-widest text-white">
                                {result.dryRun ? 'Simulação Finalizada' : 'Importação Concluída'}
                            </h4>
                        </div>
                        {result.dryRun && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                                Dry Run
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Lidos', val: result.total, color: 'text-white' },
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

                    {result.errors && result.errors.length > 0 && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] font-mono text-red-400 space-y-1 max-h-40 overflow-y-auto">
                            {result.errors.map((err, i) => (
                                <div key={i}>ERR: {err}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
