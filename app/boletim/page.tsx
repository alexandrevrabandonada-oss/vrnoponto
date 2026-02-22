'use client';

import { useEffect, useState } from 'react';
import {
    Download,
    Share2,
    MapPin,
    AlertCircle,
    Calendar,
    BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateBulletinCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Button, Card, Divider,
    EmptyState, SkeletonCard, SkeletonList, InlineAlert, ListItem
} from '@/components/ui';

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
            <AppShell title="BOLETIM">
                <div className="space-y-8 animate-pulse">
                    <div className="h-20 bg-white/5 rounded-3xl" />
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

    if (!data && !loading) {
        return (
            <AppShell title="BOLETIM">
                <EmptyState
                    icon={AlertCircle}
                    title="Dados Indisponíveis"
                    description="Não conseguimos consolidar o boletim para este período. Tente novamente em alguns minutos."
                    actionLabel="Tentar Novamente"
                    onAction={() => window.location.reload()}
                />
            </AppShell>
        );
    }

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

                {/* Summary Card */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="!p-6 text-center border-danger/20 bg-danger/5 group overflow-hidden relative">
                        <div className="absolute inset-0 bg-danger/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-4xl font-industrial italic text-danger relative z-10">{data?.summary.CRIT}</div>
                        <div className="text-[10px] font-black text-danger/70 uppercase mt-1 tracking-widest relative z-10">Alertas Críticos</div>
                    </Card>
                    <Card className="!p-6 text-center border-brand/20 bg-brand/5 group overflow-hidden relative">
                        <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-4xl font-industrial italic text-brand relative z-10">{data?.summary.WARN}</div>
                        <div className="text-[10px] font-black text-brand/70 uppercase mt-1 tracking-widest relative z-10">Avisos</div>
                    </Card>
                </div>

                <Divider label="KIT PARA COMPARTILHAR" />

                {/* Editorial Kit */}
                {data && (
                    <EditorialCard
                        data={data}
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
                    {data?.worstStops.length === 0 ? (
                        <EmptyState
                            icon={BarChart3}
                            title="Sem ocorrências"
                            description="Nenhum ponto de ônibus atingiu o limite de alerta no período selecionado."
                        />
                    ) : (
                        data?.worstStops.map(stop => (
                            <ListItem
                                key={stop.stop_id}
                                icon={<MapPin size={18} />}
                                title={stop.stop_name}
                                subtitle={`Vila Rica - Auditoria Popular`}
                                extra={
                                    <div className="text-right">
                                        <div className="text-lg font-industrial text-danger italic leading-none">{stop.p50_wait_min}m</div>
                                        <div className="text-[8px] font-black text-muted uppercase tracking-tight opacity-40">Espera Média</div>
                                    </div>
                                }
                                onClick={() => window.location.href = `/ponto/${stop.stop_id}`}
                            />
                        ))
                    )}
                </div>

                <Divider label="CRÍTICAS RECENTES" />

                <div className="space-y-4">
                    {(data?.topAlertsCrit.concat(data?.topAlertsWarn) ?? []).slice(0, 5).map(alert => (
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
                            alert('LINK COPIADO!');
                        }}
                        className="w-full !bg-black !text-white h-14"
                    >
                        Copiar Link do Boletim
                    </Button>
                </Card>
            </div>
        </AppShell>
    );
}
