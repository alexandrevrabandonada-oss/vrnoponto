'use client';

import { useEffect, useState } from 'react';
import { useParams as useNextParams } from 'next/navigation';
import { Clock, TrendingUp, Users, BadgeAlert, AlertCircle, BarChart3, Bus } from 'lucide-react';
import { Sparkline } from '@/components/metrics/Sparkline';
import { StopPromisedVsRealCard } from '@/components/StopPromisedVsRealCard';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateStopCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Card, Divider,
    SkeletonCard, SkeletonList, EmptyState, InlineAlert, ListItem, MetricRow, MetricCard, SectionCard
} from '@/components/ui';

type PointDetail = {
    stop: { id: string; name: string; neighborhood: string; is_active: boolean };
    metrics: { p50_wait_min: number | null; p90_wait_min: number | null; samples: number; delta_7d_pct: number | null };
    trust_mix: { total_events: number; pct_verified: number } | null;
    lines: Array<{ line_id: string; line_code: string; line_name: string; p50_wait_min: number; samples: number }>;
};

type WeeklyData = {
    week_start: string;
    p50_wait_min: number;
    p90_wait_min: number;
    samples: number;
};

type Alert = {
    id: string;
    alert_type: string;
    target_id: string;
    week_start: string;
    metric_p50: number;
    prev_metric_p50: number;
    delta_pct: number;
    severity: 'INFO' | 'WARN' | 'CRIT';
    created_at: string;
};

