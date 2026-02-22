'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Bus, BarChart3 } from 'lucide-react';
import {
    AppShell, PageHeader, Card, Divider,
    EmptyState, SkeletonCard, SkeletonList, InlineAlert, MetricRow
} from '@/components/ui';

interface Line { id: string; code: string; name: string; }

interface CriticalStop { stop_name: string; median_wait_time: number; total_samples: number; }
interface DashboardAlert { id: string, alert_type: string, severity: string, delta_pct: number, target_id: string }

export default function PainelPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <PainelContent />
        </Suspense>
    );
}

function DashboardSkeleton() {
    return (
        <AppShell title="ESTATÍSTICAS">
            <div className="space-y-8 animate-pulse">
                <div className="h-16 bg-white/5 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <Divider label="CARREGANDO RANKINGS" />
                <SkeletonList items={8} />
            </div>
        </AppShell>
    );
}

function PainelContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const lineFilter = searchParams.get('line') || '';
    const daysFilter = searchParams.get('days') || '30';

    const [loading, setLoading] = useState(true);
    const [lines, setLines] = useState<Line[]>([]);
    const [stats, setStats] = useState<{
        avgWaitTime: number;
        avgHeadway: number;
        criticalStops: CriticalStop[];
        alerts: DashboardAlert[];
    } | null>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/dashboard/stats?line=${lineFilter}&days=${daysFilter}`);
                if (res.ok) {
                    const json = await res.json();
                    setStats(json);
                }

                // Fetch lines for filter if not already loaded
                if (lines.length === 0) {
                    const linesRes = await fetch('/api/lines');
                    if (linesRes.ok) {
                        const linesJson = await linesRes.json();
                        setLines(linesJson);
                    }
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [lineFilter, daysFilter, lines.length]);

    const handleFilterChange = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(name, value);
        else params.delete(name);
        router.push(`/painel?${params.toString()}`);
    };

    if (loading && !stats) return <DashboardSkeleton />;

    return (
        <AppShell title="PLANILHA DE PERFORMANCE">
            <PageHeader
                title="Painel VR"
                subtitle="Indicadores técnicos da operação em tempo real"
            />

            <div className="space-y-8">
                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Linha de Operação</label>
                        <select
                            value={lineFilter}
                            onChange={(e) => handleFilterChange('line', e.target.value)}
                            className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-xs font-industrial uppercase transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none"
                        >
                            <option value="">Todas as Linhas</option>
                            {lines.map(l => (
                                <option key={l.id} value={l.id}>{l.code} - {l.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Janela Temporal</label>
                        <select
                            value={daysFilter}
                            onChange={(e) => handleFilterChange('days', e.target.value)}
                            className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl px-4 text-xs font-industrial uppercase transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none"
                        >
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                        </select>
                    </div>
                </div>

                {/* Active Alerts */}
                {(stats?.alerts ?? []).length > 0 && (
                    <div className="space-y-3">
                        <Divider label="ALERTAS EM VIGOR" />
                        {stats?.alerts.slice(0, 3).map(alert => (
                            <InlineAlert
                                key={alert.id}
                                variant={alert.severity === 'CRIT' ? 'error' : 'warning'}
                                title={alert.alert_type === 'STOP_WAIT' ? 'Atraso Crítico no Ponto' : 'Piora de Frequência'}
                            >
                                Identificado desvio de <span className="text-white">+{alert.delta_pct}%</span> em relação ao quadro oficial.
                            </InlineAlert>
                        ))}
                    </div>
                )}

                {/* Primary KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="flex items-center gap-4 group hover:border-brand/20 transition-all">
                        <div className="p-4 bg-brand/10 rounded-2xl text-brand">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-muted uppercase tracking-widest">Espera Mediana</div>
                            <div className="text-3xl font-industrial italic text-white flex items-baseline gap-1">
                                {stats?.avgWaitTime ? stats.avgWaitTime.toFixed(1) : '--'}
                                <span className="text-xs font-black text-muted uppercase">min</span>
                            </div>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4 group hover:border-brand/20 transition-all">
                        <div className="p-4 bg-white/5 rounded-2xl text-white">
                            <Bus size={24} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-muted uppercase tracking-widest">Headway Real</div>
                            <div className="text-3xl font-industrial italic text-white flex items-baseline gap-1">
                                {stats?.avgHeadway ? stats.avgHeadway.toFixed(1) : '--'}
                                <span className="text-xs font-black text-muted uppercase">min</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Critical Stops Ranking */}
                <Divider label="RANKING DE PIORES PONTOS" />
                <div className="space-y-1">
                    {!stats?.criticalStops || stats.criticalStops.length === 0 ? (
                        <EmptyState
                            icon={BarChart3}
                            title="Operação Estável"
                            description="Nenhum ponto de ônibus apresenta desvios críticos para os filtros selecionados."
                        />
                    ) : (
                        <Card className="!p-0 overflow-hidden border-white/5">
                            {stats.criticalStops.map((stop, index) => (
                                <MetricRow
                                    key={stop.stop_name}
                                    label={`#${index + 1} ${stop.stop_name}`}
                                    value={stop.median_wait_time.toFixed(1)}
                                    unit="min"
                                    trend={{
                                        value: `${stop.total_samples} amostras`,
                                        isPositive: stop.total_samples > 20
                                    }}
                                />
                            ))}
                        </Card>
                    )}
                </div>

                {/* Additional Guidance */}
                <Card className="!p-8 bg-zinc-900 border-white/5 border-dashed text-center">
                    <h4 className="font-industrial text-lg uppercase tracking-widest text-white/80 mb-2">Padrão de Auditoria</h4>
                    <p className="text-[11px] font-bold text-muted uppercase leading-relaxed max-w-sm mx-auto opacity-50">
                        Estes indicadores refletem a percepção real de quem usa o sistema diariamente, processados em tempo real para gerar transparência.
                    </p>
                </Card>
            </div>
        </AppShell>
    );
}
