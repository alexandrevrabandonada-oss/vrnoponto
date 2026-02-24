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
    MessageCircle,
    Bus,
} from 'lucide-react';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateBulletinCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Button, Card, Divider,
    EmptyState, SkeletonCard, SkeletonBlock, SkeletonList, InlineAlert, ListItem, MetricRow, MetricCard, SectionCard, SecondaryCTA,
    PublicTopBar, NextStepBlock
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
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: `bulletin_card_download_${format}` }),
        }).catch(() => { });
    };

    const handleWhatsAppShare = () => {
        if (!data) return;

        const shortCaption = `${data.summary?.critCount || 0} alertas críticos em VR esta semana. Pior ponto: ${data.worstStops?.[0]?.stop_name || '--'}.`;
        const url = window.location.href;
        const text = `${shortCaption}\n\nConfira o boletim completo em: ${url}`;

        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'bulletin_share_wa' }),
        }).catch(() => { });

        if (navigator.share) {
            navigator.share({
                title: 'Boletim VR no Ponto',
                text: text,
                url: url
            }).catch(() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    // Loading skeleton
    if (loading && !data) {
        return (
            <AppShell hideHeader>
                <PublicTopBar title="Boletim" />
                <div className="max-w-md mx-auto py-8 space-y-8">
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
            <AppShell hideHeader>
                <PublicTopBar title="Boletim" />
                <div className="max-w-md mx-auto py-8">
                    <EmptyState
                        icon={AlertCircle}
                        title="Dados Indisponíveis"
                        description={error || 'Não conseguimos consolidar o boletim para este período. Tente novamente em alguns minutos.'}
                        actionLabel="Tentar Novamente"
                        onAction={() => window.location.reload()}
                    />
                </div>
            </AppShell>
        );
    }

    // Check if data has meaningful content
    const hasAlerts = (data?.topAlertsCrit?.length ?? 0) > 0 || (data?.topAlertsWarn?.length ?? 0) > 0;
    const hasStops = (data?.worstStops?.length ?? 0) > 0;
    const hasNotes = (data?.notes?.length ?? 0) > 0;
    const isEmpty = !hasAlerts && !hasStops && (data?.summary?.samplesTotal ?? 0) === 0;

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Boletim" />
            <div className="max-w-md mx-auto py-4 space-y-8">
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
                        <EmptyState
                            icon={BarChart3}
                            title="Ainda sem amostra suficiente"
                            description="Não há dados de auditoria suficientes para gerar o boletim neste período. Colabore com pelo menos 3 registros hoje!"
                            actionLabel="Auditar Ponto"
                            onAction={() => window.location.href = '/no-ponto'}
                            secondaryActionLabel="Como Funciona"
                            onSecondaryAction={() => window.location.href = '/como-usar'}
                        />
                    ) : (
                        <>
                            {/* Summary Card */}
                            {data?.summary && (
                                <div className="grid grid-cols-2 gap-4">
                                    <MetricCard
                                        label={t('alerts.critical')}
                                        value={data.summary.critCount}
                                        trendColor="danger"
                                        trend={t('status.bad')}
                                    />
                                    <MetricCard
                                        label={t('alerts.warning')}
                                        value={data.summary.warnCount}
                                        trendColor="brand"
                                        trend={t('status.delay')}
                                    />
                                </div>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <SecondaryCTA
                                    onClick={() => handleDownload('square')}
                                    className="!h-14 shadow-none"
                                    icon={<Download size={18} />}
                                >
                                    Card Feed (1:1)
                                </SecondaryCTA>
                                <SecondaryCTA
                                    onClick={() => handleDownload('story')}
                                    className="!h-14 shadow-none"
                                    icon={<Download size={18} />}
                                >
                                    Card Story (9:16)
                                </SecondaryCTA>
                                <Button
                                    onClick={handleWhatsAppShare}
                                    className="w-full h-14 !text-[10px] font-black uppercase tracking-widest !bg-[#25D366] !text-white border-none shadow-lg shadow-[#25D366]/20"
                                    icon={<MessageCircle size={18} />}
                                >
                                    WhatsApp
                                </Button>
                            </div>

                            <SectionCard title="Piores Pontos" subtitle="Ranking de espera crítica">
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
                                                        <div className="text-lg font-industrial italic leading-none text-danger">{stop.p50_wait_min}m</div>
                                                        <div className="text-[8px] font-black uppercase tracking-tight opacity-50">{t('wait.median')}</div>
                                                    </div>
                                                }
                                                href={`/ponto/${stop.stop_id}`}
                                            />
                                        ))
                                    )}
                                </div>
                            </SectionCard>

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

                    {/* Shared Call to Action replaced by NextStepBlock */}
                    <NextStepBlock title="Ação Coletiva">
                        <Link href="/no-ponto" className="block">
                            <Button variant="primary" className="w-full justify-between group h-14" icon={<Bus className="opacity-50 group-hover:opacity-100 transition-all" />} iconPosition="right">
                                <div className="text-left">
                                    <p className="text-[8px] uppercase tracking-widest opacity-60 font-black">Funil</p>
                                    <p>Auditar Agora</p>
                                </div>
                            </Button>
                        </Link>

                        <Button
                            variant="secondary"
                            className="w-full justify-between group h-14"
                            icon={<Share2 className="opacity-50 group-hover:opacity-100 transition-all" />}
                            iconPosition="right"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                        >
                            <div className="text-left">
                                <p className="text-[8px] uppercase tracking-widest opacity-60">Impacto</p>
                                <p>{copied ? 'Link Copiado!' : 'Copiar Link'}</p>
                            </div>
                        </Button>
                    </NextStepBlock>
                </div>
            </div>
        </AppShell>
    );
}
