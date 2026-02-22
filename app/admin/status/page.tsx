'use client';

import { useState, useEffect } from 'react';
import {
    Activity, Database, Server, Clock, AlertTriangle,
    CheckCircle2, Loader2, PlayCircle, RefreshCw, XCircle,
    Send, MessageSquare
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
    telegram: {
        last_sent_at: string | null;
        last_status: string;
        count_24h: number;
        subscriptions?: {
            total: number;
            digest: number;
            immediate: number;
            crit_only: number;
        };
    };
    webpush: {
        vapid_ok: boolean;
        last_sent_at: string | null;
        last_status: string;
        subscriptions: {
            total: number;
            digest: number;
            immediate: number;
            crit_only: number;
        };
    };
    migrations: { version: string, checked_at: string };
}

const StatusBadge = ({ status, stale }: { status: string, stale?: boolean }) => {
    if (stale) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> STALE</span>;
    if (status === 'OK') return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>;
    if (status === 'WARN') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> WARN</span>;
    if (status === 'RUNNING') return <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> RUNNING</span>;
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
                    <div className="flex items-center gap-3 text-brand border-b border-zinc-800 pb-3">
                        <Activity size={20} />
                        <h2 className="font-bold text-white">Saúde do Deploy</h2>
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
                    <div className="flex items-center gap-3 text-brand border-b border-zinc-800 pb-3">
                        <Database size={20} />
                        <h2 className="font-bold text-white">Dados & Alertas</h2>
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
                    <div className="flex items-center gap-3 text-brand border-b border-zinc-800 pb-3">
                        <Server size={20} />
                        <h2 className="font-bold text-white">Banco de Dados</h2>
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

                {/* Telegram Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-brand border-b border-zinc-800 pb-3">
                        <MessageSquare size={20} />
                        <h2 className="font-bold text-white">Notificações Telegram</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Último Envio</span>
                            <span className="font-medium text-gray-900">{formatDate(statusData.telegram.last_sent_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Status</span>
                            <StatusBadge status={statusData.telegram.last_status} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Enviados (24h)</span>
                            <span className="font-bold text-gray-900">{statusData.telegram.count_24h}</span>
                        </div>
                    </div>
                    {statusData.telegram.subscriptions && (
                        <div className="space-y-3 pt-3 border-t border-gray-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Inscritos Ativos</span>
                                <span className="font-bold text-gray-900">{statusData.telegram.subscriptions.total}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Modo: Digest / Imediato</span>
                                <span className="text-gray-900 font-mono text-xs">{statusData.telegram.subscriptions.digest} / {statusData.telegram.subscriptions.immediate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Somente Críticos</span>
                                <span className="text-gray-900 font-mono text-xs">{statusData.telegram.subscriptions.crit_only}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => triggerAction('telegram', '/api/admin/notify-telegram')}
                        disabled={actionLoading === 'telegram'}
                        className="w-full flex items-center justify-center gap-2 bg-brand hover:brightness-110 text-black px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                        {actionLoading === 'telegram' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Notificar Agora
                    </button>
                </div>

                {/* Web Push Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div className="flex items-center gap-3 text-brand">
                            <Send size={20} />
                            <h2 className="font-bold text-white">Browser Web Push</h2>
                        </div>
                        <StatusBadge status={statusData.webpush.vapid_ok ? 'OK' : 'FAIL'} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Último Envio</span>
                            <span className="font-medium text-gray-900">{formatDate(statusData.webpush.last_sent_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Env Chaves VAPID</span>
                            <span className={statusData.webpush.vapid_ok ? "font-bold text-emerald-600" : "font-bold text-red-600"}>{statusData.webpush.vapid_ok ? 'OK' : 'MISSING'}</span>
                        </div>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Web Inscritos</span>
                            <span className="font-bold text-gray-900">{statusData.webpush.subscriptions.total}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Digest / Imediato</span>
                            <span className="text-gray-900 font-mono text-xs">{statusData.webpush.subscriptions.digest} / {statusData.webpush.subscriptions.immediate}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => triggerAction('webpush', '/api/admin/push/digest')}
                            disabled={actionLoading === 'webpush'}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:brightness-110 text-black px-2 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                            {actionLoading === 'webpush' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Disparar Digest
                        </button>
                    </div>
                </div>
            </div>

            {/* Jobs Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-800 flex items-center gap-3 text-brand">
                    <Clock size={20} />
                    <h2 className="font-bold text-white">Cronjobs (GitHub Actions)</h2>
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
                                className="flex items-center justify-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"
                            >
                                {actionLoading === job.id ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                {actionLoading === job.id ? 'Rodando...' : 'Rodar Agora'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Neighborhood Audit Card */}
            <NeighborhoodAuditCard token={token} />

        </div>
    );
}

