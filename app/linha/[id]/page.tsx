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
    SkeletonCard, SkeletonList, EmptyState, InlineAlert, ListItem, MetricRow, Skeleton
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
                    <Card className="text-center group hover:border-brand/20 transition-all border-white/5">
                        <Clock size={16} className="mx-auto mb-2 text-muted" />
                        <div className="text-2xl font-industrial italic text-brand">
                            {lastWeekly?.p50_headway_min ? `${lastWeekly.p50_headway_min}M` : '--'}
                        </div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Intervalo P50</div>
                    </Card>
                    <Card className="text-center transition-all border-white/5">
                        <Users size={16} className="mx-auto mb-2 text-muted" />
                        <div className="text-2xl font-industrial text-white">{lastWeekly?.samples || 0}</div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Amostras</div>
                    </Card>
                    <Card className={`text-center transition-all border-white/5 ${isWorsening ? 'border-danger/20 bg-danger/5' : ''}`}>
                        <TrendingUp size={16} className={`mx-auto mb-2 ${isWorsening ? 'text-danger' : 'text-emerald-500'}`} />
                        <div className={`text-xl font-industrial italic ${isWorsening ? 'text-danger' : 'text-emerald-500'}`}>
                            {delta !== null ? (delta > 0 ? `+${delta}%` : `${delta}%`) : 'Estável'}
                        </div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Variação 7D</div>
                    </Card>
                    <Card className="text-center transition-all border-brand/10 bg-brand/5">
                        <Zap size={16} className="mx-auto mb-2 text-brand" />
                        <div className="text-2xl font-industrial text-brand">{line.is_active ? 'ATIVO' : 'STANDBY'}</div>
                        <div className="text-[9px] font-black text-brand/40 uppercase tracking-widest mt-1">Status</div>
                    </Card>
                </div>

                <Divider label="COMPARAÇÃO OFICIAL (DOMED)" />
                <PromisedVsRealCard lineId={lineId} />

                <Divider label="FLUXO DE INTERVALOS" />
                <Card className="!p-0 border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="space-y-1">
                            <h3 className="font-industrial text-xs tracking-widest uppercase text-white/80">Monitoramento Temporal</h3>
                            <p className="text-[9px] font-black text-muted uppercase">Baseado nas últimas 8 semanas de auditoria</p>
                        </div>
                        {weekly.length >= 2 && (
                            <div className="bg-white/5 p-2 rounded-xl">
                                <Sparkline
                                    data={weekly.map(w => ({ week_start: w.week_start, value: w.p50_headway_min, p90: w.p90_headway_min }))}
                                    width={120}
                                    height={24}
                                    color={isWorsening ? '#ef4444' : '#FFCC00'}
                                />
                            </div>
                        )}
                    </div>
                    <div className="divide-y divide-white/5">
                        {weekly.length === 0 ? (
                            <EmptyState
                                icon={BarChart3}
                                title="Histórico Vazio"
                                description="Não há amostras suficientes para gerar o gráfico de tendência desta linha."
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
                </Card>

                <Divider label="DOCUMENTAÇÃO OFICIAL" />
                <div className="space-y-3">
                    {schedules.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Sem Documentos"
                            description="Nenhum quadro de horários oficial foi anexado para esta linha."
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
                                        <Button
                                            variant="secondary"
                                            className="!h-10 !px-4 !text-[10px]"
                                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/official/${sched.pdf_path}`}
                                            target="_blank"
                                        >
                                            PDF
                                        </Button>
                                    }
                                />
                            );
                        })
                    )}
                </div>

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
