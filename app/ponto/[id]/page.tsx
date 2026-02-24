'use client';

import { useEffect, useState } from 'react';
import { useParams as useNextParams, useRouter } from 'next/navigation';
import { AlertCircle, BarChart3, Bus, ChevronDown, ChevronUp, ShieldCheck, Timer, AlertTriangle } from 'lucide-react';
import { StopPromisedVsRealCard } from '@/components/StopPromisedVsRealCard';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateStopCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Divider,
    SkeletonCard, SkeletonList, EmptyState, InlineAlert, ListItem, MetricRow, MetricCard, SectionCard,
    PublicTopBar, NextStepBlock, Button
} from '@/components/ui';
import { ShareButton } from '@/components/ShareButton';
import Link from 'next/link';

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
    const router = useRouter();
    const stopId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PointDetail | null>(null);
    const [weekly, setWeekly] = useState<WeeklyData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showDetails, setShowDetails] = useState(false);

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

        // Prefetch bulletin
        router.prefetch('/boletim');
    }, [stopId, router]);

    if (loading && !data) {
        return (
            <AppShell hideHeader>
                <PublicTopBar title="Análise" />
                <div className="max-w-md mx-auto py-8 space-y-8 animate-pulse">
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
            <AppShell hideHeader>
                <PublicTopBar title="Análise" />
                <div className="max-w-md mx-auto py-8">
                    <EmptyState
                        icon={AlertCircle}
                        title="Sem dados suficientes"
                        description="Este ponto ainda não possui relatos validados para gerar estatísticas confiáveis."
                        actionLabel="Gerar primeiros dados agora"
                        onAction={() => window.location.href = '/no-ponto'}
                        secondaryActionLabel="Ver Bairros"
                        onSecondaryAction={() => window.location.href = '/bairros'}
                        samplesMissing={undefined}
                    >
                        <MetricCard
                            label="Tempo Típico"
                            value="18 min"
                            sublabel="Exemplo baseado no bairro"
                            className="w-full"
                        />
                    </EmptyState>
                </div>
            </AppShell>
        );
    }

    const { stop, metrics, lines } = data;
    const hasTrend = metrics.delta_7d_pct !== null;
    const isWorsening = hasTrend && metrics.delta_7d_pct! > 0;

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Ponto" />

            <div className="max-w-md mx-auto py-4 space-y-8">
                <PageHeader
                    title={stop.name}
                    subtitle={`${stop.neighborhood} • ID: ${stop.id.slice(0, 8)}`}
                    actions={
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${stop.is_active ? 'bg-brand/20 text-brand' : 'bg-red-500/20 text-red-400'}`}>
                                {stop.is_active ? 'MONITORADO' : 'INATIVO'}
                            </span>
                            <ShareButton
                                title={`Monitoramento: ${stop.name}`}
                                text={`Veja como está a situação da espera no ponto ${stop.name} (${stop.neighborhood}) hoje.`}
                            />
                        </div>
                    }
                />

                <div className="space-y-8">
                    {/* Main Accessible Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard
                            label="Tempo Típico"
                            value={metrics.p50_wait_min ? `${metrics.p50_wait_min}m` : '--'}
                            trend="Espera comum"
                            icon={<Timer className="text-brand/50" size={16} />}
                            hintTitle="Tempo Típico"
                            hintContent="É o tempo que o ônibus costuma levar na maior parte do dia."
                        />
                        <MetricCard
                            label="Cenário Crítico"
                            value={metrics.p90_wait_min ? `${metrics.p90_wait_min}m` : '--'}
                            trendColor="danger"
                            trend="Pior caso"
                            icon={<AlertTriangle className="text-danger/50" size={16} />}
                            hintTitle="Cenário Crítico"
                            hintContent="O pior tempo registrado. É o que você pode esperar nos piores horários."
                        />
                        <MetricCard
                            label="Confiabilidade"
                            value={data.trust_mix ? `${data.trust_mix.pct_verified}%` : metrics.samples > 20 ? 'Alta' : 'Em análise'}
                            trend={metrics.samples > 50 ? 'Auditado' : 'Consolidando'}
                            icon={<ShieldCheck className="text-emerald-500/50" size={16} />}
                            hintTitle="Confiabilidade"
                            hintContent="Quanto a gente pode confiar nos dados baseado na quantidade e frequência de relatos."
                        />
                    </div>

                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white/60"
                        >
                            {showDetails ? (
                                <>
                                    <ChevronUp size={16} />
                                    Ocultar detalhes técnicos
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={16} />
                                    Ver detalhes técnicos
                                </>
                            )}
                        </button>
                    </div>

                    {showDetails && (
                        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                            {/* Technical Trend */}
                            <MetricCard
                                label="Tendência 7D"
                                value={hasTrend ? (metrics.delta_7d_pct! > 0 ? `+${metrics.delta_7d_pct}%` : `${metrics.delta_7d_pct}%`) : 'Estável'}
                                trendColor={isWorsening ? 'danger' : 'success'}
                                trend={isWorsening ? 'Aumentando' : 'Melhorando'}
                            />

                            {/* Active Alerts */}
                            {alerts.length > 0 && (
                                <div className="space-y-3">
                                    {alerts.map(alert => (
                                        <InlineAlert
                                            key={alert.id}
                                            variant={alert.severity === 'CRIT' ? 'error' : 'warning'}
                                            title={`Alerta TÉCNICO: P50 ${alert.delta_pct}% maior`}
                                        >
                                            Tempo mediano subiu de {alert.prev_metric_p50}m para {alert.metric_p50}m.
                                        </InlineAlert>
                                    ))}
                                </div>
                            )}

                            <SectionCard title="Monitoramento Temporal" subtitle="Espera baseada no P50 das últimas 8 semanas">
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
                                                hintTitle="Relatos mínimos"
                                                hintContent="Precisamos de pelo menos 3 relatos pra mostrar uma média segura."
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

                            <SectionCard title="Itinerários do Ponto" subtitle="Linhas com amostragem consolidada">
                                <div className="space-y-3">
                                    {lines.length === 0 ? (
                                        <EmptyState
                                            icon={Bus}
                                            title="Sem Linhas Consolidadas"
                                            description="Nenhuma linha com amostragem consolidada neste ponto ainda. Seja o primeiro a auditar!"
                                            className="!py-8"
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
                    )}

                    <NextStepBlock title="Ação do Cidadão">
                        <Link href="/registrar" className="block">
                            <Button variant="primary" className="w-full justify-between group h-14" icon={<Bus className="opacity-50 group-hover:opacity-100 transition-all" />} iconPosition="right">
                                <div className="text-left">
                                    <p className="text-[8px] uppercase tracking-widest opacity-60 font-black">Auditoria</p>
                                    <p>Auditar Agora</p>
                                </div>
                            </Button>
                        </Link>

                        <Link href="/bairros" className="block">
                            <Button variant="secondary" className="w-full justify-between group h-14" icon={<BarChart3 className="opacity-50 group-hover:opacity-100 transition-all" />} iconPosition="right">
                                <div className="text-left">
                                    <p className="text-[8px] uppercase tracking-widest opacity-60">Visualizar</p>
                                    <p>Ver Ranking</p>
                                </div>
                            </Button>
                        </Link>
                    </NextStepBlock>
                </div>
            </div>
        </AppShell>
    );
}
