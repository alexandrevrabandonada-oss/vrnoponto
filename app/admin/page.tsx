'use client';

import { useEffect, useState } from 'react';

export default function AdminHome() {
    const [health, setHealth] = useState<string | null>(null);
    const [envAudit, setEnvAudit] = useState<Record<string, string> | null>(null);

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
            .catch(err => {
                console.error("Erro na auditoria:", err);
                setEnvAudit({ "API_ERROR": "FAIL" });
            });
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
            <p className="text-gray-600">Bem-vindo ao painel de controle do VR no Ponto.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <a href="/admin/linhas" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Linhas e Variantes</h2>
                    <p className="text-sm text-gray-500">Cadastre o trajeto das linhas (ex: P200 Vila Rica).</p>
                </a>
                <a href="/admin/pontos" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Pontos de Ônibus</h2>
                    <p className="text-sm text-gray-500">Cadastre pontos fixos com coordenadas de GPS.</p>
                </a>
                <a href="/admin/oficial" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Horários Oficiais</h2>
                    <p className="text-sm text-gray-500">Faça upload de tabelas de horário em PDF.</p>
                </a>
                <a href="/admin/parceiros" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-xl font-bold text-indigo-700 mb-2">Pontos Parceiros</h2>
                    <p className="text-sm text-gray-500">Gestão de locais autorizados e QR Codes L3.</p>
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
