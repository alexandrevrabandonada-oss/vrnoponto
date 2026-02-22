'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, MapPin, Clock, RefreshCw, Users } from 'lucide-react';

interface Suggestion {
    id: string;
    name_suggested: string;
    notes: string | null;
    neighborhood_text: string | null;
    created_at: string;
    status: string;
    geom: string;
    device_id: string | null;
    confirmations: number;
}

function extractCoords(geom: string): { lat: number; lng: number } | null {
    // geom might be WKT "POINT(lng lat)" or a JSON object
    if (typeof geom === 'string') {
        const match = geom.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }
    // If GeoJSON-like object
    if (typeof geom === 'object' && geom !== null) {
        const g = geom as Record<string, unknown>;
        if (g.coordinates && Array.isArray(g.coordinates)) {
            const coords = g.coordinates as number[];
            return { lng: coords[0], lat: coords[1] };
        }
    }
    return null;
}

export default function AdminSugestoes() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [rejectNote, setRejectNote] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const fetchSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/stop-suggestions?status=${statusFilter}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        setMessage('');
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
        } catch (err: unknown) {
            setMessage(`❌ ${err instanceof Error ? err.message : 'Erro'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        setMessage('');
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
            setRejectingId(null);
            setRejectNote('');
        } catch (err: unknown) {
            setMessage(`❌ ${err instanceof Error ? err.message : 'Erro'}`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Sugestões de Pontos</h1>
                    <p className="text-sm text-white/50">Aprove ou rejeite sugestões de novos pontos de ônibus.</p>
                </div>
                <button
                    onClick={fetchSuggestions}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2">
                {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${statusFilter === status
                            ? 'bg-brand text-black'
                            : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {status === 'PENDING' ? 'Pendentes' : status === 'APPROVED' ? 'Aprovadas' : 'Rejeitadas'}
                    </button>
                ))}
            </div>

            {/* Feedback */}
            {message && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white">
                    {message}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="p-12 text-center text-white/30 text-sm">Carregando...</div>
            )}

            {/* Empty */}
            {!loading && suggestions.length === 0 && (
                <div className="p-12 text-center text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                    Nenhuma sugestão {statusFilter === 'PENDING' ? 'pendente' : statusFilter === 'APPROVED' ? 'aprovada' : 'rejeitada'}.
                </div>
            )}

            {/* Suggestions list */}
            {!loading && suggestions.length > 0 && (
                <div className="space-y-3">
                    {suggestions.map(s => {
                        const coords = extractCoords(s.geom);
                        return (
                            <div key={s.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-brand" />
                                            <span className="text-sm font-bold text-white">{s.name_suggested}</span>
                                        </div>
                                        {s.notes && (
                                            <p className="text-xs text-white/50 ml-5">📝 {s.notes}</p>
                                        )}
                                        {s.neighborhood_text && (
                                            <p className="text-xs text-white/40 ml-5">📍 Bairro: {s.neighborhood_text}</p>
                                        )}
                                        {coords && (
                                            <p className="text-[10px] font-mono text-white/25 ml-5">
                                                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        {s.confirmations > 1 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black">
                                                <Users size={10} />
                                                {s.confirmations}×
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-white/30">
                                            <Clock size={12} />
                                            {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions for PENDING */}
                                {statusFilter === 'PENDING' && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <button
                                            onClick={() => handleApprove(s.id)}
                                            disabled={actionLoading === s.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle size={14} />
                                            {actionLoading === s.id ? 'Processando...' : 'Aprovar'}
                                        </button>

                                        {rejectingId === s.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={rejectNote}
                                                    onChange={(e) => setRejectNote(e.target.value)}
                                                    placeholder="Motivo (opcional)"
                                                    className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/30"
                                                />
                                                <button
                                                    onClick={() => handleReject(s.id)}
                                                    disabled={actionLoading === s.id}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                >
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={() => { setRejectingId(null); setRejectNote(''); }}
                                                    className="px-2 py-1.5 text-white/30 text-xs hover:text-white/50"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setRejectingId(s.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                                            >
                                                <XCircle size={14} />
                                                Rejeitar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
