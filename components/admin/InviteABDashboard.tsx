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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex justify-center items-center text-gray-400">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (variants.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-brand/10 text-brand p-2 rounded-xl">
                    <Zap size={20} />
                </div>
                <h2 className="text-lg font-black text-gray-900">Teste A/B: Convites (30 dias)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variants.map(v => (
                    <Card key={v.key} variant="surface" className={`border p-5 rounded-2xl relative ${v.is_active ? 'border-brand/30 bg-brand/5' : 'border-gray-200 bg-gray-50 opacity-70 grayscale'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-industrial text-xl font-black text-gray-900 flex items-center gap-2">
                                    VARIANTE {v.key}
                                    {!v.is_active && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold">DESATIVADA</span>}
                                </h3>
                                <p className="text-xs text-gray-500 font-bold uppercase truncate max-w-[200px]">{v.title}</p>
                            </div>
                            <Button
                                variant={v.is_active ? "secondary" : "primary"}
                                className="!text-[10px] !px-3 !h-8"
                                loading={actionLoading === v.key}
                                onClick={() => toggleVariant(v.key, v.is_active)}
                            >
                                {v.is_active ? 'Desativar' : 'Reativar'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100/50 flex flex-col items-center justify-center">
                                <Users size={14} className="text-gray-400 mb-1" />
                                <span className="text-lg font-black text-gray-900">{v.metrics.impressions}</span>
                                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Prints</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100/50 flex flex-col items-center justify-center">
                                <Hand size={14} className="text-gray-400 mb-1" />
                                <span className="text-lg font-black text-gray-900">{v.metrics.clicks}</span>
                                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Clicks ({v.metrics.ctr.toFixed(1)}%)</span>
                            </div>
                            <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100/50 flex flex-col items-center justify-center">
                                <Target size={14} className="text-gray-400 mb-1" />
                                <span className="text-lg font-black text-brand">{v.metrics.requests}</span>
                                <span className="text-[9px] uppercase font-bold text-brand/70 tracking-wider">Leads ({v.metrics.conversionRate.toFixed(1)}%)</span>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-500 italic bg-white/50 p-2 rounded-lg line-clamp-2">
                            &quot;{v.message}&quot;
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
