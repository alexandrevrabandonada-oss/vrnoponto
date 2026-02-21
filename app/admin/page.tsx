import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, MapPin, Bus, Handshake } from 'lucide-react';

export default function AdminHome() {
    const [health, setHealth] = useState<string | null>(null);
    const [envAudit, setEnvAudit] = useState<Record<string, string> | null>(null);
    const [stats, setStats] = useState<{ lines: number, stops: number, partners: number } | null>(null);

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
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <p className="text-gray-600">Bem-vindo ao painel de controle do VR no Ponto.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <a href="/admin/linhas" className="group p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-indigo-100 hover:border-indigo-200 transition-all">
                    <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                        <Bus size={20} />
                    </div>
                    <div className="flex justify-between items-end">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Linhas de Ônibus</h2>
                        <span className="text-2xl font-black text-indigo-600/20">{stats?.lines ?? '..'}</span>
                    </div>
                </a>

                <a href="/admin/pontos" className="group p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-amber-100 hover:border-amber-200 transition-all">
                    <div className="bg-amber-50 text-amber-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                        <MapPin size={20} />
                    </div>
                    <div className="flex justify-between items-end">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Pontos de Parada</h2>
                        <span className="text-2xl font-black text-amber-600/20">{stats?.stops ?? '..'}</span>
                    </div>
                </a>

                <a href="/admin/parceiros" className="group p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-emerald-100 hover:border-emerald-200 transition-all">
                    <div className="bg-emerald-50 text-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                        <Handshake size={20} />
                    </div>
                    <div className="flex justify-between items-end">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Pontos Parceiros</h2>
                        <span className="text-2xl font-black text-emerald-600/20">{stats?.partners ?? '..'}</span>
                    </div>
                </a>

                <a href="/admin/oficial" className="group p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-gray-100 hover:border-gray-200 transition-all">
                    <div className="bg-gray-50 text-gray-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-xl">
                        <Activity size={20} />
                    </div>
                    <div className="flex justify-between items-end">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Horários Oficiais</h2>
                    </div>
                </a>
            </div>

            <div className="mt-12 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🩺</span> Saúde do Deploy (Vercel)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Health */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">App Runtime</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Health Check API:</span>
                            {health === 'OK' ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-bold">OK (200)</span>
                            ) : health ? (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-bold">{health}</span>
                            ) : (
                                <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded animate-pulse">Verificando...</span>
                            )}
                        </div>
                    </div>

                    {/* Env Variables Audit */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Variáveis de Ambiente Mínimas</h3>
                        {envAudit ? (
                            <ul className="space-y-2">
                                {Object.entries(envAudit).map(([key, status]) => (
                                    <li key={key} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                        <code className="text-gray-600">{key}</code>
                                        <span className={"px-2 py-1 text-xs rounded font-bold " + (status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                            {status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-gray-500 animate-pulse">Auditando cofre local...</div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Esta auditoria enxerga apenas chaves registradas no host. Valores estão confidenciais.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
