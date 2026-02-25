'use client';

import { useState, useEffect } from 'react';
import {
    Activity, Database, Server, Clock, AlertTriangle,
    CheckCircle2, Loader2, PlayCircle, RefreshCw, XCircle,
    Send, MessageSquare, Camera
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
        failures_24h: number;
        dead_endpoints: number;
        subscriptions: {
            total: number;
            digest: number;
            immediate: number;
            crit_only: number;
        };
    };
    proofPhotos?: {
        uploads_7d: number;
        with_line_read_7d: number;
        confirmed_7d: number;
        pct_line_read_7d: number;
        pct_confirmed_7d: number;
    };
    migrations: { version: string, checked_at: string };
}

const StatusBadge = ({ status, stale }: { status: string, stale?: boolean }) => {
    if (stale) return <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-orange-500/20"><AlertTriangle size={10} /> STALE</span>;
    if (status === 'OK') return <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-emerald-500/20"><CheckCircle2 size={10} /> OK</span>;
    if (status === 'WARN') return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-amber-500/20"><AlertTriangle size={10} /> WARN</span>;
    if (status === 'RUNNING') return <span className="bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-cyan-500/20"><Loader2 size={10} className="animate-spin" /> RUNNING</span>;
    return <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-red-500/20"><XCircle size={10} /> FAIL</span>;
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
    const [authError, setAuthError] = useState('');
    const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<{ deleted: number; failed: number } | null>(null);
    const [cleanupError, setCleanupError] = useState('');

    const fetchStatus = async (adminToken: string) => {
        setLoading(true);
        setAuthError('');
        try {
            const res = await fetch(`/api/admin/system-status?t=${adminToken}`);
            if (res.ok) {
                setStatusData(await res.json());
                setLoading(false);
                return;
            }
            if (res.status === 401) {
                setAuthError('Token admin inválido ou ausente.');
            } else {
                setAuthError('Falha ao carregar diagnóstico do sistema.');
            }
            setStatusData(null);
        } catch (err) {
            console.error(err);
            setAuthError('Falha de rede ao carregar diagnóstico do sistema.');
            setStatusData(null);
        }
        setLoading(false);
    };

    const persistToken = (rawToken: string) => {
        const clean = rawToken.trim();
        if (!clean) return;
        setToken(clean);
        localStorage.setItem('vrnp_admin_token', clean);
        localStorage.setItem('admin_token', clean);
        document.cookie = `admin_token=${encodeURIComponent(clean)}; path=/; max-age=2592000; samesite=lax`;
    };

    useEffect(() => {
        let isMounted = true;
        const storedCookie = document.cookie.split('; ').find(row => row.startsWith('admin_token='));

        async function init() {
            const localToken = localStorage.getItem('vrnp_admin_token') || localStorage.getItem('admin_token') || '';
            if (storedCookie || localToken) {
                const val = storedCookie ? decodeURIComponent(storedCookie.split('=')[1]) : localToken;
                setToken(val);
                if (!storedCookie && localToken) {
                    document.cookie = `admin_token=${encodeURIComponent(localToken)}; path=/; max-age=2592000; samesite=lax`;
                }
                await fetchStatus(val);
            } else if (isMounted) {
                setLoading(false);
                setAuthError('Faça login admin para ver o diagnóstico.');
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
            const res = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${token}`, { method });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Falha na ação.');
            }
            if (jobName === 'proof_cleanup') {
                const deleted = Number(data?.deleted_files || 0);
                const attempted = Number(data?.deleted_events || 0);
                const failed = Math.max(0, attempted - deleted);
                setCleanupResult({ deleted, failed });
                setCleanupError('');
            }
            // wait a sec then refresh
            setTimeout(() => fetchStatus(token), 2000);
        } catch (err) {
            console.error(err);
            if (jobName === 'proof_cleanup') {
                setCleanupResult(null);
                setCleanupError(err instanceof Error ? err.message : 'Falha ao limpar fotos antigas.');
            }
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>;
    }

    if (!statusData) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl border border-white/10 bg-[#10141b] text-white space-y-4">
                <h1 className="text-xl font-industrial italic uppercase tracking-wide">Diagnóstico Admin</h1>
                <p className="text-sm text-white/70">
                    {authError || 'Não foi possível carregar o status do sistema.'}
                </p>
                <div className="space-y-2">
                    <label htmlFor="admin-token-input" className="text-[10px] font-black uppercase tracking-widest text-white/50">
                        Token admin
                    </label>
                    <input
                        id="admin-token-input"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Cole o token de admin"
                        className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            persistToken(token);
                            fetchStatus(token);
                        }}
                        className="min-h-11 px-4 rounded-xl bg-brand text-black font-black text-[10px] uppercase tracking-widest hover:brightness-105"
                    >
                        Salvar token e carregar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const prompted = window.prompt('Digite o token de admin:');
                            if (!prompted) return;
                            persistToken(prompted);
                            fetchStatus(prompted);
                        }}
                        className="min-h-11 px-4 rounded-xl bg-white/10 border border-white/15 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/15"
                    >
                        Inserir token
                    </button>
                </div>
            </div>
        );
    }

    const { health, jobs, dataFreshness, migrations } = statusData;
    const proof = statusData.proofPhotos || {
        uploads_7d: 0,
        with_line_read_7d: 0,
        confirmed_7d: 0,
        pct_line_read_7d: 0,
        pct_confirmed_7d: 0
    };

    return (
        <div className="space-y-6">
            {cleanupModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0c0f14] border border-white/10 shadow-2xl p-6 space-y-4">
                        <h3 className="text-xl font-industrial italic text-white">Confirmar limpeza de fotos antigas</h3>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Esta ação remove fotos antigas do bucket privado e apaga os registros vinculados. Deseja continuar agora?
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setCleanupModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setCleanupResult(null);
                                    setCleanupError('');
                                    await triggerAction('proof_cleanup', '/api/admin/proof/cleanup-old');
                                    setCleanupModalOpen(false);
                                }}
                                disabled={actionLoading === 'proof_cleanup'}
                                className="px-5 py-2.5 rounded-xl bg-brand text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 disabled:opacity-60 transition shadow-lg shadow-brand/20"
                            >
                                {actionLoading === 'proof_cleanup' ? 'Limpando...' : 'Confirmar limpeza'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-industrial italic text-white">System Status</h1>
                    <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Saúde da infraestrutura, cronjobs e dados.</p>
                </div>
                <button onClick={() => fetchStatus(token)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 hover:text-white px-5 py-2.5 rounded-xl transition hover:bg-white/10 active:scale-95 shadow-xl">
                    <RefreshCw size={16} /> Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Health Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3 text-brand border-b border-white/5 pb-3">
                        <Activity size={20} />
                        <h2 className="font-black text-white italic uppercase tracking-tight">Saúde do Deploy</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">API Health</span>
                            <StatusBadge status={health.api_health} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Env Audit</span>
                            <StatusBadge status={health.env_audit} />
                        </div>
                    </div>
                </div>

                {/* Data Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3 text-brand border-b border-white/5 pb-3">
                        <Database size={20} />
                        <h2 className="font-black text-white italic uppercase tracking-tight">Dados & Alertas</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Último Sync</span>
                            <span className="font-bold text-white italic">{formatDate(dataFreshness.official_schedules_last_fetched_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Último Alerta</span>
                            <span className="font-bold text-white italic">{formatDate(dataFreshness.alerts_last_created_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Alertas Ativos</span>
                            <span className="font-black text-red-500 text-lg tabular-nums italic">{dataFreshness.active_alerts_count}</span>
                        </div>
                    </div>
                </div>

                {/* DB Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3 text-brand border-b border-white/5 pb-3">
                        <Server size={20} />
                        <h2 className="font-black text-white italic uppercase tracking-tight">Banco de Dados</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Migration Ativa</span>
                            <span className="font-mono text-[10px] bg-white/5 px-2 py-1 rounded text-white/60 truncate max-w-[120px]" title={migrations.version}>{migrations.version}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Verificado em</span>
                            <span className="text-white/40 text-[10px] font-bold">{formatDate(migrations.checked_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Telegram Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3 text-brand border-b border-white/5 pb-3">
                        <MessageSquare size={20} />
                        <h2 className="font-black text-white italic uppercase tracking-tight">Notificações Telegram</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Último Envio</span>
                            <span className="font-bold text-white italic">{formatDate(statusData.telegram.last_sent_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</span>
                            <StatusBadge status={statusData.telegram.last_status} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Enviados (24h)</span>
                            <span className="font-black text-white text-lg tabular-nums italic">{statusData.telegram.count_24h}</span>
                        </div>
                    </div>
                    {statusData.telegram.subscriptions && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Inscritos Ativos</span>
                                <span className="font-black text-white">{statusData.telegram.subscriptions.total}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Modo: Digest / Imediato</span>
                                <span className="text-white/60 font-mono text-[10px] font-bold">{statusData.telegram.subscriptions.digest} / {statusData.telegram.subscriptions.immediate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Somente Críticos</span>
                                <span className="text-white/60 font-mono text-[10px] font-bold">{statusData.telegram.subscriptions.crit_only}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => triggerAction('telegram', '/api/admin/notify-telegram')}
                        disabled={actionLoading === 'telegram'}
                        className="w-full flex items-center justify-center gap-2 bg-brand hover:brightness-110 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-brand/20"
                    >
                        {actionLoading === 'telegram' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Notificar Agora
                    </button>
                </div>

                {/* Proof Photos Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5">
                    <div className="flex items-center gap-3 text-brand border-b border-white/5 pb-3">
                        <Camera size={20} />
                        <h2 className="font-black text-white italic uppercase tracking-tight">Fotos de Prova (7d)</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Total uploads</span>
                            <span className="font-black text-white text-lg tabular-nums italic">{proof.uploads_7d}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Com leitura de linha</span>
                            <span className="font-black text-white text-lg tabular-nums italic">{proof.pct_line_read_7d}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Confirmadas</span>
                            <span className="font-black text-white text-lg tabular-nums italic">{proof.pct_confirmed_7d}%</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setCleanupModalOpen(true)}
                        disabled={actionLoading === 'proof_cleanup'}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50 border border-white/10 shadow-xl"
                    >
                        {actionLoading === 'proof_cleanup' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Limpar fotos antigas (manual)
                    </button>
                    {(cleanupResult || cleanupError) && (
                        <div className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cleanupError ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {cleanupError
                                ? `Falha na limpeza: ${cleanupError}`
                                : `Resultado: apagadas ${cleanupResult?.deleted ?? 0}, falhas ${cleanupResult?.failed ?? 0}.`}
                        </div>
                    )}
                </div>

                {/* Web Push Card */}
                <div className="bg-[#0c0f14] p-5 rounded-2xl border border-white/10 shadow-2xl space-y-5 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3 text-brand">
                            <Send size={20} />
                            <h2 className="font-black text-white italic uppercase tracking-tight">Browser Web Push</h2>
                        </div>
                        <StatusBadge status={statusData.webpush.vapid_ok ? 'OK' : 'FAIL'} />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Último Envio</span>
                            <span className="font-bold text-white italic">{formatDate(statusData.webpush.last_sent_at)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</span>
                            <StatusBadge status={statusData.webpush.last_status} />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Falhas (24h)</span>
                            <span className={statusData.webpush.failures_24h > 0 ? "font-black text-red-500 text-lg tabular-nums italic" : "font-black text-white text-lg tabular-nums italic"}>{statusData.webpush.failures_24h}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Endpoints Mortos (410)</span>
                            <span className="font-black text-orange-500 text-lg tabular-nums italic">{statusData.webpush.dead_endpoints}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Env Chaves VAPID</span>
                            <span className={statusData.webpush.vapid_ok ? "font-black text-emerald-500 uppercase italic" : "font-black text-red-500 uppercase italic text-[10px]"}>{statusData.webpush.vapid_ok ? 'OK' : 'MISSING'}</span>
                        </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Web Inscritos Ativos</span>
                            <span className="font-black text-white">{statusData.webpush.subscriptions.total}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Digest / Imediato</span>
                            <span className="text-white/60 font-mono text-[10px] font-bold">{statusData.webpush.subscriptions.digest} / {statusData.webpush.subscriptions.immediate}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => triggerAction('webpush', '/api/admin/push/digest')}
                            disabled={actionLoading === 'webpush'}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:brightness-110 text-black px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-brand/20"
                        >
                            {actionLoading === 'webpush' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Disparar Digest
                        </button>
                    </div>
                </div>
            </div>

            {/* Jobs Card */}
            <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-3 text-brand">
                    <Clock size={20} />
                    <h2 className="font-black text-white italic uppercase tracking-tight">Cronjobs (GitHub Actions)</h2>
                </div>
                <div className="divide-y divide-white/5">
                    {[
                        { id: 'sync_official', name: 'Sync Oficial (Diário)', obj: jobs.sync_official, endpoint: '/api/admin/sync-official' },
                        { id: 'run_alerts', name: 'Engine de Alertas (Diário)', obj: jobs.run_alerts, endpoint: '/api/admin/run-alerts' },
                        { id: 'bulletin_card', name: 'Gerar Boletim (Semanal)', obj: jobs.bulletin_card, endpoint: '/api/bulletin/card' }
                    ].map(job => (
                        <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group">
                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-white italic uppercase tracking-tight">{job.name}</h3>
                                    <StatusBadge status={job.obj.status} stale={job.obj.stale} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1">
                                    Última execução: <span className="text-white underline decoration-brand/30">{formatDate(job.obj.finished_at)}</span>
                                    {job.obj.meta && Object.keys(job.obj.meta).length > 0 && (
                                        <span className="ml-3 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono text-white/40 tracking-normal">
                                            Logs: {JSON.stringify(job.obj.meta)}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => triggerAction(job.id, job.endpoint)}
                                disabled={actionLoading === job.id}
                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-brand hover:text-black border border-white/10 text-white/60 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 group-hover:border-brand/50 shadow-xl"
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
        <div className="bg-[#0c0f14] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-brand">
                    <Database size={20} />
                    <h2 className="font-black text-white italic uppercase tracking-tight">Bairros: Qualidade do Match</h2>
                </div>
                <button onClick={refreshAudit} disabled={loading} className="text-white/40 hover:text-white transition">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            {audit && (
                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                            <div className="text-2xl font-black text-white italic tabular-nums">{audit.match_rate_pct}%</div>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Match Rate</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                            <div className="text-2xl font-black text-emerald-500 italic tabular-nums">{audit.matched_count}</div>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Matched</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                            <div className="text-2xl font-black text-white italic tabular-nums">{audit.total_stop_neighborhoods}</div>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Stops Bairros</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                            <div className="text-2xl font-black text-white italic tabular-nums">{audit.total_shape_neighborhoods}</div>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Shapes</div>
                        </div>
                    </div>

                    {audit.unmatched_stops.length > 0 && (
                        <div>
                            <button onClick={() => setShowStops(!showStops)} className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:brightness-110 flex items-center gap-2">
                                <span className="text-lg leading-none">{showStops ? '▾' : '▸'}</span> Faltantes nos Stops ({audit.unmatched_stops.length})
                            </button>
                            {showStops && (
                                <div className="mt-2 bg-orange-500/5 p-4 rounded-xl text-[10px] font-mono text-orange-500/70 max-h-40 overflow-y-auto border border-orange-500/10">
                                    {audit.unmatched_stops.map(s => <div key={s} className="py-0.5">• {s}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {audit.unmatched_shapes.length > 0 && (
                        <div>
                            <button onClick={() => setShowShapes(!showShapes)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:brightness-110 flex items-center gap-2">
                                <span className="text-lg leading-none">{showShapes ? '▾' : '▸'}</span> Faltantes nos Shapes ({audit.unmatched_shapes.length})
                            </button>
                            {showShapes && (
                                <div className="mt-2 bg-red-500/5 p-4 rounded-xl text-[10px] font-mono text-red-500/70 max-h-40 overflow-y-auto border border-red-500/10">
                                    {audit.unmatched_shapes.map(s => <div key={s} className="py-0.5">• {s}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                        <button
                            onClick={runRenormalize}
                            disabled={renormLoading}
                            className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 text-brand px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                        >
                            {renormLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                            Re-normalizar Agora
                        </button>
                        {renormResult && <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{renormResult}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
