'use client';

import { useEffect, useState } from 'react';
import { useParams as useNextParams } from 'next/navigation';
import { Sparkline } from '@/components/metrics/Sparkline';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { Clock, TrendingUp, Users, Zap, FileText, BarChart3, AlertCircle, Bus } from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateLineCaption } from '@/lib/editorial/templates';
import { PromisedVsRealCard } from '@/components/PromisedVsRealCard';
import {
    AppShell, PageHeader, Card, Divider, Button,
    SkeletonCard, SkeletonList, EmptyState, InlineAlert, ListItem, MetricRow, Skeleton, MetricCard, SectionCard, SecondaryCTA
} from '@/components/ui';
import { FollowButton, FollowBadge } from '@/components/push/FollowButton';
import { FavoriteToggle } from '@/components/FavoriteToggle';

type WeeklyHeadway = {
    week_start: string;
    p50_headway_min: number;
    p90_headway_min: number;
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

interface Line {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
}

export default function LinhaDetails() {
    const params = useNextParams();
    const lineId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [line, setLine] = useState<Line | null>(null);
    const [weekly, setWeekly] = useState<WeeklyHeadway[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [trustMix, setTrustMix] = useState<{ total_events: number; pct_verified: number } | null>(null);
    const [schedules, setSchedules] = useState<{ id: string; title?: string; valid_from?: string; doc_type?: string; pdf_path?: string }[]>([]);

    useEffect(() => {
        if (!lineId) return;

        async function fetchData() {
            setLoading(true);
            try {
                const [lineRes, weeklyRes, alertsRes, trustMixRes, schedulesRes] = await Promise.all([
                    fetch(`/api/lines/${lineId}`),
                    fetch(`/api/timeseries/line?line_id=${lineId}&weeks=8`),
                    fetch(`/api/alerts?days=30`),
                    fetch(`/api/trust-mix/line/${lineId}`),
                    fetch(`/api/schedules/line/${lineId}`)
                ]);

                if (lineRes.ok) setLine(await lineRes.json());
                if (weeklyRes.ok) setWeekly(await weeklyRes.json());
                if (alertsRes.ok) {
                    const allAlerts = await alertsRes.json();
                    setAlerts(allAlerts.filter((a: { target_id: string; alert_type: string; }) => a.target_id === lineId && a.alert_type === 'LINE_HEADWAY'));
                }
                if (trustMixRes.ok) setTrustMix(await trustMixRes.json());
                if (schedulesRes.ok) setSchedules(await schedulesRes.json());
            } catch (err) {
                console.error('Error fetching line details:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [lineId]);

    if (loading && !line) {
        return (
            <AppShell title="ANÁLISE">
                <div className="space-y-8 animate-pulse">
                    <div className="h-12 w-1/3 bg-white/5 rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                    <Skeleton className="h-48 w-full rounded-3xl" />
                    <SkeletonList items={5} />
                </div>
            </AppShell>
        );
    }

    if (!line) {
        return (
            <AppShell title="ANÁLISE">
                <EmptyState
                    icon={AlertCircle}
                    title="Linha não encontrada"
                    description="Não conseguimos localizar os registros desta linha no sistema."
                    actionLabel="Ver Ranking"
                    onAction={() => window.location.href = '/painel'}
                />
            </AppShell>
        );
    }

    const lastWeekly = weekly[weekly.length - 1];
    const prevWeekly = weekly[weekly.length - 2];
    const delta = (lastWeekly && prevWeekly) ? Math.round(((lastWeekly.p50_headway_min - prevWeekly.p50_headway_min) / prevWeekly.p50_headway_min) * 100) : null;
    const isWorsening = delta !== null && delta > 0;

    return (
        <AppShell
            title="ANÁLISE DE LINHA"
            actions={
                <div className="flex items-center gap-2">
                    <FavoriteToggle type="line" id={lineId} label={line?.code || 'Linha'} />
                    <FollowButton type="line" id={lineId} label={line?.code} />
                    {trustMix && <TrustMixBadge total={trustMix.total_events} pctVerified={trustMix.pct_verified} />}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${line.is_active ? 'bg-brand/20 text-brand' : 'bg-red-500/20 text-red-400'}`}>
                        {line.is_active ? 'EM OPERAÇÃO' : 'DESATIVADA'}
                    </span>
                </div>
            }
        >
            <PageHeader
                title={line.code}
                subtitle={line.name}
            />

            <div className="mb-6 flex justify-center">
                <FollowBadge />
            </div>

            <div className="space-y-8">
                {/* Active Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <InlineAlert
                                key={alert.id}
                                variant={alert.severity === 'CRIT' ? 'error' : 'warning'}
                                title="Alerta de Confiabilidade"
                            >
                                Intervalo subiu <span className="text-white">+{alert.delta_pct}%</span> nesta semana ({alert.metric_p50}m) vs anterior.
                            </InlineAlert>
                        ))}
                    </div>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Intervalo P50"
                        value={lastWeekly?.p50_headway_min ? `${lastWeekly.p50_headway_min}m` : '--'}
                        trend="Frequência Típica"
                    />
                    <MetricCard
                        label="Amostras"
                        value={lastWeekly?.samples || 0}
                    />
                    <MetricCard
                        label="Variação 7D"
                        value={delta !== null ? (delta > 0 ? `+${delta}%` : `${delta}%`) : 'Estável'}
                        trendColor={isWorsening ? 'danger' : 'success'}
                        trend={isWorsening ? 'Aumentando' : 'Melhorando'}
                    />
                    <MetricCard
                        label="Status"
                        value={line.is_active ? 'ATIVO' : 'STANDBY'}
                        trendColor={line.is_active ? 'brand' : 'muted'}
                    />
                </div>

                <Divider label="COMPARAÇÃO OFICIAL (DOMED)" />
                <PromisedVsRealCard lineId={lineId} />

                <SectionCard title="Intervalos Temporais" subtitle="Frequência média nas últimas 8 semanas">
                    <div className="divide-y divide-white/5 -mx-4 -mb-4">
                        {weekly.length === 0 ? (
                            <EmptyState
                                icon={BarChart3}
                                title="Histórico Vazio"
                                description="Não há amostras suficientes para gerar o gráfico de tendência desta linha. Audite hoje!"
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
                                    value={w.p50_headway_min}
                                    unit="min"
                                    trend={{
                                        value: `${w.samples} amostras`,
                                        isPositive: w.samples > 50
                                    }}
                                />
                            ))
                        )}
                    </div>
                </SectionCard>

                <SectionCard title="Documentos Oficiais" subtitle="Quadros de horários e itinerários">
                    <div className="space-y-3">
                        {schedules.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="Sem Documentos"
                                description="Nenhum quadro de horários oficial foi anexado para esta linha. Solicite ao movimento se necessário."
                                actionLabel="Registrar Ponto"
                                onAction={() => window.location.href = '/no-ponto'}
                                secondaryActionLabel="Ver Bairros"
                                onSecondaryAction={() => window.location.href = '/bairros'}
                            />
                        ) : (
                            schedules.map((sched) => {
                                const isHorario = !sched.doc_type || sched.doc_type === 'HORARIO';
                                return (
                                    <ListItem
                                        key={sched.id}
                                        icon={<FileText size={18} className={isHorario ? 'text-brand' : 'text-muted'} />}
                                        title={sched.title || 'Quadro de Horários'}
                                        subtitle={sched.valid_from ? `Vigência: ${new Date(sched.valid_from).toLocaleDateString('pt-BR')}` : 'Vigência não informada'}
                                        extra={
                                            <SecondaryCTA
                                                className="!h-10 !px-4 !text-[10px] !w-auto shadow-none"
                                                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/official/${sched.pdf_path}`}
                                                target="_blank"
                                            >
                                                PDF
                                            </SecondaryCTA>
                                        }
                                    />
                                );
                            })
                        )}
                    </div>
                </SectionCard>

                <Divider label="AÇÃO POPULAR" />
                <EditorialCard
                    data={{ line, metrics: lastWeekly }}
                    generator={(d, t) => generateLineCaption(d.line, d.metrics, t)}
                    title="Kit de Denúncia Social"
                />

                <Card className="!p-8 bg-brand border-brand overflow-hidden relative group cursor-pointer" onClick={() => window.location.href = '/registrar'}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Bus size={120} className="text-black" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-black font-industrial text-2xl italic leading-none uppercase">Auditar Linha Agora</h3>
                        <p className="text-[11px] text-black font-black leading-relaxed uppercase tracking-tight max-w-sm">
                            A sua voz é técnica. Registre o intervalo real deste ônibus e ajude a fortalecer a auditoria comunitária de Volta Redonda.
                        </p>
                        <div className="inline-flex items-center gap-2 bg-black text-brand px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-2xl">
                            Validar Horário
                        </div>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
