'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle, ShieldCheck, Database, MapPin, Search,
    RefreshCcw, Crosshair, Loader2, Rocket, CheckCircle, AlertCircle,
    Map
} from 'lucide-react';
import { Card, Button, Divider, PageHeader } from '@/components/ui';

interface DataQualityMetrics {
    stops_total: number;
    stops_sem_nome: number;
    stops_sem_bairro: number;
    eventos_7d: number;
    eventos_30d: number;
    pct_L2L3_7d: number;
    shapes_total: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    top_20_stops: any[];
}

export default function AdminDataQualityPage() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
    const [actionLoading, setActionLoading] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [readiness, setReadiness] = useState<any>(null);



    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/data-quality');
            if (res.ok) setMetrics(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadiness = async () => {
        try {
            const res = await fetch('/api/admin/launch-readiness');
            if (res.ok) setReadiness(await res.json());
        } catch (err) { }
    };

    useEffect(() => {
        fetchMetrics();
        fetchReadiness();
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAction = async (endpoint: string, name: string, body?: any) => {
        if (!confirm(`Tem certeza que deseja executar: ${name}?`)) return;

        setActionLoading(name);
        setActionMessage('');
        try {
            const res = await fetch(`/api/admin/${endpoint}`, {
                method: 'POST',
                headers: body ? { 'Content-Type': 'application/json' } : {},
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await res.json();
            setActionMessage(data.message || (data.success ? 'Sucesso' : 'Erro'));
            await Promise.all([fetchMetrics(), fetchReadiness()]);
        } catch (err: unknown) {
            setActionMessage(`Erro em ${name}: ` + (err instanceof Error ? err.message : ''));
        } finally {
            setActionLoading('');
        }
    };

    if (loading && !metrics) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Qualidade de Dados"
                    subtitle="Monitoramento de integridade da base"
                />
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Qualidade de Dados"
                subtitle="Monitoramento de integridade e metadados das paradas e auditorias."
            />

            {/* General Action Messages */}
            {actionMessage && (
                <div className={`p-4 rounded-lg font-bold text-sm ${actionMessage.includes('Erro') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {actionMessage}
                </div>
            )}

            {/* Pronto Pra Lançar? Checklist */}
            {readiness && (
                <Card className="!p-6 border-brand/20 bg-brand/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Rocket size={24} className="text-brand" />
                        <h2 className="text-xl font-bold text-gray-800">Pronto pra lançar?</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {Object.entries(readiness.checks).map(([key, check]: [string, any]) => (

                            <div key={key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        {key.replace('_', ' ')}
                                    </span>
                                    {check.ok ? (
                                        <CheckCircle size={14} className="text-green-500" />
                                    ) : (
                                        <AlertCircle size={14} className="text-orange-500" />
                                    )}
                                </div>
                                <div className={`text-2xl font-black ${check.ok ? 'text-gray-800' : 'text-orange-600'}`}>
                                    {check.value}
                                    <span className="text-xs text-gray-400 font-normal ml-1">/ {check.target}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${check.ok ? 'bg-green-500' : 'bg-orange-400'}`}
                                        style={{ width: `${Math.min(100, (check.value / check.target) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Divider label="AÇÕES RECOMENDADAS PARA O LANÇAMENTO" />

                    <div className="flex flex-wrap gap-4 mt-6">
                        {!readiness.checks.stops_total.ok && (
                            <Button
                                variant="primary"
                                onClick={() => handleAction('stops/import-osm', 'Rodar Seed OSM', {
                                    bbox: "-22.56,-44.15,-22.47,-44.05",
                                    dryRun: false
                                })}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === 'Rodar Seed OSM' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Map size={16} className="mr-2" />}
                                Rodar Seed OSM
                            </Button>
                        )}

                        {!readiness.checks.bairros_eligiveis.ok && (
                            <Button
                                variant="primary"
                                onClick={() => handleAction('backfill-neighborhoods', 'Rodar Backfill Bairros')}
                                disabled={!!actionLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white border-purple-800"
                            >
                                {actionLoading === 'Rodar Backfill Bairros' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Crosshair size={16} className="mr-2" />}
                                Rodar Backfill Bairros
                            </Button>
                        )}

                        {(!readiness.checks.eventos_7d.ok || !readiness.checks.pct_L2L3_7d.ok) && (
                            <a href="/admin/mutirao">
                                <Button variant="secondary">
                                    <Rocket size={16} className="mr-2" />
                                    Ativar Mutirão
                                </Button>
                            </a>
                        )}

                        {readiness.ready && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl font-bold text-sm border border-green-200">
                                <Rocket size={18} />
                                BASE PRONTA PARA LANÇAMENTO PÚBLICO!
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2 text-gray-800">
                    <Database size={20} className="text-brand" />
                    <h2 className="text-xl font-bold">Ações de Limpeza (Admin Actions)</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Comandos de alto custo processual. Afetam todos os registros desajustados da plataforma.
                </p>
                <div className="flex flex-wrap gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => handleAction('neighborhoods/renormalize', 'Re-normalizar Bairros')}
                        disabled={!!actionLoading}
                    >
                        {actionLoading === 'Re-normalizar Bairros' ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCcw size={16} className="mr-2" />}
                        Re-normalizar Bairros
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleAction('backfill-neighborhoods', 'Backfill via Shapes')}
                        disabled={!!actionLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-purple-800"
                    >
                        {actionLoading === 'Backfill via Shapes' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Crosshair size={16} className="mr-2" />}
                        Backfill via Polígonos
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="!p-4 bg-white border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-gray-800">{metrics?.stops_total}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total de Pontos</div>
                </Card>
                <Card className="!p-4 bg-red-50 border border-red-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-red-600">{metrics?.stops_sem_bairro}</div>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Pontos Sem Bairro Nulo</div>
                </Card>
                <Card className="!p-4 bg-orange-50 border border-orange-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-orange-600">{metrics?.stops_sem_nome}</div>
                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Pontos Sem Nome</div>
                </Card>

                <Card className="!p-4 bg-white border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-gray-800">{metrics?.eventos_7d}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Bus Samples (7d)</div>
                </Card>
                <Card className="!p-4 bg-white border border-gray-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-gray-800">{metrics?.eventos_30d}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Bus Samples (30d)</div>
                </Card>
                <Card className="!p-4 bg-emerald-50 border border-emerald-100 shadow-sm text-center">
                    <div className="text-3xl font-black text-emerald-600">{metrics?.pct_L2L3_7d}%</div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Confiança L2/L3 (7d)</div>
                </Card>
            </div>

            <Divider label="INSPEÇÃO DE PONTOS (Top 20 Samples)" />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Ponto</th>
                                <th className="p-4 font-semibold text-gray-600">Bairro Atual</th>
                                <th className="p-4 font-semibold text-gray-600 text-center">Amostras (30d)</th>
                                <th className="p-4 font-semibold text-gray-600 text-center">% Verificado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics?.top_20_stops?.map((stop, i) => (
                                <tr key={stop.stop_id || i} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{stop.stop_name || 'Desconhecido'}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{stop.stop_id?.split('-')[0]}...</div>
                                    </td>
                                    <td className="p-4">
                                        {!stop.neighborhood || stop.neighborhood === 'Desconhecido' ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                                                <AlertTriangle size={12} /> NULO/FALTA
                                            </span>
                                        ) : (
                                            <span className="text-gray-700 font-medium">{stop.neighborhood}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center font-black">
                                        {stop.samples_total}
                                    </td>
                                    <td className="p-4 text-center">
                                        {stop.pct_verified_avg > 50 ? (
                                            <span className="inline-flex items-center justify-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold w-16">
                                                <ShieldCheck size={12} /> {stop.pct_verified_avg}%
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold w-16">
                                                {stop.pct_verified_avg}%
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(!metrics?.top_20_stops || metrics.top_20_stops.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search size={24} className="text-gray-300" />
                                            <span>Nenhuma amostra avaliada recentemente para este endpoint.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
