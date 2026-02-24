'use client';

import * as React from 'react';
import { Shield, CheckCircle2, Circle, PlayCircle, Loader2, ChevronRight, BarChart2 } from 'lucide-react';
import { AppShell, PageHeader, Card, Button, PublicTopBar } from '@/components/ui';

type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';

interface Step {
    id: string;
    label: string;
    description: string;
    endpoint: string;
    method: 'POST' | 'GET';
    payload?: Record<string, unknown>;
}

const STEPS: Step[] = [
    {
        id: 'osm',
        label: 'Seed OSM (Pontos)',
        description: 'Importa paradas de ônibus oficiais via OpenStreetMap.',
        endpoint: '/api/admin/stops/import-osm',
        method: 'POST',
        payload: { bbox: "-22.56,-44.15,-22.47,-44.05", dryRun: false }
    },
    {
        id: 'backfill',
        label: 'Backfill Bairros',
        description: 'Associa pontos órfãos aos polígonos de bairros.',
        endpoint: '/api/admin/backfill-neighborhoods',
        method: 'POST'
    },
    {
        id: 'sync',
        label: 'Sincronizar PDFs',
        description: 'Sync automático de horários do site da Prefeitura.',
        endpoint: '/api/admin/sync-official?dryRun=false',
        method: 'POST'
    },
    {
        id: 'alerts',
        label: 'Gerar Alertas/Sync',
        description: 'Processa tendências e limpa cache de boletins.',
        endpoint: '/api/admin/run-alerts',
        method: 'POST'
    }
];

export default function AdminDia1Page() {
    const [statuses, setStatuses] = React.useState<Record<string, StepStatus>>({});
    const [logs, setLogs] = React.useState<string[]>([]);
    const [isRunningAll, setIsRunningAll] = React.useState(false);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);
    };

    const runStep = async (step: Step) => {
        setStatuses(prev => ({ ...prev, [step.id]: 'RUNNING' }));
        addLog(`Iniciando: ${step.label}...`);

        try {
            const token = localStorage.getItem('vrnp_admin_token') || localStorage.getItem('admin_token');
            const res = await fetch(step.endpoint, {
                method: step.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: step.method === 'POST' ? JSON.stringify(step.payload || {}) : undefined
            });

            const data = await res.json() as { error?: string, message?: string, imported?: number, updated_count?: number };

            if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

            setStatuses(prev => ({ ...prev, [step.id]: 'SUCCESS' }));
            addLog(`✅ ${step.label} concluído: ${JSON.stringify(data.message || data.imported || data.updated_count || 'OK')}`);
            return true;
        } catch (err: unknown) {
            setStatuses(prev => ({ ...prev, [step.id]: 'ERROR' }));
            const msg = err instanceof Error ? err.message : String(err);
            addLog(`❌ ERRO em ${step.label}: ${msg}`);
            return false;
        }
    };

    const runAll = async () => {
        setIsRunningAll(true);
        addLog('🏁 Iniciando sequência completa "Dia 1"...');

        for (const step of STEPS) {
            const success = await runStep(step);
            if (!success) {
                addLog('⛔ Sequência interrompida por erro.');
                break;
            }
        }

        setIsRunningAll(false);
        addLog('🏁 Sequência finalizada.');
    };

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Admin: Dia 1" />

            <div className="max-w-md mx-auto py-6 space-y-8">
                <PageHeader
                    title="Setup Dia 1"
                    subtitle="Orquestre o essencial para o app rodar em 2 minutos."
                />

                <div className="space-y-4">
                    {STEPS.map((step, idx) => {
                        const status = statuses[step.id] || 'PENDING';
                        return (
                            <Card key={step.id} className="relative overflow-hidden group">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {status === 'SUCCESS' && <CheckCircle2 className="text-brand" size={20} />}
                                        {status === 'RUNNING' && <Loader2 className="text-brand animate-spin" size={20} />}
                                        {status === 'ERROR' && <Shield className="text-danger" size={20} />}
                                        {status === 'PENDING' && <Circle className="text-white/20" size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-industrial text-sm text-white italic uppercase tracking-wider">
                                                {idx + 1}. {step.label}
                                            </h3>
                                            <button
                                                onClick={() => runStep(step)}
                                                disabled={isRunningAll || status === 'RUNNING'}
                                                className="text-[10px] font-black uppercase text-brand hover:underline disabled:opacity-30"
                                            >
                                                Rodar
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-white/50 mt-1">{step.description}</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    <Card className="!bg-brand/10 border-brand/30">
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                <BarChart2 className="text-brand" size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-industrial text-sm text-brand italic uppercase tracking-wider">
                                        5. Conferir Boletim
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        className="!p-0 !h-auto text-brand"
                                        onClick={() => window.location.href = '/boletim'}
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                                <p className="text-[11px] text-brand/70 mt-1">Verifique se os dados apareceram no painel público.</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={runAll}
                        loading={isRunningAll}
                        className="w-full !h-14 !bg-brand !text-black font-black uppercase tracking-widest text-sm"
                        icon={<PlayCircle size={18} />}
                    >
                        Rodar Tudo em Sequência
                    </Button>

                    {logs.length > 0 && (
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[10px] space-y-1 h-48 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className={log.includes('❌') ? 'text-danger' : log.includes('✅') ? 'text-brand' : 'text-white/40'}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
