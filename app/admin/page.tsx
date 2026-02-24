'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, MapPin, Bus, Handshake, Zap, Target, CloudUpload } from 'lucide-react';

type SystemStatus = {
    dataFreshness?: {
        official_schedules_last_fetched_at?: string | null;
    };
};

type TelemetryRow = {
    count: number | null;
    date: string;
};

export default function AdminHome() {
    const [health, setHealth] = useState<string | null>(null);
    const [envAudit, setEnvAudit] = useState<Record<string, string> | null>(null);
    const [stats, setStats] = useState<{ lines: number, stops: number, partners: number } | null>(null);
    const [telemetry, setTelemetry] = useState<{ today: number, week: number } | null>(null);
    const [statusData, setStatusData] = useState<SystemStatus | null>(null);

    useEffect(() => {
        // Fetch Health
        fetch('/api/health')
            .then(res => res.ok ? 'OK' : 'FAIL')
            .then(setHealth)
            .catch(() => setHealth('ERROR'));

        // Fetch Env Audit
        fetch('/api/env-audit')
            .then(res => res.json())
            .then(data => setEnvAudit(data.env || {}))
            .catch(() => setEnvAudit({ "API_ERROR": "FAIL" }));

        // Fetch Real-time Stats
        async function fetchStats() {
            const supabase = createClient();
            const [lines, stops, partners] = await Promise.all([
                supabase.from('lines').select('id', { count: 'exact', head: true }),
                supabase.from('stops').select('id', { count: 'exact', head: true }),
                supabase.from('partners').select('id', { count: 'exact', head: true })
            ]);

            setStats({
                lines: lines.count || 0,
                stops: stops.count || 0,
                partners: partners.count || 0
            });
        }
        fetchStats();

        // Fetch Telemetry
        async function fetchTelemetry() {
            const supabase = createClient();
            const today = new Date().toISOString().slice(0, 10);
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const { data } = await supabase
                .from('telemetry_counts')
                .select('count, date')
                .eq('event_key', 'cta_click')
                .gte('date', weekAgo);
            const telemetryRows = (data || []) as TelemetryRow[];
            const todayCount = telemetryRows.find((r) => r.date === today)?.count || 0;
            const weekCount = telemetryRows.reduce((s, r) => s + (r.count || 0), 0);
            setTelemetry({ today: todayCount, week: weekCount });
        }
        fetchTelemetry();

        // Fetch System Status
        const cookieToken = document.cookie.split('; ').find(row => row.startsWith('admin_token='));
        if (cookieToken) {
            const tokenValue = cookieToken.split('=')[1];
            fetch(`/api/admin/system-status?t=${tokenValue}`)
                .then(res => res.json())
                .then(setStatusData)
                .catch(() => { });
        }
    }, []);

    const tileBase = "group p-5 rounded-2xl border border-white/10 bg-[#10141b] shadow-xl shadow-black/30 hover:border-brand/30 hover:bg-[#131923] transition-all";
    const metricLabel = "text-[10px] text-white/50 uppercase font-black tracking-wider";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-industrial italic uppercase tracking-wide text-white">Dashboard Administrativo</h1>
                <p className="text-white/70 mt-2">Bem-vindo ao painel de controle do VR no Ponto.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5">
                <div className="col-span-full mb-2">
                    <h2 className="text-xl font-industrial italic uppercase tracking-wide text-white flex items-center gap-2">
                        <span className="text-brand">⚡</span> Modo Operacional <span className="text-white/30 text-sm font-normal not-italic">(Dia a Dia)</span>
                    </h2>
                </div>

                {/* Routine 1: OSM */}
                <a href="/admin/pontos?tab=seed" className="group flex flex-col justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand/40 hover:bg-brand/[0.02] transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-amber-500/15 text-amber-400 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                            <MapPin size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">Atualizar Paradas</p>
                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5">Sincronizar via OSM</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Total atual</span>
                        <span className="text-xs font-black text-white">{stats?.stops ?? '--'} pontos</span>
                    </div>
                </a>

                {/* Routine 2: PDF */}
                <a href="/admin/oficial" className="group flex flex-col justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand/40 hover:bg-brand/[0.02] transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-brand/15 text-brand p-3 rounded-2xl group-hover:scale-110 transition-transform">
                            <CloudUpload size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">Importar Horários</p>
                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5">Processar PDFs PMVR</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Último Sync</span>
                        <span className="text-xs font-black text-white">{statusData?.dataFreshness?.official_schedules_last_fetched_at ? new Date(statusData.dataFreshness.official_schedules_last_fetched_at).toLocaleDateString('pt-BR') : '--'}</span>
                    </div>
                </a>

                {/* Routine 3: Health */}
                <a href="/admin/status" className="group flex flex-col justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-brand/40 hover:bg-brand/[0.02] transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-emerald-500/15 text-emerald-400 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                            <Activity size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">Ver Saúde</p>
                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5">Qualidade & Push</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Runtime</span>
                        <span className={`text-xs font-black p-1 px-2 rounded-md ${health === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {health || '...'}
                        </span>
                    </div>
                </a>
            </div>

            <div className="mt-12">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
                    <span className="h-px w-8 bg-white/10" />
                    Métricas de Crescimento
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a href="/admin/linhas" className={tileBase}>
                        <div className="bg-brand/15 text-brand w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                            <Bus size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <h2 className="text-lg font-black text-white leading-tight">Linhas de Ônibus</h2>
                            <span className="text-2xl font-black text-brand">{stats?.lines ?? '..'}</span>
                        </div>
                    </a>

                    <a href="/admin/pontos" className={tileBase}>
                        <div className="bg-amber-500/15 text-amber-400 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                            <MapPin size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <h2 className="text-lg font-black text-white leading-tight">Pontos de Parada</h2>
                            <span className="text-2xl font-black text-amber-400">{stats?.stops ?? '..'}</span>
                        </div>
                    </a>

                    <a href="/admin/parceiros" className={tileBase}>
                        <div className="bg-emerald-500/15 text-emerald-400 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                            <Handshake size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <h2 className="text-lg font-black text-white leading-tight">Pontos Parceiros</h2>
                            <span className="text-2xl font-black text-emerald-400">{stats?.partners ?? '..'}</span>
                        </div>
                    </a>

                    <div className={tileBase}>
                        <div className="bg-brand/15 text-brand w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl">
                            <Zap size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-lg font-black text-white leading-tight">Onboarding</h2>
                                <p className="text-xs text-white/60 mt-0.5">Cliques &quot;Começar agora&quot;</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-3">
                            <div>
                                <div className="text-2xl font-black text-brand">{telemetry?.today ?? '–'}</div>
                                <div className={metricLabel}>Hoje</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-brand/70">{telemetry?.week ?? '–'}</div>
                                <div className={metricLabel}>7 dias</div>
                            </div>
                        </div>
                    </div>

                    <a href="/admin/mutirao" className={tileBase}>
                        <div className="bg-brand/5 text-brand w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                            <Target size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <h2 className="text-lg font-black text-white leading-tight">Mutirões</h2>
                        </div>
                    </a>

                    <a href="/admin/oficial" className={tileBase}>
                        <div className="bg-white/10 text-white/80 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                            <Activity size={20} />
                        </div>
                        <div className="flex justify-between items-end">
                            <h2 className="text-lg font-black text-white leading-tight">Horários Oficiais</h2>
                        </div>
                    </a>
                </div>
            </div>

            <div className="mt-12 rounded-2xl p-6 border border-white/10 bg-[#0c0f14] shadow-2xl shadow-black/30">
                <h2 className="text-xl font-industrial italic uppercase tracking-wide text-white mb-4 flex items-center gap-2">
                    <span className="text-brand">🩺</span> Saúde do Deploy (Vercel)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Health */}
                    <div>
                        <h3 className="font-semibold text-white mb-2">App Runtime</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-white/70">Health Check API:</span>
                            {health === 'OK' ? (
                                <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs rounded font-bold">OK (200)</span>
                            ) : health ? (
                                <span className="px-2 py-1 bg-red-500/15 text-red-300 border border-red-500/30 text-xs rounded font-bold">{health}</span>
                            ) : (
                                <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded animate-pulse">Verificando...</span>
                            )}
                        </div>
                    </div>

                    {/* Env Variables Audit */}
                    <div>
                        <h3 className="font-semibold text-white mb-2">Variáveis de Ambiente Mínimas</h3>
                        {envAudit ? (
                            <ul className="space-y-2">
                                {Object.entries(envAudit).map(([key, status]) => (
                                    <li key={key} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10 text-sm">
                                        <code className="text-white/80">{key}</code>
                                        <span className={"px-2 py-1 text-xs rounded font-bold border " + (status === 'OK' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30')}>
                                            {status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-white/60 animate-pulse">Auditando cofre local...</div>
                        )}
                        <p className="text-xs text-white/50 mt-2">Esta auditoria enxerga apenas chaves registradas no host. Valores estão confidenciais.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
