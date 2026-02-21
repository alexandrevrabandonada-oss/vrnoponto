'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminOficial() {
    const [lines, setLines] = useState<{ id: string, code: string, name: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');

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
        </div>
    );
}
