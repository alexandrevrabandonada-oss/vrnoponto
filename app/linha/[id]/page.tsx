'use client';

import { useEffect, useState } from 'react';
import { useParams as useNextParams } from 'next/navigation';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { FileText, BarChart3, AlertCircle, Bus } from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateLineCaption } from '@/lib/editorial/templates';
import { PromisedVsRealCard } from '@/components/PromisedVsRealCard';
import {
    AppShell, PageHeader, Divider, Button,
    SkeletonCard, SkeletonList, EmptyState, InlineAlert, ListItem, MetricRow, Skeleton, MetricCard, SectionCard, SecondaryCTA,
    PublicTopBar, NextStepBlock
} from '@/components/ui';
import { FollowButton, FollowBadge } from '@/components/push/FollowButton';
import { FavoriteToggle } from '@/components/FavoriteToggle';
import { ShareButton } from '@/components/ShareButton';
import Link from 'next/link';

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
            <AppShell hideHeader>
                <PublicTopBar title="Análise" />
                <div className="max-w-md mx-auto py-8 space-y-8 animate-pulse">
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
            <AppShell hideHeader>
                <PublicTopBar title="Análise" />
                <div className="max-w-md mx-auto py-8">
                    <EmptyState
                        icon={AlertCircle}
                        title="Sem Dados de Frequência"
                        description="Esta linha ainda não possui auditorias suficientes para o cálculo de frequência real."
                        actionLabel="Gerar primeiros dados agora"
                        actionHref="/no-ponto"
                        secondaryActionLabel="Ver Ranking"
                        secondaryActionHref="/bairros"
                        samplesMissing={undefined}
                    >
                        <MetricCard
                            label="Frequência Média"
                            value="25 min"
                            sublabel="Exemplo ilustrativo"
                            className="w-full"
                        />
                    </EmptyState>
                </div>
            </AppShell>
        );
    }

    const lastWeekly = weekly[weekly.length - 1];
    const prevWeekly = weekly[weekly.length - 2];
    const delta = (lastWeekly && prevWeekly) ? Math.round(((lastWeekly.p50_headway_min - prevWeekly.p50_headway_min) / prevWeekly.p50_headway_min) * 100) : null;
    const isWorsening = delta !== null && delta > 0;

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Linha" />

            <div className="max-w-md mx-auto py-4 space-y-8">
                <PageHeader
                    title={line.code}
                    subtitle={line.name}
                    actions={
                        <div className="flex items-center gap-2">
                            <FavoriteToggle type="line" id={lineId} label={line?.code || 'Linha'} />
                            <FollowButton type="line" id={lineId} label={line?.code} />
                            {trustMix && <TrustMixBadge total={trustMix.total_events} pctVerified={trustMix.pct_verified} />}
                            <ShareButton
                                title={`Linha: ${line.code}`}
                                text={`Confira os dados reais de espera da linha ${line.code} (${line.name}) em VR.`}
                            />
                        </div>
                    }
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
                            hintTitle="Tempo típico"
                            hintContent="É o intervalo mais comum entre ônibus nesta linha."
                        />
                        <MetricCard
                            label="Amostras"
                            value={lastWeekly?.samples || 0}
                            hintTitle="Amostra mínima"
                            hintContent="Com poucos registros, este número pode variar mais."
                        />
                        <MetricCard
                            label="Variação 7D"
                            value={delta !== null ? (delta > 0 ? `+${delta}%` : `${delta}%`) : 'Estável'}
                            trendColor={isWorsening ? 'danger' : 'success'}
                            trend={isWorsening ? 'Aumentando' : 'Melhorando'}
                            hintTitle="Cenário crítico"
                            hintContent="Quando essa variação sobe muito, a espera tende a piorar."
                        />
                        <MetricCard
                            label="Status"
                            value={line.is_active ? 'ATIVO' : 'STANDBY'}
                            trendColor={line.is_active ? 'brand' : 'muted'}
                            hintTitle="Confiabilidade"
                            hintContent="Linha ativa costuma ter leitura mais consistente no sistema."
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
                                    className="!py-8"
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
