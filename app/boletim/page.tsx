'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Download,
    Share2,
    MapPin,
    AlertCircle,
    BarChart3,
    ArrowRight,
} from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateBulletinCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Button, Card, Divider,
    EmptyState, SkeletonCard, SkeletonBlock, SkeletonList, InlineAlert, ListItem, MetricRow
} from '@/components/ui';
import { t } from '@/lib/copy';

interface BulletinData {
    ok: boolean;
    generatedAt: string;
    periodDays: number;
    summary: {
        samplesTotal: number;
        critCount: number;
        warnCount: number;
        infoCount: number;
    } | null;
    topAlertsCrit: { id: string; severity: string; alert_type: string; delta_pct: number; target_id: string }[];
    topAlertsWarn: { id: string; severity: string; alert_type: string; delta_pct: number; target_id: string }[];
    worstStops: { stop_id: string; stop_name: string; p50_wait_min: number }[];
    worstLines: { line_id: string; p50_headway_min: number }[];
    worstNeighborhoods: { neighborhood: string; avg_delta_min: number; stops_count: number; samples_total: number }[];
    notes: string[];
}

export default function BoletimPage() {
    const [days, setDays] = useState(7);
    const [data, setData] = useState<BulletinData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/bulletin?days=${days}`);
                const json = await res.json();

                if (!json || typeof json.ok === 'undefined') {
                    throw new Error('Formato de resposta inesperado');
                }

                setData(json);
            } catch (err) {
                console.error('Error fetching bulletin:', err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar boletim');

                // Log to telemetry (fire-and-forget)
                fetch('/api/telemetry', {
                    method: 'POST',
                    body: JSON.stringify({ event: 'client_error_boletim' }),
                }).catch(() => { });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [days]);

    const handleDownload = (format: 'square' | 'story') => {
        window.open(`/api/bulletin/card?format=${format}&days=${days}`, '_blank');
    };

    // Loading skeleton
    if (loading && !data) {
        return (
            <AppShell title="BOLETIM">
                <div className="space-y-8">
                    <SkeletonBlock className="!h-20 w-full !rounded-3xl" />
                    <SkeletonCard />
                    <div className="grid grid-cols-2 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                    <Divider label="CARREGANDO AUDITORIA" />
                    <SkeletonList items={5} />
                </div>
            </AppShell>
        );
    }

    // Error state
    if (error || (!data && !loading)) {
        return (
            <AppShell title="BOLETIM">
                <EmptyState
                    icon={AlertCircle}
                    title="Dados Indisponíveis"
                    description={error || 'Não conseguimos consolidar o boletim para este período. Tente novamente em alguns minutos.'}
                    actionLabel="Tentar Novamente"
                    onAction={() => window.location.reload()}
                />
            </AppShell>
        );
    }

    // Check if data has meaningful content
    const hasAlerts = (data?.topAlertsCrit?.length ?? 0) > 0 || (data?.topAlertsWarn?.length ?? 0) > 0;
    const hasStops = (data?.worstStops?.length ?? 0) > 0;
    const hasNotes = (data?.notes?.length ?? 0) > 0;
    const isEmpty = !hasAlerts && !hasStops && (data?.summary?.samplesTotal ?? 0) === 0;

    return (
        <AppShell title="BOLETIM DE TRANSPARÊNCIA">
            <PageHeader
                title="Boletim VR"
                subtitle="Dados consolidados da auditoria popular"
            />

            <div className="space-y-8">
                {/* Period Selector */}
                <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 gap-1">
                    {[7, 14, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`flex-1 py-3 px-4 rounded-xl font-industrial text-[10px] uppercase tracking-[0.2em] transition-all ${days === d
                                ? 'bg-brand text-black shadow-lg shadow-brand/20 font-black'
                                : 'text-muted hover:bg-white/5'
                                }`}
                        >
                            {d} dias
                        </button>
                    ))}
                </div>

                {/* Notes from API */}
                {hasNotes && data?.notes?.map((note, i) => (
                    <InlineAlert key={i} variant="warning" title="Aviso">
                        {note}
                    </InlineAlert>
                ))}

                {/* Empty state */}
                {isEmpty ? (
                    <Card className="!p-10 text-center border-dashed border-white/10 bg-white/[0.01]">
                        <BarChart3 size={32} className="mx-auto mb-4 text-white/20" />
                        <h2 className="font-industrial text-lg uppercase tracking-widest text-white/70 mb-2">
                            Ainda sem amostra suficiente
                        </h2>
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-tight mb-8 max-w-xs mx-auto">
                            Não há dados de auditoria suficientes para gerar o boletim neste período. Ajude registrando horários!
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                            <Link href="/no-ponto">
                                <Button className="!text-[11px]" icon={<ArrowRight size={14} />} iconPosition="right">
                                    Estou no Ponto
                                </Button>
                            </Link>
                            <Link href="/como-usar">
                                <Button variant="secondary" className="!text-[11px]">
                                    Como Usar
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Summary Card */}
                        {data?.summary && (
                            <Card className="!p-4 border-white/5 space-y-1">
                                <MetricRow
                                    label={t('alerts.critical')}
                                    value={data.summary.critCount}
                                    tone="danger"
                                    sublabel={t('status.bad')}
                                />
                                <MetricRow
                                    label={t('alerts.warning')}
                                    value={data.summary.warnCount}
                                    tone="brand"
                                    sublabel={t('status.delay')}
                                />
                            </Card>
                        )}

                        <Divider label="KIT PARA COMPARTILHAR" />

                        {/* Editorial Kit */}
                        {data && (
                            <EditorialCard
                                data={{
                                    summary: {
                                        total: data.summary?.samplesTotal ?? 0,
                                        crit_count: data.summary?.critCount ?? 0,
                                        warn_count: data.summary?.warnCount ?? 0,
                                    },
                                    worstStops: data.worstStops,
                                    worstLines: data.worstLines,
                                }}
                                generator={generateBulletinCaption}
                                title="Legenda para Redes Sociais"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="secondary"
                                onClick={() => handleDownload('square')}
                                className="h-16 !text-[11px]"
                            >
                                <Download size={18} className="mr-2" /> Feed (1:1)
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => handleDownload('story')}
                                className="h-16 !text-[11px]"
                            >
                                <Download size={18} className="mr-2" /> Story (9:16)
                            </Button>
                        </div>

                        <Divider label="PIORES PONTOS (RANKING)" />

                        <div className="space-y-3">
                            {(data?.worstStops?.length ?? 0) === 0 ? (
                                <EmptyState
                                    icon={BarChart3}
                                    title="Sem ocorrências"
                                    description="Nenhum ponto de ônibus atingiu o limite de alerta no período selecionado."
                                />
                            ) : (
                                data?.worstStops.map(stop => (
                                    <ListItem
                                        key={stop.stop_id}
                                        leftIcon={<MapPin size={18} />}
                                        title={stop.stop_name}
                                        description={t('samples.audit')}
                                        tone="danger"
                                        rightElement={
                                            <div className="text-right">
                                                <div className="text-lg font-industrial italic leading-none">{stop.p50_wait_min}m</div>
                                                <div className="text-[8px] font-black uppercase tracking-tight opacity-50">{t('wait.median')}</div>
                                            </div>
                                        }
                                        href={`/ponto/${stop.stop_id}`}
                                    />
                                ))
                            )}
                        </div>

                        {/* Critical Alerts */}
                        {hasAlerts && (
                            <>
                                <Divider label="CRÍTICAS RECENTES" />
                                <div className="space-y-4">
                                    {[...(data?.topAlertsCrit || []), ...(data?.topAlertsWarn || [])].slice(0, 5).map(alert => (
                                        <InlineAlert
                                            key={alert.id}
                                            variant={alert.severity === 'CRIT' ? 'error' : 'warning'}
                                            title={alert.alert_type === 'STOP_WAIT' ? 'Espera Crítica Detectada' : 'Baixa Frequência'}
                                        >
                                            Aumento de <span className="text-white">+{alert.delta_pct}%</span> no tempo de espera observado pela comunidade. <br />
                                            <button
                                                onClick={() => window.location.href = alert.alert_type === 'STOP_WAIT' ? `/ponto/${alert.target_id}` : `/linha/${alert.target_id}`}
                                                className="mt-2 text-[9px] font-black underline underline-offset-2 hover:text-white transition-colors"
                                            >
                                                VER DETALHES DA AUDITORIA →
                                            </button>
                                        </InlineAlert>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Shared Call to Action */}
                <Card className="!p-8 bg-brand text-black text-center flex flex-col items-center border-none shadow-2xl shadow-brand/10">
                    <Share2 className="mb-4 opacity-40" size={32} />
                    <h3 className="text-2xl font-industrial italic leading-none mb-2 uppercase">Transparência Coletiva</h3>
                    <p className="text-[11px] font-bold mb-6 max-w-xs opacity-70 leading-relaxed uppercase tracking-tight">
                        Seu registro vira auditoria. Compartilhe o boletim para pressionar por melhorias reais no sistema.
                    </p>
                    <Button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        className="w-full !bg-black !text-white h-14"
                    >
                        {copied ? 'Link Copiado!' : 'Copiar Link do Boletim'}
                    </Button>
                </Card>
            </div>
        </AppShell>
    );
}
