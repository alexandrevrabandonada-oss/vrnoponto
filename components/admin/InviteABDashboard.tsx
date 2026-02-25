'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import { Users, Loader2, Zap, Hand, Target } from 'lucide-react';

interface VariantResult {
    key: string;
    title: string;
    message: string;
    is_active: boolean;
    metrics: {
        impressions: number;
        clicks: number;
        requests: number;
        ctr: number;
        conversionRate: number;
    }
}

export const InviteABDashboard = ({ adminToken }: { adminToken?: string }) => {
    const [variants, setVariants] = useState<VariantResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/invite-ab', {
                headers: { 'Authorization': `Bearer ${adminToken || ''}` }
            });
            if (res.ok) {
                const data = await res.json();
                setVariants(data.results || []);
            }
        } catch (e) {
            console.error('Failed to fetch AB stats', e);
        } finally {
            setLoading(false);
        }
    }, [adminToken]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats, adminToken]);

    const toggleVariant = async (key: string, currentStatus: boolean) => {
        setActionLoading(key);
        try {
            const res = await fetch('/api/admin/invite-ab', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken || ''}`
                },
                body: JSON.stringify({ variantKey: key, isActive: !currentStatus })
            });
            if (res.ok) {
                await fetchStats();
            } else {
                alert('Erro: não é possível desativar todas as variantes simultaneamente.');
            }
        } catch (error) {
            console.error('Error toggling variant', error);
            alert('Erro ao alternar status.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl p-6 flex justify-center items-center text-white/20">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (variants.length === 0) return null;

    return (
        <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-brand/10 text-brand p-2 rounded-xl">
                    <Zap size={20} />
                </div>
                <h2 className="text-lg font-black text-white italic uppercase tracking-tight">Teste A/B: Convites (30 dias)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variants.map(v => (
                    <Card key={v.key} variant="surface" className={`border p-5 rounded-2xl relative shadow-xl transition-all ${v.is_active ? 'border-brand/30 bg-brand/[0.03]' : 'border-white/5 bg-white/[0.02] opacity-50 grayscale'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-industrial text-xl font-black text-white italic flex items-center gap-2">
                                    VARIANTE {v.key}
                                    {!v.is_active && <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">DESATIVADA</span>}
                                </h3>
                                <p className="text-[10px] text-brand font-black uppercase tracking-widest truncate max-w-[200px]">{v.title}</p>
                            </div>
                            <Button
                                variant={v.is_active ? "secondary" : "primary"}
                                className="!text-[9px] !px-3 !h-8 !font-black uppercase tracking-widest"
                                loading={actionLoading === v.key}
                                onClick={() => toggleVariant(v.key, v.is_active)}
                            >
                                {v.is_active ? 'Desativar' : 'Reativar'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                <Users size={14} className="text-white/20 mb-1" />
                                <span className="text-lg font-black text-white italic">{v.metrics.impressions}</span>
                                <span className="text-[9px] uppercase font-black text-white/20 tracking-widest">Prints</span>
                            </div>
                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                <Hand size={14} className="text-white/20 mb-1" />
                                <span className="text-lg font-black text-white italic">{v.metrics.clicks}</span>
                                <span className="text-[9px] uppercase font-black text-white/20 tracking-widest">Clicks ({v.metrics.ctr.toFixed(1)}%)</span>
                            </div>
                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                <Target size={14} className="text-brand/40 mb-1" />
                                <span className="text-lg font-black text-brand italic">{v.metrics.requests}</span>
                                <span className="text-[9px] uppercase font-black text-brand/40 tracking-widest">Leads ({v.metrics.conversionRate.toFixed(1)}%)</span>
                            </div>
                        </div>

                        <div className="text-[11px] text-white/40 italic bg-white/[0.03] p-3 rounded-xl line-clamp-2 border border-white/5">
                            &quot;{v.message}&quot;
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