export default function PontoDetailPage() {
    const params = useNextParams();
    const stopId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PointDetail | null>(null);
    const [weekly, setWeekly] = useState<WeeklyData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        if (!stopId) return;

        async function fetchData() {
            setLoading(true);
            try {
                const [detailRes, weeklyRes, alertsRes] = await Promise.all([
                    fetch(`/api/point/detail?stop_id=${stopId}`),
                    fetch(`/api/timeseries/stop?stop_id=${stopId}&weeks=8`),
                    fetch(`/api/alerts?days=30`)
                ]);

                if (detailRes.ok) setData(await detailRes.json());
                if (weeklyRes.ok) setWeekly(await weeklyRes.json());
                if (alertsRes.ok) {
                    const allAlerts = await alertsRes.json();
                    setAlerts(allAlerts.filter((a: { target_id: string; alert_type: string; }) => a.target_id === stopId && a.alert_type === 'STOP_WAIT'));
                }
            } catch (err) {
                console.error('Error fetching point details:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [stopId]);

    if (loading && !data) {
        return (
            <AppShell title="ANÁLISE">
                <div className="space-y-8 animate-pulse">
                    <div className="h-12 w-1/3 bg-white/5 rounded-xl" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                    <SkeletonCard className="h-48" />
                    <SkeletonList items={5} />
                </div>
            </AppShell>
        );
    }

    if (!data) {
        return (
            <AppShell title="ANÁLISE">
                <EmptyState
                    icon={AlertCircle}
                    title="Ponto não encontrado"
                    description="Não conseguimos localizar os registros deste ponto no sistema."
                    actionLabel="Ver Ranking"
                    onAction={() => window.location.href = '/painel'}
                />
            </AppShell>
        );
    }

    const { stop, metrics, lines } = data;
    const hasTrend = metrics.delta_7d_pct !== null;
    const isWorsening = hasTrend && metrics.delta_7d_pct! > 0;

    return (
        <AppShell
            title="ANÁLISE DE PONTO"
            actions={
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${stop.is_active ? 'bg-brand/20 text-brand' : 'bg-red-500/20 text-red-400'}`}>
                        {stop.is_active ? 'MONITORADO' : 'INATIVO'}
                    </span>
                </div>
            }
        >
            <PageHeader
                title={stop.name}
                subtitle={`${stop.neighborhood} • ID: ${stop.id.slice(0, 8)}`}
            />

            <div className="space-y-8">
                {/* Active Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <InlineAlert
                                key={alert.id}
                                variant={alert.severity === 'CRIT' ? 'error' : 'warning'}
                                title="Alerta de Demora"
                            >
                                Aumento de <span className="text-white">+{alert.delta_pct}%</span> no tempo típico de espera em relação à semana anterior.
                            </InlineAlert>
                        ))}
                    </div>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Tempo Típico (P50)"
                        value={metrics.p50_wait_min ? `${metrics.p50_wait_min}m` : '--'}
                        trend="Mediana Real"
                    />
                    <MetricCard
                        label="Atraso Crítico"
                        value={metrics.p90_wait_min ? `${metrics.p90_wait_min}m` : '--'}
                        trendColor="danger"
                        trend="P90 observado"
                    />
                    <MetricCard
                        label="Relatos"
                        value={metrics.samples}
                    />
                    <MetricCard
                        label="Tendência 7D"
                        value={hasTrend ? (metrics.delta_7d_pct! > 0 ? `+${metrics.delta_7d_pct}%` : `${metrics.delta_7d_pct}%`) : 'Estável'}
                        trendColor={isWorsening ? 'danger' : 'success'}
                        trend={isWorsening ? 'Aumentando' : 'Melhorando'}
                    />
                </div>

                <SectionCard title="Monitoramento Temporal" subtitle="Fluxo de espera baseado nas últimas 8 semanas">
                    <div className="divide-y divide-white/5 -mx-4 -mb-4">
                        {weekly.length === 0 ? (
                            <EmptyState
                                icon={BarChart3}
                                title="Histórico Vazio"
                                description="Ainda não recebemos relatos suficientes para gerar o gráfico de tendência deste ponto. Colabore hoje!"
                                actionLabel="Auditar Ponto"
                                onAction={() => window.location.href = '/no-ponto'}
                                secondaryActionLabel="Como Funciona"
                                onSecondaryAction={() => window.location.href = '/como-usar'}
                                className="!py-12"
                            />
                        ) : (
                            weekly.slice().reverse().map((w) => (
                                <MetricRow
                                    key={w.week_start}
                                    label={new Date(w.week_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    value={w.p50_wait_min}
                                    unit="min"
                                    trend={{
                                        value: `${w.samples} relatos`,
                                        isPositive: w.samples > 30
                                    }}
                                />
                            ))
                        )}
                    </div>
                </SectionCard>

                <Divider label="COMPARAÇÃO OFICIAL (DOMED)" />
                <StopPromisedVsRealCard stopId={stop.id} />

                <Divider label="RELATÓRIO DE IMPACTO" />
                <EditorialCard
                    data={{ stop, metrics }}
                    generator={(d, t) => generateStopCaption(d.stop, d.metrics, t)}
                    title="Kit de Denúncia: Ponto de Ônibus"
                />

                <Card className="!p-8 bg-brand border-brand overflow-hidden relative group cursor-pointer" onClick={() => window.location.href = '/registrar'}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Bus size={120} className="text-black" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-black font-industrial text-2xl italic leading-none uppercase">Auditar este Ponto</h3>
                        <p className="text-[11px] text-black font-black leading-relaxed uppercase tracking-tight max-w-sm">
                            O relato de quem espera é a prova técnica. Ajude a fortalecer a auditoria comunitária de Volta Redonda registrando sua espera agora.
                        </p>
                        <div className="inline-flex items-center gap-2 bg-black text-brand px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl">
                            Registrar Espera
                        </div>
                    </div>
                </Card>

                {/* Lines List */}
                <SectionCard title="Itinerários do Ponto" subtitle="Linhas com amostragem consolidada">
                    <div className="space-y-3">
                        {lines.length === 0 ? (
                            <EmptyState
                                icon={Bus}
                                title="Sem Linhas Consolidadas"
                                description="Nenhuma linha com amostragem consolidada neste ponto ainda. Seja o primeiro a auditar!"
                                actionLabel="Auditar Agora"
                                onAction={() => window.location.href = '/no-ponto'}
                                secondaryActionLabel="Ver Ranking"
                                onSecondaryAction={() => window.location.href = '/bairros'}
                            />
                        ) : (
                            lines.map((l) => (
                                <ListItem
                                    key={l.line_id}
                                    icon={<Bus size={18} className={l.p50_wait_min > 15 ? 'text-danger' : 'text-muted'} />}
                                    title={l.line_code}
                                    subtitle={l.line_name}
                                    extra={
                                        <div className="text-right">
                                            <div className={`text-lg font-industrial italic leading-none ${l.p50_wait_min > 15 ? 'text-danger' : 'text-brand'}`}>
                                                {l.p50_wait_min}m
                                            </div>
                                            <div className="text-[8px] font-black text-muted uppercase tracking-tight opacity-40">Típico</div>
                                        </div>
                                    }
                                    onClick={() => window.location.href = `/linha/${l.line_id}`}
                                />
                            ))
                        )}
                    </div>
                </SectionCard>
            </div>
        </AppShell>
    );
}
