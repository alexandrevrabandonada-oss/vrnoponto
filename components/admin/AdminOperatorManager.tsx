'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, XCircle, Clock, MapPin,
    Link as LinkIcon, Loader2, Check, RefreshCw,
    Filter, Trash2, Eye, Map, AlertTriangle
} from 'lucide-react';
import { SectionCard, Button, Badge, IconButton } from '@/components/ui';
import { DraftMapModal } from './DraftMapModal';
import { trackFunnel, FUNNEL_EVENTS } from '@/lib/telemetry';

export function AdminOperatorManager() {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [operatorLink, setOperatorLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'recent' | 'gps'>('recent');
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // Map Modal State
    const [mapDraft, setMapDraft] = useState<any | null>(null);

    const fetchDrafts = async () => {
        setIsLoading(true);
        setSelectedIds(new Set());
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

    const handleAction = async (id: string | string[], action: 'approve' | 'reject') => {
        const isBulk = Array.isArray(id);
        if (isBulk) setIsBulkLoading(true);
        else setActionId(id as string);

        try {
            const res = await fetch('/api/admin/stops/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isBulk ? { ids: id, action } : { id, action })
            });
            if (res.ok) {
                const idsToRemove = isBulk ? (id as string[]) : [id as string];
                setDrafts(prev => prev.filter(d => !idsToRemove.includes(d.id)));
                setSelectedIds(new Set());

                if (isBulk) {
                    trackFunnel(action === 'approve' ? FUNNEL_EVENTS.DRAFT_BULK_APPROVE : FUNNEL_EVENTS.DRAFT_BULK_REJECT);
                }
            } else {
                const data = await res.json();
                alert(`Erro: ${data.error}`);
            }
        } catch (err) {
            alert('Erro na conexão');
        } finally {
            if (isBulk) setIsBulkLoading(false);
            else setActionId(null);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredDrafts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
        }
    };

    const filteredDrafts = drafts.filter(d => {
        if (filter === 'gps') {
            // Placeholder: Assume precision is suspiciously low if we had that metadata
            // For now, let's just show all or implement a real check if metadata exists
            return true;
        }
        return true;
    });

    useEffect(() => {
        if (filteredDrafts.length === 0 && !isLoading) {
            // Optional: Handle empty state if needed
        }
    }, [filteredDrafts.length, isLoading]);

    useEffect(() => {
        // Init fetch
        fetchDrafts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-1">
                            <div className="flex items-center gap-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand">Rascunhos Pendentes ({drafts.length})</h4>
                                <div className="flex items-center bg-white/5 rounded-xl p-1">
                                    <button
                                        onClick={() => setFilter('recent')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filter === 'recent' ? 'bg-brand text-black' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Recentes
                                    </button>
                                    <button
                                        onClick={() => setFilter('gps')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filter === 'gps' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        GPS Suspeito
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={fetchDrafts} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40">
                                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="text-brand shrink-0" size={20} />
                                    <p className="text-xs font-bold text-white uppercase italic tracking-tight">
                                        {selectedIds.size} itens selecionados
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleAction(Array.from(selectedIds), 'reject')}
                                        disabled={isBulkLoading}
                                        className="flex-1 sm:flex-none !h-10 !px-6 border-white/10 text-red-400 hover:bg-red-500/10 uppercase text-[10px] font-black tracking-widest"
                                    >
                                        Rejeitar
                                    </Button>
                                    <Button
                                        loading={isBulkLoading}
                                        onClick={() => handleAction(Array.from(selectedIds), 'approve')}
                                        className="flex-1 sm:flex-none !h-10 !px-8 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-brand/20"
                                    >
                                        Aprovar Selecionados
                                    </Button>
                                </div>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-white/5 rounded-3xl border border-white/5" />
                                ))}
                            </div>
                        ) : filteredDrafts.length === 0 ? (
                            <div className="py-12 px-6 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
                                <Clock size={32} className="mx-auto text-white/10" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                                    Nenhum rascunho pendente — gere um link acima para começar.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <div className="flex items-center gap-4 px-5 pb-1 select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredDrafts.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 bg-black border-white/20 rounded focus:ring-brand accent-brand cursor-pointer"
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Selecionar Todos</span>
                                </div>
                                {filteredDrafts.map(draft => (
                                    <div key={draft.id} className={`group p-5 rounded-3xl bg-white/[0.02] border transition-all flex items-center justify-between gap-6 ${selectedIds.has(draft.id) ? 'border-brand/40 bg-brand/[0.04]' : 'border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(draft.id)}
                                                onChange={() => toggleSelect(draft.id)}
                                                className="w-5 h-5 bg-black border-white/20 rounded-lg focus:ring-brand accent-brand cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(draft.id);
                                                }}
                                            />
                                            <div className="p-4 rounded-2xl bg-white/5 text-white/40 group-hover:bg-brand/10 group-hover:text-brand transition-all hidden sm:block">
                                                <MapPin size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono text-white/20 select-all">{draft.id.split('-')[0]}</span>
                                                    <Badge variant="muted" className="!text-[8px] py-0">{new Date(draft.created_at).toLocaleDateString()}</Badge>
                                                    {draft.geom?.coordinates[1] === 0 && <Badge variant="danger" className="!text-[8px] py-0">GPS OFF</Badge>}
                                                </div>
                                                <h5 className="text-sm font-black text-white uppercase italic tracking-tight leading-tight">{draft.name_suggested}</h5>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <IconButton
                                                icon={<Eye size={16} />}
                                                onClick={() => setMapDraft({
                                                    name_suggested: draft.name_suggested,
                                                    lat: draft.geom.coordinates[1],
                                                    lng: draft.geom.coordinates[0]
                                                })}
                                                className="!bg-white/5 hover:!bg-white/10 text-white/40 hover:text-white"
                                            />
                                            <div className="hidden sm:flex items-center gap-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleAction(draft.id, 'reject')}
                                                    disabled={!!actionId || isBulkLoading}
                                                    className="!h-10 !px-6 hover:!bg-red-500/20 hover:!text-red-400 font-black italic tracking-widest text-[10px] uppercase border border-white/5"
                                                >
                                                    Rejeitar
                                                </Button>
                                                <Button
                                                    onClick={() => handleAction(draft.id, 'approve')}
                                                    loading={actionId === draft.id}
                                                    disabled={!!actionId || isBulkLoading}
                                                    icon={<Check size={18} />}
                                                    className="!h-10 !px-8 bg-emerald-500/80 hover:bg-emerald-500 text-white font-black italic tracking-widest text-[10px] uppercase"
                                                >
                                                    Aprovar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>

            <DraftMapModal
                isOpen={!!mapDraft}
                onClose={() => setMapDraft(null)}
                draft={mapDraft}
            />
        </div>
    );
}
