'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, XCircle, Clock, MapPin,
    Link as LinkIcon, Loader2, Check, RefreshCw
} from 'lucide-react';
import { SectionCard, Button, Badge } from '@/components/ui';

export function AdminOperatorManager() {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [operatorLink, setOperatorLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchDrafts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/stops/drafts');
            const data = await res.json();
            if (res.ok) setDrafts(data.drafts || []);
        } catch (err) {
            console.error('Falha ao carregar rascunhos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/admin/operator/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: 'Novo Operador' })
            });
            const data = await res.json();
            if (res.ok) setOperatorLink(data.link);
        } catch (err) {
            alert('Falha ao gerar link');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActionId(id);
        try {
            const res = await fetch('/api/admin/stops/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            if (res.ok) {
                setDrafts(prev => prev.filter(d => d.id !== id));
            } else {
                const data = await res.json();
                alert(`Erro: ${data.error}`);
            }
        } catch (err) {
            alert('Erro na conexão');
        } finally {
            setActionId(null);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, []);

    const copyLink = () => {
        if (!operatorLink) return;
        navigator.clipboard.writeText(operatorLink);
        alert('Link copiado!');
    };

    return (
        <div className="space-y-8">
            <SectionCard
                title="Gestão de Operadores"
                subtitle="Gere links temporários e revise rascunhos de campo"
                className="border-brand/20 bg-brand/[0.02]"
            >
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                        <div className="flex-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Link de Ativação</h4>
                            <p className="text-xs text-white/60">Gere um link que expira em 24h para que qualquer pessoa possa subir rascunhos de pontos usando GPS.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {operatorLink ? (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in">
                                    <input
                                        readOnly
                                        value={operatorLink}
                                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono w-48 focus:outline-none"
                                    />
                                    <Button onClick={copyLink} className="!h-10 !px-4">Copiar</Button>
                                    <Button variant="ghost" onClick={() => setOperatorLink(null)} className="!h-10 border border-white/10">Novo</Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleGenerateLink}
                                    loading={isGenerating}
                                    icon={<LinkIcon size={14} />}
                                    className="!h-12 !px-8 uppercase font-black italic tracking-widest"
                                >
                                    Gerar Link (24h)
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand">Rascunhos Pendentes ({drafts.length})</h4>
                            <button onClick={fetchDrafts} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40">
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-white/5 rounded-3xl border border-white/5" />
                                ))}
                            </div>
                        ) : drafts.length === 0 ? (
                            <div className="py-12 px-6 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
                                <Clock size={32} className="mx-auto text-white/10" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                                    Nenhum rascunho pendente — gere um link acima para começar.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {drafts.map(draft => (
                                    <div key={draft.id} className="group p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 rounded-2xl bg-white/5 text-white/40 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                                                <MapPin size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono text-white/20 select-all">{draft.id.split('-')[0]}</span>
                                                    <Badge variant="muted" className="!text-[8px] py-0">{new Date(draft.created_at).toLocaleDateString()}</Badge>
                                                </div>
                                                <h5 className="text-sm font-black text-white uppercase italic tracking-tight">{draft.name_suggested}</h5>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleAction(draft.id, 'reject')}
                                                disabled={!!actionId}
                                                className="flex-1 sm:flex-none !h-12 !px-6 hover:!bg-red-500/20 hover:!text-red-400 font-black italic tracking-widest text-[10px] uppercase border border-white/5"
                                            >
                                                Rejeitar
                                            </Button>
                                            <Button
                                                onClick={() => handleAction(draft.id, 'approve')}
                                                loading={actionId === draft.id}
                                                disabled={!!actionId}
                                                icon={<Check size={18} />}
                                                className="flex-1 sm:flex-none !h-12 !px-8 bg-emerald-500/80 hover:bg-emerald-500 text-white font-black italic tracking-widest text-[10px] uppercase"
                                            >
                                                Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}
