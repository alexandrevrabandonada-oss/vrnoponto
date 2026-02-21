'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PdfParserCard } from '@/components/admin/PdfParserCard';

export default function AdminOficial() {
    const [lines, setLines] = useState<{ id: string, code: string, name: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncLog, setSyncLog] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        async function loadLines() {
            const supabase = createClient();
            const { data } = await supabase.from('lines').select('id, code, name').order('code');
            if (data) setLines(data);
        }
        loadLines();
    }, []);

    async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsUploading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/admin/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro no upload');
            }

            setMessage('Upload concluído com sucesso!');
            (e.target as HTMLFormElement).reset();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Ocorreu um erro';
            setMessage(`Erro: ${errorMsg}`);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Horários Oficiais</h1>
                <p className="text-gray-600">Faça upload de tabelas de horário em PDF para as linhas.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Novo Documento PDF</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linha *</label>
                        <select name="lineId" required className="w-full p-2 border rounded-md">
                            <option value="">Selecione a linha...</option>
                            {lines.map(l => (
                                <option key={l.id} value={l.id}>{l.code} - {l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Válido a partir de *</label>
                        <input type="date" name="validFrom" required className="w-full p-2 border rounded-md" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo PDF *</label>
                        <input type="file" name="pdfFile" accept="application/pdf" required className="w-full p-2 border rounded-md" />
                    </div>

                    <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {isUploading ? 'Enviando...' : 'Fazer Upload'}
                    </button>

                    {message && (
                        <p className={`text-sm p-3 rounded ${message.startsWith('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {message}
                        </p>
                    )}
                </form>
            </div>

            {/* Sync Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-indigo-600">⚡</span> Sincronizador Automático da PMVR
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                    Esta ferramenta varre o site oficial e busca as tabelas de horários postadas, adicionando magicamente ao servidor aquilo que for documentação inédita.
                </p>

                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSyncing(true);
                    setSyncLog(null);

                    const fd = new FormData(e.currentTarget);
                    const isDry = fd.get('dryRun') === 'on';
                    const onlyUrl = fd.get('onlyType') !== 'ALL' ? `?only=${fd.get('onlyType')}` : '';

                    try {
                        const res = await fetch(`/api/admin/sync-official${onlyUrl}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dryRun: isDry, limit: parseInt(fd.get('limit') as string) || 0 })
                        });
                        const data = await res.json();
                        setSyncLog(data);
                    } catch (err: unknown) {
                        setSyncLog({ error: err instanceof Error ? err.message : 'Unknown erro na chamada sync.' });
                    } finally {
                        setIsSyncing(false);
                    }
                }} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar Documentos</label>
                            <select name="onlyType" className="w-full p-2 border rounded-md">
                                <option value="ALL">Horários e Itinerários</option>
                                <option value="HORARIO">Somente Horários</option>
                                <option value="ITINERARIO">Somente Itinerários</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Limite Máximo</label>
                            <input type="number" name="limit" placeholder="Padrão: sem limite" className="w-full p-2 border rounded-md" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="dryrun" name="dryRun" defaultChecked className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="dryrun" className="text-sm text-gray-700 font-medium">Modo Simulação (Dry-Run)</label>
                        <span className="text-xs text-gray-400">- Não baixa nem salva nada, apenas lista.</span>
                    </div>

                    <button
                        type="submit"
                        disabled={isSyncing}
                        className="w-full bg-slate-800 text-white px-6 py-2 rounded-md font-medium hover:bg-slate-900 transition disabled:opacity-50"
                    >
                        {isSyncing ? 'Sincronizando...' : 'Rodar Sincronização'}
                    </button>

                    {syncLog && (
                        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md text-sm overflow-auto max-h-64">
                            <pre className="text-xs text-gray-800 font-mono">
                                {JSON.stringify(syncLog, null, 2)}
                            </pre>
                        </div>
                    )}
                </form>
            </div>

            {/* Parser Extractor Card */}
            <PdfParserCard />
        </div>
    );
}
