'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle, ShieldCheck, Database, Search,
    RefreshCcw, Crosshair, Loader2, Rocket, CheckCircle, AlertCircle,
    Map, CheckCircle2, Circle, PlayCircle
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
    const [wizardRunning, setWizardRunning] = useState(false);
    const [wizardStepStatus, setWizardStepStatus] = useState<{
        seed: 'idle' | 'running' | 'ok' | 'error';
        backfill: 'idle' | 'running' | 'ok' | 'error';
        checklist: 'idle' | 'running' | 'ok' | 'error';
    }>({
        seed: 'idle',
        backfill: 'idle',
        checklist: 'idle'
    });
    const [wizardMessage, setWizardMessage] = useState('');
    const [wizardLogs, setWizardLogs] = useState<string[]>([]);
    const [copyMessage, setCopyMessage] = useState('');

    const OSM_MIN_BBOX = "-22.56,-44.15,-22.47,-44.05";

    const addWizardLog = (msg: string) => {
        const stamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setWizardLogs(prev => [`[${stamp}] ${msg}`, ...prev].slice(0, 12));
    };


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
        } catch { }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runAdminAction = async (endpoint: string, body?: any) => {
        const res = await fetch(`/api/admin/${endpoint}`, {
            method: 'POST',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error || data?.message || `Falha em ${endpoint}`);
        }
        return data;
    };

    const runWizardSeedStep = async (): Promise<boolean> => {
        if (!confirm('Passo 1/3: rodar Seed OSM mínimo (50 pontos) em dry-run?')) return false;
        addWizardLog('Passo 1 iniciado: seed OSM mínimo (dry run).');
        setWizardStepStatus(prev => ({ ...prev, seed: 'running' }));
        const data = await runAdminAction('stops/import-osm', {
            bbox: OSM_MIN_BBOX,
            dryRun: true,
            limit: 50
        });
        setWizardStepStatus(prev => ({ ...prev, seed: 'ok' }));
        const msg = `Passo 1 OK: ${data?.total || 0} pontos avaliados (nada salvo).`;
        setWizardMessage(msg);
        addWizardLog(msg);
        return true;
    };

    const runWizardBackfillStep = async (): Promise<boolean> => {
        if (!confirm('Passo 2/3: rodar backfill de bairros via ST_Contains?')) return false;
        addWizardLog('Passo 2 iniciado: backfill de bairros.');
        setWizardStepStatus(prev => ({ ...prev, backfill: 'running' }));
        const data = await runAdminAction('backfill-neighborhoods');
        setWizardStepStatus(prev => ({ ...prev, backfill: 'ok' }));
        const msg = data?.message || 'Passo 2 OK: backfill concluído.';
        setWizardMessage(msg);
        addWizardLog(msg);
        return true;
    };

    const runWizardChecklistStep = async () => {
        addWizardLog('Passo 3 iniciado: atualização de checklist.');
        setWizardStepStatus(prev => ({ ...prev, checklist: 'running' }));
        await Promise.all([fetchMetrics(), fetchReadiness()]);
        setWizardStepStatus(prev => ({ ...prev, checklist: 'ok' }));
        const msg = 'Passo 3 OK: checklist atualizado no painel.';
        setWizardMessage(msg);
        addWizardLog(msg);
    };

    const runWizardAll = async () => {
        if (!confirm('Rodar Wizard completo (3 passos) agora?')) return;
        setWizardRunning(true);
        setWizardMessage('');
        setWizardLogs([]);
        setCopyMessage('');
        setWizardStepStatus({ seed: 'idle', backfill: 'idle', checklist: 'idle' });
        addWizardLog('Wizard iniciado: executando os 3 passos em sequência.');

        try {
            const seedOk = await runWizardSeedStep();
            if (!seedOk) throw new Error('Wizard cancelado no passo 1.');
            const backfillOk = await runWizardBackfillStep();
            if (!backfillOk) throw new Error('Wizard cancelado no passo 2.');
            await runWizardChecklistStep();
            setWizardMessage('Wizard concluído com sucesso.');
            addWizardLog('Wizard finalizado com sucesso.');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Falha inesperada no wizard.';
            setWizardMessage(`Erro no wizard: ${msg}`);
            setActionMessage(`Erro no wizard: ${msg}`);
            addWizardLog(`Erro no wizard: ${msg}`);
        } finally {
            setWizardRunning(false);
        }
    };

    const copyWizardReport = async () => {
        const steps = [
            `Seed OSM: ${wizardStepStatus.seed}`,
            `Backfill bairros: ${wizardStepStatus.backfill}`,
            `Checklist: ${wizardStepStatus.checklist}`
        ];
        const report = [
            'Relatório Seed VR',
            ...steps,
            wizardMessage ? `Mensagem final: ${wizardMessage}` : '',
            '',
            'Logs:',
            ...(wizardLogs.length > 0 ? wizardLogs : ['Sem logs nesta execução.'])
        ].filter(Boolean).join('\n');

        try {
            await navigator.clipboard.writeText(report);
            setCopyMessage('Relatório copiado.');
        } catch {
            setCopyMessage('Não foi possível copiar automaticamente.');
        }
    };

    const renderStepIcon = (status: 'idle' | 'running' | 'ok' | 'error') => {
        if (status === 'ok') return <CheckCircle2 size={16} className="text-emerald-500" />;
        if (status === 'running') return <Loader2 size={16} className="text-brand animate-spin" />;
        if (status === 'error') return <AlertCircle size={16} className="text-red-500" />;
        return <Circle size={14} className="text-gray-400" />;
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

            <Card className="!p-6 border-brand/20 bg-brand/5">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <Rocket size={22} className="text-brand" />
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Wizard Seed VR (Day-1)</h2>
                            <p className="text-xs text-gray-600">Fluxo guiado em 3 passos para subir a base inicial.</p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        onClick={runWizardAll}
                        disabled={wizardRunning}
                    >
                        {wizardRunning ? <Loader2 size={16} className="animate-spin mr-2" /> : <PlayCircle size={16} className="mr-2" />}
                        Rodar tudo
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">1. Seed OSM mínimo</p>
                            {renderStepIcon(wizardStepStatus.seed)}
                        </div>
                        <p className="text-xs text-gray-600">50 pontos, dry-run por padrão.</p>
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                try {
                                    await runWizardSeedStep();
                                } catch (err: unknown) {
                                    setWizardStepStatus(prev => ({ ...prev, seed: 'error' }));
                                    setWizardMessage(err instanceof Error ? err.message : 'Falha no passo 1.');
                                }
                            }}
                            disabled={wizardRunning || wizardStepStatus.seed === 'running'}
                            className="w-full"
                        >
                            Executar passo
                        </Button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">2. Backfill bairros</p>
                            {renderStepIcon(wizardStepStatus.backfill)}
                        </div>
                        <p className="text-xs text-gray-600">Aplica ST_Contains nos pontos sem bairro.</p>
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                try {
                                    await runWizardBackfillStep();
                                } catch (err: unknown) {
                                    setWizardStepStatus(prev => ({ ...prev, backfill: 'error' }));
                                    setWizardMessage(err instanceof Error ? err.message : 'Falha no passo 2.');
                                }
                            }}
                            disabled={wizardRunning || wizardStepStatus.backfill === 'running'}
                            className="w-full"
                        >
                            Executar passo
                        </Button>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">3. Verificar checklist</p>
                            {renderStepIcon(wizardStepStatus.checklist)}
                        </div>
                        <p className="text-xs text-gray-600">Atualiza métricas e checklist desta tela.</p>
                        <Button
                            variant="secondary"
                            onClick={async () => {
                                try {
                                    await runWizardChecklistStep();
                                } catch (err: unknown) {
                                    setWizardStepStatus(prev => ({ ...prev, checklist: 'error' }));
                                    setWizardMessage(err instanceof Error ? err.message : 'Falha no passo 3.');
                                }
                            }}
                            disabled={wizardRunning || wizardStepStatus.checklist === 'running'}
                            className="w-full"
                        >
                            Executar passo
                        </Button>
                    </div>
                </div>

                {wizardMessage && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-bold ${wizardMessage.toLowerCase().includes('erro')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {wizardMessage}
                    </div>
                )}

                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Logs do wizard</p>
                        <button
                            type="button"
                            onClick={copyWizardReport}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            Copiar relatório
                        </button>
                    </div>
                    {copyMessage && <p className="mt-2 text-xs font-bold text-gray-600">{copyMessage}</p>}
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                        {wizardLogs.length > 0 ? wizardLogs.map((line, idx) => (
                            <p key={`${line}-${idx}`} className="text-xs text-gray-700">{line}</p>
                        )) : (
                            <p className="text-xs text-gray-500">Sem execução recente.</p>
                        )}
                    </div>
                </div>
            </Card>

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
