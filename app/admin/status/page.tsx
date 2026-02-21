'use client';

import { useState, useEffect } from 'react';
import {
    Activity, Database, Server, Clock, AlertTriangle,
    CheckCircle2, Loader2, PlayCircle, RefreshCw, XCircle
} from 'lucide-react';

interface SystemStatus {
    health: { api_health: string, env_audit: string };
    jobs: {
        sync_official: { status: string, finished_at: string, stale: boolean, meta: Record<string, unknown> };
        run_alerts: { status: string, finished_at: string, stale: boolean, meta: Record<string, unknown> };
        bulletin_card: { status: string, finished_at: string, stale: boolean, meta: Record<string, unknown> };
    };
    dataFreshness: {
        official_schedules_last_fetched_at: string | null;
        alerts_last_created_at: string | null;
        active_alerts_count: number;
    };
    migrations: { version: string, checked_at: string };
}

const StatusBadge = ({ status, stale }: { status: string, stale?: boolean }) => {
    if (stale) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> STALE</span>;
    if (status === 'OK') return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>;
    if (status === 'WARN') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> WARN</span>;
    if (status === 'RUNNING') return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> RUNNING</span>;
    return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><XCircle size={12} /> FAIL</span>;
};

const formatDate = (d: string | null | undefined) => {
    if (!d) return 'Nunca';
    const dateStr = String(d);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateStr));
};

export default function StatusDashboard() {
    const [statusData, setStatusData] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [token, setToken] = useState('');

    const fetchStatus = async (adminToken: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/system-status?t=${adminToken}`);
            if (res.ok) setStatusData(await res.json());
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        let isMounted = true;
        const stored = document.cookie.split('; ').find(row => row.startsWith('admin_token='));

        async function init() {
            if (stored) {
                const val = stored.split('=')[1];
                setToken(val);
                await fetchStatus(val);
            } else if (isMounted) {
                setLoading(false);
            }
        }

        init();
        return () => { isMounted = false; };
    }, []);

    const triggerAction = async (jobName: string, endpoint: string) => {
        setActionLoading(jobName);
        try {
            // For bulletin it's GET, others are POST usually but we can use fetch natively
            const method = endpoint.includes('bulletin') ? 'GET' : 'POST';
            await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${token}`, { method });
            // wait a sec then refresh
            setTimeout(() => fetchStatus(token), 2000);
        } catch (err) {
            console.error(err);
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>;
    }

    if (!statusData) {
        return <div className="p-8 text-center text-red-500 font-bold">Não foi possível carregar o status. Verifique seu login.</div>;
    }

    const { health, jobs, dataFreshness, migrations } = statusData;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
                    <p className="text-gray-600">Saúde da infraestrutura, cronjobs e dados.</p>
                </div>
                <button onClick={() => fetchStatus(token)} className="flex items-center gap-2 text-sm font-bold bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition active:scale-95 shadow-sm">
                    <RefreshCw size={16} /> Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Health Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-indigo-900 border-b border-gray-100 pb-3">
                        <Activity size={20} />
                        <h2 className="font-bold">Saúde do Deploy</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">API Health</span>
                            <StatusBadge status={health.api_health} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Env Audit</span>
                            <StatusBadge status={health.env_audit} />
                        </div>
                    </div>
                </div>

                {/* Data Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-indigo-900 border-b border-gray-100 pb-3">
                        <Database size={20} />
                        <h2 className="font-bold">Dados & Alertas</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Último Sync</span>
                            <span className="font-medium text-gray-900">{formatDate(dataFreshness.official_schedules_last_fetched_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Último Alerta</span>
                            <span className="font-medium text-gray-900">{formatDate(dataFreshness.alerts_last_created_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Alertas Ativos</span>
                            <span className="font-bold text-red-600">{dataFreshness.active_alerts_count}</span>
                        </div>
                    </div>
                </div>

                {/* DB Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-indigo-900 border-b border-gray-100 pb-3">
                        <Server size={20} />
                        <h2 className="font-bold">Banco de Dados</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Migration Ativa</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 truncate max-w-[120px]" title={migrations.version}>{migrations.version}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Verificado em</span>
                            <span className="text-gray-500 text-xs">{formatDate(migrations.checked_at)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center gap-3 text-indigo-900">
                    <Clock size={20} />
                    <h2 className="font-bold">Cronjobs (GitHub Actions)</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {[
                        { id: 'sync_official', name: 'Sync Oficial (Diário)', obj: jobs.sync_official, endpoint: '/api/admin/sync-official' },
                        { id: 'run_alerts', name: 'Engine de Alertas (Diário)', obj: jobs.run_alerts, endpoint: '/api/admin/run-alerts' },
                        { id: 'bulletin_card', name: 'Gerar Boletim (Semanal)', obj: jobs.bulletin_card, endpoint: '/api/bulletin/card' }
                    ].map(job => (
                        <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900">{job.name}</h3>
                                    <StatusBadge status={job.obj.status} stale={job.obj.stale} />
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    Última execução: {formatDate(job.obj.finished_at)}
                                    {job.obj.meta && Object.keys(job.obj.meta).length > 0 && (
                                        <span className="ml-2 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-gray-400">
                                            Logs: {JSON.stringify(job.obj.meta)}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => triggerAction(job.id, job.endpoint)}
                                disabled={actionLoading === job.id}
                                className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"
                            >
                                {actionLoading === job.id ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                {actionLoading === job.id ? 'Rodando...' : 'Rodar Agora'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
