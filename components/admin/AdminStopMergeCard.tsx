'use client';

import { useState, useEffect } from 'react';
import { GitMerge, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, SectionCard, InlineAlert } from '@/components/ui';

interface Stop {
    id: string;
    name: string;
    code?: string;
}

export function AdminStopMergeCard() {
    const [stops, setStops] = useState<Stop[]>([]);
    const [fromStopId, setFromStopId] = useState('');
    const [toStopId, setToStopId] = useState('');
    const [reason, setReason] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; summary?: any; error?: string } | null>(null);

    useEffect(() => {
        async function fetchStops() {
            const res = await fetch('/api/admin/stops/list?lim=500'); // Assuming we have a list endpoint or can fetch a subset
            if (res.ok) {
                const data = await res.json();
                setStops(data.stops || []);
            }
        }
        // Actually, let's fetch only if typing or just use a simpler list for now
        // For simplicity in this demo, we'll assume the parent could pass the list or we fetch it once
        // But the user asked for a simple card, so let's just make it a select/search
        fetchStops();
    }, []);

    const handleMerge = async () => {
        if (!fromStopId || !toStopId || !confirmed) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/stops/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromStopId, toStopId, reason })
            });

            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, summary: data.summary });
                setFromStopId('');
                setReason('');
                setConfirmed(false);
            } else {
                setResult({ success: false, error: data.error });
            }
        } catch (err) {
            setResult({ success: false, error: 'Falha na conexão com o servidor' });
        } finally {
            setLoading(false);
        }
    };

    const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand/50 transition-colors text-sm";
    const labelBase = "block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 ml-1";

    return (
        <SectionCard
            title="Mesclar Duplicados"
            subtitle="Mova todo o histórico de um ponto para outro de forma segura"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelBase}>Ponto de Origem (SERÁ DESATIVADO)</label>
                        <select
                            value={fromStopId}
                            onChange={(e) => setFromStopId(e.target.value)}
                            className={inputBase}
                        >
                            <option value="">Selecione o ponto duplicado...</option>
                            {stops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelBase}>Ponto de Destino (CANÔNICO)</label>
                        <select
                            value={toStopId}
                            onChange={(e) => setToStopId(e.target.value)}
                            className={inputBase}
                        >
                            <option value="">Selecione o ponto principal...</option>
                            {stops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelBase}>Motivo da Mesclagem</label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ex: Ponto duplicado no seed do OSM"
                        className={inputBase}
                    />
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-4">
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-red-200">Ação Irreversível</p>
                        <p className="text-[11px] text-red-300/70 leading-relaxed">
                            Todos os eventos, check-ins e fotos do ponto de origem serão movidos permanentemente para o ponto de destino. O ponto de origem será desativado.
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer pt-2 group">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="w-4 h-4 bg-black border-white/20 rounded focus:ring-brand accent-brand"
                            />
                            <span className="text-[10px] font-black uppercase text-white/60 group-hover:text-white transition-colors">
                                Entendo que esta ação move dados permanentemente
                            </span>
                        </label>
                    </div>
                </div>

                <Button
                    onClick={handleMerge}
                    disabled={!fromStopId || !toStopId || !confirmed || loading}
                    className="w-full !h-14 font-black uppercase italic tracking-widest shadow-lg shadow-brand/10"
                    icon={loading ? <Loader2 className="animate-spin" /> : <GitMerge size={20} />}
                >
                    {loading ? 'Processando Mesclagem...' : 'Mesclar Agora'}
                </Button>

                {result && (
                    <div className={`p-4 rounded-2xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} animate-in slide-in-from-top-2 duration-300`}>
                        <div className="flex items-center gap-3 mb-2">
                            {result.success ? (
                                <CheckCircle2 className="text-emerald-400" size={18} />
                            ) : (
                                <AlertCircle className="text-red-400" size={18} />
                            )}
                            <p className={`text-xs font-bold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                {result.success ? 'Mesclagem Concluída com Sucesso!' : 'Erro na Mesclagem'}
                            </p>
                        </div>
                        {result.success && result.summary && (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="bg-white/5 p-3 rounded-xl">
                                    <p className="text-[10px] uppercase text-white/40 font-black">Eventos</p>
                                    <p className="text-lg font-black text-white">{result.summary.events}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl">
                                    <p className="text-[10px] uppercase text-white/40 font-black">Check-ins</p>
                                    <p className="text-lg font-black text-white">{result.summary.checkins}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl">
                                    <p className="text-[10px] uppercase text-white/40 font-black">Fotos</p>
                                    <p className="text-lg font-black text-white">{result.summary.photos}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl">
                                    <p className="text-[10px] uppercase text-white/40 font-black">Alertas</p>
                                    <p className="text-lg font-black text-white">{result.summary.alerts}</p>
                                </div>
                            </div>
                        )}
                        {!result.success && <p className="text-[11px] text-red-300/80">{result.error}</p>}
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
