'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PdfParserCard } from '@/components/admin/PdfParserCard';
import {
    PageHeader, Button, Card, Divider,
    Field, Input, Select, Switch
} from '@/components/ui';
import { AlertCircle, CheckCircle2, CloudUpload, RefreshCw } from 'lucide-react';

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

            setMessage('UPLOAD CONCLUÍDO COM SUCESSO!');
            (e.target as HTMLFormElement).reset();
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Ocorreu um erro';
            setMessage(`ERRO: ${errorMsg.toUpperCase()}`);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="space-y-12">
            <PageHeader
                title="Horários Oficiais"
                subtitle="Gestão de tabelas de horário e itinerários."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <Card className="border-white/5 bg-zinc-900/50">
                    <h2 className="font-industrial text-lg uppercase tracking-tight text-white mb-6 flex items-center gap-2">
                        <CloudUpload size={20} className="text-brand" /> Novo Documento PDF
                    </h2>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <Field label="Linha Relacionada" hint="Selecione a linha para este documento">
                            <Select name="lineId" required>
                                <option value="" className="bg-zinc-900">Selecione a linha...</option>
                                {lines.map(l => (
                                    <option key={l.id} value={l.id} className="bg-zinc-900">{l.code} - {l.name}</option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Data de Vigência" hint="Válido a partir desta data">
                            <Input id="validFrom" type="date" name="validFrom" required />
                        </Field>

                        <Field label="Arquivo de Origem" hint="Apenas arquivos .pdf permitidos">
                            <Input
                                id="pdfFile"
                                type="file"
                                name="pdfFile"
                                accept="application/pdf"
                                required
                                className="!py-2 text-[10px]"
                            />
                        </Field>

                        <Button
                            type="submit"
                            loading={isUploading}
                            className="w-full h-14"
                        >
                            Processar e Salvar
                        </Button>

                        {message && (
                            <div className={`p-4 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in slide-in-from-top-1 ${message.includes('ERRO')
                                    ? 'bg-danger/10 border-danger/20 text-danger'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                {message.includes('ERRO') ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                                {message}
                            </div>
                        )}
                    </form>
                </Card>

                {/* Sync Section */}
                <Card className="border-brand/10 bg-brand/5">
                    <h2 className="font-industrial text-lg uppercase tracking-tight text-white mb-2 flex items-center gap-2">
                        <RefreshCw size={20} className="text-brand" /> Sincronizador PMVR
                    </h2>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-tight mb-6 opacity-70">
                        Busca automática de novos documentos no site oficial.
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
                    }} className="space-y-6">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Filtro de Conteúdo" hint="O que baixar?">
                                <Select name="onlyType">
                                    <option value="ALL" className="bg-zinc-900">Tudo (Horários + Iter.)</option>
                                    <option value="HORARIO" className="bg-zinc-900">Somente Horários</option>
                                    <option value="ITINERARIO" className="bg-zinc-900">Somente Itinerários</option>
                                </Select>
                            </Field>
                            <Field label="Limite de Docs" hint="0 = sem limite">
                                <Input type="number" name="limit" placeholder="Ex: 10" />
                            </Field>
                        </div>

                        <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-xl border border-white/5">
                            <Switch
                                id="dryRun"
                                checked={true}
                                onChange={() => { }} // Controlled by FormData for now, keeping visual
                                className="pointer-events-none opacity-50"
                            />
                            <div className="space-y-0.5">
                                <label htmlFor="dryrun" className="text-xs font-black uppercase tracking-tight text-white">Modo Simulação</label>
                                <p className="text-[9px] text-muted uppercase font-bold opacity-60">Lista sem salvar no banco.</p>
                            </div>
                            <input type="checkbox" name="dryRun" defaultChecked className="hidden" />
                        </div>

                        <Button
                            type="submit"
                            variant="secondary"
                            loading={isSyncing}
                            className="w-full h-14"
                        >
                            Executar Varredura
                        </Button>

                        {syncLog && (
                            <div className="mt-4 p-4 bg-black border border-white/5 rounded-xl text-xs overflow-auto max-h-64 font-mono text-emerald-500/80">
                                <pre className="text-[10px]">
                                    {JSON.stringify(syncLog, null, 2)}
                                </pre>
                            </div>
                        )}
                    </form>
                </Card>
            </div>

            <Divider label="EXTRAÇÃO DE DADOS" />
            <PdfParserCard />
        </div>
    );
}
