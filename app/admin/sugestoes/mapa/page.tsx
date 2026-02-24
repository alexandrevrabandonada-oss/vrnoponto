'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    CheckCircle, XCircle, MapPin, Users,
    RefreshCw, List, Map as MapIcon, X, Filter
} from 'lucide-react';

// Lazy-load map to avoid SSR issues with Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SuggestionsMap = dynamic(() => import('@/components/admin/SuggestionsMap') as any, {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-zinc-800 rounded-xl animate-pulse text-white/30 font-medium">
            Carregando Mapa...
        </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export interface MapSuggestion {
    id: string;
    name_suggested: string;
    confirmations: number;
    created_at: string;
    lat: number;
    lng: number;
    notes: string | null;
    neighborhood_text: string | null;
}

export default function AdminSugestoesMapa() {
    const searchParams = useSearchParams();
    const isListMode = searchParams.get('m') === 'lista';

    const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<MapSuggestion | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [rejectNote, setRejectNote] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    // Filters
    const [hoursFilter, setHoursFilter] = useState('');
    const [minConf, setMinConf] = useState('');

    const trackTelemetry = useCallback((event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event }),
        }).catch(() => { });
    }, []);

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (hoursFilter) params.set('hours', hoursFilter);
            if (minConf) params.set('minConfirmations', minConf);
            const res = await fetch(`/api/admin/stop-suggestions/map?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, [hoursFilter, minConf]);

    useEffect(() => {
        trackTelemetry('admin_suggestions_map_open');
        fetchSuggestions();
    }, [fetchSuggestions, trackTelemetry]);

    const handleApprove = async (id: string) => {
        setActionLoading(true);
        setMessage('');
        trackTelemetry('admin_suggestion_approve_click');
        try {
            const res = await fetch('/api/admin/stop-suggestions/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(`✅ ${data.message}`);
            setSuggestions(prev => prev.filter(s => s.id !== id));
            setSelected(null);
        } catch (err: unknown) {
            setMessage(`❌ ${err instanceof Error ? err.message : 'Erro'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(true);
        setMessage('');
        trackTelemetry('admin_suggestion_reject_click');
        try {
            const res = await fetch('/api/admin/stop-suggestions/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, admin_note: rejectNote || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(`✅ ${data.message}`);
            setSuggestions(prev => prev.filter(s => s.id !== id));
            setSelected(null);
            setShowRejectInput(false);
            setRejectNote('');
        } catch (err: unknown) {
            setMessage(`❌ ${err instanceof Error ? err.message : 'Erro'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const SidePanel = () => {
        if (!selected) return null;
        return (
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-sm border-l border-white/10 z-[1000] overflow-y-auto animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-brand" />
                            <h3 className="text-sm font-bold text-white">{selected.name_suggested}</h3>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {selected.notes && (
                        <p className="text-xs text-white/50">📝 {selected.notes}</p>
                    )}
                    {selected.neighborhood_text && (
                        <p className="text-xs text-white/40">📍 {selected.neighborhood_text}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <div className="text-sm font-bold text-brand">{selected.confirmations}</div>
                            <div className="text-[9px] text-white/40 font-bold uppercase">Confirmações</div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                            <div className="text-sm font-bold text-white">{new Date(selected.created_at).toLocaleDateString('pt-BR')}</div>
                            <div className="text-[9px] text-white/40 font-bold uppercase">Data</div>
                        </div>
                    </div>

                    <p className="text-[10px] font-mono text-white/25">
                        {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                    </p>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <button
                            onClick={() => handleApprove(selected.id)}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                            <CheckCircle size={16} />
                            {actionLoading ? 'Processando...' : 'Aprovar e criar stop'}
                        </button>

                        {showRejectInput ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    placeholder="Motivo (opcional)"
                                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/30"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReject(selected.id)}
                                        disabled={actionLoading}
                                        className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 disabled:opacity-50"
                                    >
                                        Confirmar Rejeição
                                    </button>
                                    <button
                                        onClick={() => { setShowRejectInput(false); setRejectNote(''); }}
                                        className="px-3 py-2 text-white/30 text-xs hover:text-white/50"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowRejectInput(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                            >
                                <XCircle size={16} />
                                Rejeitar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mapa de Sugestões</h1>
                    <p className="text-sm text-white/50">{suggestions.length} sugestões pendentes</p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={isListMode ? '/admin/sugestoes/mapa' : '/admin/sugestoes/mapa?m=lista'}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        {isListMode ? <><MapIcon size={14} /> Mapa</> : <><List size={14} /> Lista</>}
                    </a>
                    <button
                        onClick={fetchSuggestions}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <Filter size={14} className="text-white/30" />
                <select
                    value={hoursFilter}
                    onChange={(e) => setHoursFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                >
                    <option value="">Todas as datas</option>
                    <option value="24">Últimas 24h</option>
                    <option value="72">Últimos 3 dias</option>
                    <option value="168">Última semana</option>
                </select>
                <select
                    value={minConf}
                    onChange={(e) => setMinConf(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                >
                    <option value="">Todas confirmações</option>
                    <option value="2">2+ confirmações</option>
                    <option value="3">3+ confirmações</option>
                    <option value="5">5+ confirmações</option>
                </select>
            </div>

            {/* Feedback */}
            {message && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white">
                    {message}
                </div>
            )}

            {/* Map or List */}
            {isListMode ? (
                /* LIST MODE */
                <div className="space-y-2">
                    {loading && <div className="p-12 text-center text-white/30 text-sm">Carregando...</div>}
                    {!loading && suggestions.length === 0 && (
                        <div className="p-12 text-center text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                            Nenhuma sugestão pendente.
                        </div>
                    )}
                    {!loading && suggestions.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-white/10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/40">Nome</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/40">Confirmações</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/40">Data</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/40">Coords</th>
                                        <th className="p-3 text-[10px] font-black uppercase tracking-widest text-white/40">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {suggestions.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.02]">
                                            <td className="p-3">
                                                <div className="font-bold text-white text-xs">{s.name_suggested}</div>
                                                {s.notes && <div className="text-[10px] text-white/40 mt-0.5">{s.notes}</div>}
                                                {s.neighborhood_text && <div className="text-[10px] text-white/30">📍 {s.neighborhood_text}</div>}
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${s.confirmations >= 4 ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                    : s.confirmations >= 2 ? 'bg-brand/10 border border-brand/20 text-brand'
                                                        : 'bg-white/5 border border-white/10 text-white/50'
                                                    }`}>
                                                    <Users size={10} />
                                                    {s.confirmations}×
                                                </span>
                                            </td>
                                            <td className="p-3 text-[10px] text-white/40">
                                                {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-3 text-[10px] font-mono text-white/25">
                                                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleApprove(s.id)}
                                                        className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold hover:bg-green-500/20"
                                                    >
                                                        ✓ Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelected(s); setShowRejectInput(true); }}
                                                        className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/20"
                                                    >
                                                        ✕ Rejeitar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* MAP MODE */
                <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 'calc(100vh - 260px)', minHeight: '400px' }}>
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/80 z-[500] text-white/30">
                            Carregando...
                        </div>
                    )}
                    <SuggestionsMap
                        suggestions={suggestions}
                        selectedId={selected?.id || null}
                        onSelect={(s: MapSuggestion) => {
                            setSelected(s);
                            setShowRejectInput(false);
                            setRejectNote('');
                            setMessage('');
                        }}
                    />
                    <SidePanel />
                </div>
            )}
        </div>
    );
}
