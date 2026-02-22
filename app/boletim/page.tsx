'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Download,
    Share2,
    ChevronRight,
    MapPin,
    AlertCircle,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateBulletinCaption } from '@/lib/editorial/templates';

interface BulletinData {
    period: {
        days: number;
        from: string;
        to: string;
    };
    summary: {
        CRIT: number;
        WARN: number;
        INFO: number;
        total: number;
    };
    topAlertsCrit: { id: string, severity: string, alert_type: string, delta_pct: number, target_id: string }[];
    topAlertsWarn: { id: string, severity: string, alert_type: string, delta_pct: number, target_id: string }[];
    worstStops: { stop_id: string, stop_name: string, p50_wait_min: number }[];
    worstLines: { line_id: string, p50_headway_min: number }[];
}

export default function BoletimPage() {
    const [days, setDays] = useState(7);
    const [data, setData] = useState<BulletinData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/bulletin?days=${days}`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('Error fetching bulletin:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [days]);

    const handleDownload = (format: 'square' | 'story') => {
        window.open(`/api/bulletin/card?format=${format}&days=${days}`, '_blank');
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <header className="bg-indigo-900 text-white p-8 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full -mr-20 -mt-20 opacity-50 blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="bg-indigo-500/20 p-2 rounded-2xl mb-4 backdrop-blur-xl border border-white/10">
                        <AlertTriangle className="text-indigo-200" size={24} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">Boletim VR no Ponto</h1>
                    <p className="text-indigo-200 mt-2 text-sm font-medium opacity-80 uppercase tracking-widest">Auditoria Popular de Transparência</p>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-6 -mt-10 space-y-6 relative z-20">
                {/* Period Selector */}
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-xl flex gap-1 border border-gray-100 dark:border-gray-700">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${days === d
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-y-[-2px]'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {d} dias
                        </button>
                    ))}
                </div>

                {/* Summary Card */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-6 rounded-3xl text-center shadow-sm">
                        <div className="text-4xl font-black text-red-600 dark:text-red-400">{data?.summary.CRIT}</div>
                        <div className="text-xs font-bold text-red-500/70 uppercase mt-1 tracking-wider">Alertas CRIT</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-6 rounded-3xl text-center shadow-sm">
                        <div className="text-4xl font-black text-orange-600 dark:text-orange-400">{data?.summary.WARN}</div>
                        <div className="text-xs font-bold text-orange-500/70 uppercase mt-1 tracking-wider">Alertas WARN</div>
                    </div>
                </div>

                {/* Editorial Kit */}
                {data && (
                    <EditorialCard
                        data={data}
                        generator={generateBulletinCaption}
                        title="Kit Editorial: Legenda para o Boletim"
                    />
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => handleDownload('square')}
                        className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-5 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <Download size={20} className="text-indigo-600" />
                        Card para Feed (1:1)
                    </button>
                    <button
                        onClick={() => handleDownload('story')}
                        className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-5 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <Download size={20} className="text-indigo-600" />
                        Card para Stories (9:16)
                    </button>
                </div>

                {/* Top 3 Worst Stops Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => window.open('/api/bulletin/worst-stops-card?format=square', '_blank')}
                        className="flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-5 rounded-2xl border border-red-200 dark:border-red-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Top 3 Pontos Críticos (Feed)
                    </button>
                    <button
                        onClick={() => window.open('/api/bulletin/worst-stops-card?format=story', '_blank')}
                        className="flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-5 rounded-2xl border border-red-200 dark:border-red-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Top 3 Pontos Críticos (Story)
                    </button>
                </div>

                {/* Top 5 Worst Neighborhoods Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => window.open('/api/bulletin/worst-neighborhoods-card?format=square&limit=5', '_blank')}
                        className="flex items-center justify-center gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-5 rounded-2xl border border-orange-200 dark:border-orange-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Top 5 Bairros Críticos (Feed)
                    </button>
                    <button
                        onClick={() => window.open('/api/bulletin/worst-neighborhoods-card?format=story&limit=5', '_blank')}
                        className="flex items-center justify-center gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-5 rounded-2xl border border-orange-200 dark:border-orange-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Top 5 Bairros Críticos (Story)
                    </button>
                </div>

                {/* Neighborhood Map Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => window.open('/api/bulletin/worst-neighborhoods-map-card?format=square&limit=5', '_blank')}
                        className="flex items-center justify-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Mapa de Bairros (Feed)
                    </button>
                    <button
                        onClick={() => window.open('/api/bulletin/worst-neighborhoods-map-card?format=story&limit=5', '_blank')}
                        className="flex items-center justify-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Mapa de Bairros (Story)
                    </button>
                </div>

                {/* Top Critical Stoppages */}
                <section>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 px-1 flex items-center gap-2">
                        <MapPin size={20} className="text-indigo-600" />
                        Piores Pontos (30 dias)
                    </h2>
                    <div className="space-y-3">
                        {data?.worstStops.map(stop => (
                            <Link
                                href={`/ponto/${stop.stop_id}`}
                                key={stop.stop_id}
                                className="group flex items-center justify-between bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{stop.stop_name}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Wait P50: <b className="text-red-500">{stop.p50_wait_min}m</b></span>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" size={20} />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Critical Alerts List */}
                <section>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 px-1 flex items-center gap-2">
                        <AlertCircle size={20} className="text-red-600" />
                        Principais Alertas
                    </h2>
                    <div className="space-y-3">
                        {data?.topAlertsCrit.concat(data?.topAlertsWarn).slice(0, 5).map(alert => (
                            <div key={alert.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-l-4 border-l-red-500 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${alert.severity === 'CRIT' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {alert.severity}
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                            {alert.alert_type === 'STOP_WAIT' ? 'Espera Crítica' : 'Intervalo Crítico'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 mt-2">
                                        Piora de <b className="text-gray-900 dark:text-white">+{alert.delta_pct}%</b> em relação à semana anterior.
                                    </span>
                                </div>
                                <Link
                                    href={alert.alert_type === 'STOP_WAIT' ? `/ponto/${alert.target_id}` : `/linha/${alert.target_id}`}
                                    className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"
                                >
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Shared Link Card */}
                <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-200 dark:shadow-none text-center flex flex-col items-center">
                    <Share2 className="mb-4 opacity-50" size={32} />
                    <h3 className="text-xl font-black mb-2">Transparência Coletiva</h3>
                    <p className="text-indigo-100 text-sm mb-6 max-w-xs opacity-80 leading-relaxed">
                        Estes dados são gerados com base nos relatos anônimos da comunidade. Compartilhe o boletim para pressionar por melhorias!
                    </p>
                    <button
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 rounded-3xl transition-all active:scale-95"
                    >
                        Copiar Link do Boletim
                    </button>
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300 mt-4 opacity-70">vrnoponto.vercel.app/boletim</p>
                </div>
            </div>

            {/* Nav Padding */}
            <div className="h-20" />
        </div>
    );
}