function NeighborhoodAuditCard({ token }: { token: string }) {
    const [audit, setAudit] = useState<{
        total_stop_neighborhoods: number;
        total_shape_neighborhoods: number;
        matched_count: number;
        match_rate_pct: number;
        unmatched_stops: string[];
        unmatched_shapes: string[];
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [renormLoading, setRenormLoading] = useState(false);
    const [renormResult, setRenormResult] = useState<string | null>(null);
    const [showStops, setShowStops] = useState(false);
    const [showShapes, setShowShapes] = useState(false);

    const refreshAudit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/neighborhoods/audit?t=${token}`);
            if (res.ok) setAudit(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const runRenormalize = async () => {
        setRenormLoading(true);
        setRenormResult(null);
        try {
            const res = await fetch(`/api/admin/neighborhoods/renormalize?t=${token}`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setRenormResult(`✅ Stops: ${data.stops_updated}, Partners: ${data.partners_updated}, Shapes: ${data.shapes_updated}`);
                setTimeout(() => refreshAudit(), 500);
            }
        } catch (e) { console.error(e); }
        setRenormLoading(false);
    };

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/neighborhoods/audit?t=${token}`);
                if (res.ok && !cancelled) setAudit(await res.json());
            } catch (e) { console.error(e); }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [token]);

    if (loading && !audit) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-brand">
                    <Database size={20} />
                    <h2 className="font-bold text-white">Bairros: Qualidade do Match</h2>
                </div>
                <button onClick={refreshAudit} disabled={loading} className="text-sm text-gray-500 hover:text-gray-700">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            {audit && (
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <div className="text-2xl font-black text-gray-900">{audit.match_rate_pct}%</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Match Rate</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <div className="text-2xl font-black text-emerald-600">{audit.matched_count}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Matched</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <div className="text-2xl font-black text-gray-900">{audit.total_stop_neighborhoods}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Stops Bairros</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <div className="text-2xl font-black text-gray-900">{audit.total_shape_neighborhoods}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase">Shapes</div>
                        </div>
                    </div>

                    {audit.unmatched_stops.length > 0 && (
                        <div>
                            <button onClick={() => setShowStops(!showStops)} className="text-sm font-bold text-orange-600 hover:underline">
                                {showStops ? '▾' : '▸'} Faltantes nos Stops ({audit.unmatched_stops.length})
                            </button>
                            {showStops && (
                                <div className="mt-2 bg-orange-50 p-3 rounded-lg text-xs font-mono text-orange-800 max-h-40 overflow-y-auto">
                                    {audit.unmatched_stops.map(s => <div key={s}>{s}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {audit.unmatched_shapes.length > 0 && (
                        <div>
                            <button onClick={() => setShowShapes(!showShapes)} className="text-sm font-bold text-red-600 hover:underline">
                                {showShapes ? '▾' : '▸'} Faltantes nos Shapes ({audit.unmatched_shapes.length})
                            </button>
                            {showShapes && (
                                <div className="mt-2 bg-red-50 p-3 rounded-lg text-xs font-mono text-red-800 max-h-40 overflow-y-auto">
                                    {audit.unmatched_shapes.map(s => <div key={s}>{s}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={runRenormalize}
                            disabled={renormLoading}
                            className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50"
                        >
                            {renormLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                            Re-normalizar Agora
                        </button>
                        {renormResult && <span className="text-xs text-emerald-600 font-medium">{renormResult}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
