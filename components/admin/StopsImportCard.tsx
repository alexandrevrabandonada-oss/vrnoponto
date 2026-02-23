'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportResult {
    dryRun: boolean;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
    errors?: string[];
}

export function StopsImportCard() {
    const [file, setFile] = useState<File | null>(null);
    const [dryRun, setDryRun] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');

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
                <h2 className="text-xl font-bold">Importar Paradas</h2>
            </div>
            <p className="text-sm text-gray-500">
                Upload de CSV (<code>name,lat,lng,neighborhood</code>) ou GeoJSON (Point features).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo</label>
                        <input
                            type="file"
                            accept=".csv,.geojson,.json"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                            {result.dryRun ? 'Simulação' : 'Importação Completa'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-gray-900">{result.total}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Total</div>
                        </div>
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-green-600">{result.inserted}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Inseridos</div>
                        </div>
                        <div className="p-2 rounded bg-white border">
                            <div className="text-lg font-bold text-yellow-300">{result.updated}</div>
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
