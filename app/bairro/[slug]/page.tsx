'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Bus, History as HistoryIcon, AlertCircle, BarChart3
} from 'lucide-react';
import {
    AppShell, PageHeader, Button, Card,
    EmptyState, SkeletonBlock, SkeletonCard, SkeletonList, ListItem, MetricRow, MetricCard, SectionCard,
    PublicTopBar, NextStepBlock, Sparkline
} from '@/components/ui';
import { FollowButton, FollowBadge } from '@/components/push/FollowButton';
import { FavoriteToggle } from '@/components/FavoriteToggle';
import { ShareButton } from '@/components/ShareButton';
import { t } from '@/lib/copy';

type Summary = { neighborhood: string; avg_delta_min: number | null; stops_count: number; samples_total: number; pct_verified_avg: number };
type StopRow = { stop_id: string; stop_name: string; worst_delta_min: number; avg_delta_min: number; samples_total: number; pct_verified_avg: number };
type LineRow = { line_id: string; line_code: string; line_name: string; avg_delta_min: number; samples_total: number; pct_verified_avg: number };
type MonthlyHistoryItem = { month_start: string; neighborhood_norm: string; avg_delta_min: number; samples_total: number; pct_verified_avg: number };

export default function BairroDetailPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const neighborhoodName = decodeURIComponent(slug || '');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ summary: Summary; topStops: StopRow[]; topLines: LineRow[] } | null>(null);
    const [history, setHistory] = useState<MonthlyHistoryItem[]>([]);

    useEffect(() => {
        if (!slug) return;

        async function fetchData() {
            setLoading(true);
            try {
                const [detailRes, historyRes] = await Promise.all([
                    fetch(`/api/neighborhood/detail?name=${encodeURIComponent(neighborhoodName)}`),
                    fetch(`/api/neighborhood/history?slug=${encodeURIComponent(slug)}`)
                ]);

                if (detailRes.ok) {
                    const detailJson = await detailRes.json();
                    setData(detailJson);
                }

                if (historyRes.ok) {
                    const historyJson = await historyRes.json();
                    setHistory(historyJson.data || []);
                }
            } catch (err) {
                console.error('Error fetching neighborhood detail:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [slug, neighborhoodName]);

    if (loading && !data) {
        return (
            <AppShell hideHeader>
                <PublicTopBar title="Diagnóstico" />
                <div className="max-w-md mx-auto py-8 space-y-8">
                    <SkeletonBlock className="!h-12 w-2/3 !rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                    <SkeletonCard />
                    <SkeletonList items={5} />
                </div>
            </AppShell>
        );
    }

    if (!data) {
        return (
            <AppShell hideHeader>
                <PublicTopBar title="Diagnóstico" />
                <div className="max-w-md mx-auto py-8">
                    <EmptyState
                        icon={AlertCircle}
                        title="Bairro não encontrado"
                        description="Não conseguimos localizar os dados para este bairro no sistema."
                        actionLabel="Voltar ao Ranking"
                        onAction={() => window.location.href = '/bairros'}
                    />
                </div>
            </AppShell>
        );
    }

    const { summary, topStops, topLines } = data;
    const sparkData = history.map((h: MonthlyHistoryItem) => h.avg_delta_min);

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Bairro" />

            <div className="max-w-md mx-auto py-4 space-y-8">
                <PageHeader
                    title={summary.neighborhood}
                    subtitle="Prometido vs Real nos últimos 30 dias"
                    actions={
                        <div className="flex items-center gap-2">
                            <FavoriteToggle type="neighborhood" id={slug} label={summary.neighborhood} />
                            <FollowButton
                                type="neighborhood"
                                id={summary.neighborhood.toLowerCase().trim()}
                                label={summary.neighborhood}
                            />
                            <ShareButton
                                title={`Ranking: ${summary.neighborhood}`}
                                text={`Veja o ranking de mobilidade do bairro ${summary.neighborhood} em Volta Redonda.`}
                            />
                        </div>
                    }
                />

                <div className="mb-6 flex justify-center">
                    <FollowBadge />
                </div>

                <div className="space-y-8">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            label="Atraso Médio"
                            value={summary.avg_delta_min !== null ? `+${summary.avg_delta_min}m` : '--'}
                            trend="Real vs Oficial"
                            hintTitle="Tempo típico"
                            hintContent="Mostra o atraso comum que as pessoas enfrentam no bairro."
                        />
                        <MetricCard
                            label="Pontos"
                            value={summary.stops_count}
                            hintTitle="Amostra mínima"
                            hintContent="Mais pontos com relatos deixam o retrato do bairro mais estável."
                        />
                        <MetricCard
                            label="Auditado"
                            value={summary.samples_total}
                            hintTitle="Amostra mínima"
                            hintContent="Com mais relatos, o resultado fica mais confiável."
                        />
                        <MetricCard
                            label="Confiança"
                            value={`${summary.pct_verified_avg}%`}
                            trendColor="success"
                            trend="Dados Coesos"
                            hintTitle="Confiabilidade"
                            hintContent="Indica quanto dos relatos foi confirmado por cruzamento."
                        />
                    </div>

                    {/* Monthly Performance */}
                    <Card className="!p-0 overflow-hidden border-white/5">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                                <HistoryIcon size={18} className="text-brand opacity-60" />
                                <h2 className="font-industrial text-sm uppercase tracking-widest text-white">Performance Histórica</h2>
                            </div>
                            {sparkData.length > 1 && (
                                <div className="hidden sm:block">
                                    <Sparkline data={sparkData} width={100} height={24} color="#FFCC00" showPoints={false} />
                                </div>
                            )}
                        </div>
                        <div className="divide-y divide-white/5">
                            {history.length === 0 ? (
                                <EmptyState
                                    icon={HistoryIcon}
                                    title="Sem Histórico"
                                    description="Não há dados consolidados suficientes para este bairro."
                                    className="!py-12"
                                />
                            ) : (
                                history.slice(-6).reverse().map((h: MonthlyHistoryItem, i: number) => {
                                    const prev = history[history.length - (history.length > 6 ? 6 - i : history.length - i) - 1];
                                    const diff = prev ? h.avg_delta_min - prev.avg_delta_min : null;
                                    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(h.month_start + 'T12:00:00Z'));

                                    return (
                                        <MetricRow
                                            key={h.month_start}
                                            label={`${monthName} / ${new Date(h.month_start).getFullYear()}`}
                                            value={`+${h.avg_delta_min}`}
                                            sublabel="min"
                                            delta={diff && diff < 0 ? 'positive' : diff && diff > 0 ? 'negative' : 'neutral'}
                                            deltaLabel={diff ? `${Math.abs(diff).toFixed(1)}m` : 'estável'}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </Card>

                    {/* Top Critical Stops */}
                    <SectionCard title="Pontos Mais Críticos" subtitle="Onde o atraso é mais frequente">
                        <div className="space-y-3">
                            {topStops.length === 0 ? (
                                <EmptyState
                                    icon={BarChart3}
                                    title="Nada Crítico"
                                    description="Não há pontos com atrasos significativos reportados recentemente neste bairro."
                                />
                            ) : (
                                topStops.slice(0, 5).map((s, i) => (
                                    <ListItem
                                        key={s.stop_id}
                                        leftIcon={<span className="font-industrial text-[10px] opacity-40">#{i + 1}</span>}
                                        title={s.stop_name}
                                        description={`${s.samples_total} ${t('samples.total')}`}
                                        tone="danger"
                                        rightElement={
                                            <div className="text-right">
                                                <div className="text-lg font-industrial italic leading-none text-danger">+{s.worst_delta_min}m</div>
                                                <div className="text-[8px] font-black uppercase tracking-tight opacity-40">{t('metric.worst')}</div>
                                            </div>
                                        }
                                        href={`/ponto/${s.stop_id}`}
                                    />
                                ))
                            )}
                        </div>
                    </SectionCard>

                    {/* Top Lines */}
                    <SectionCard title="Linhas Problemáticas" subtitle="Atraso médio por itinerário">
                        <div className="space-y-3">
                            {topLines.length === 0 ? (
                                <EmptyState
                                    icon={Bus}
                                    title="Operação Normal"
                                    description="As linhas que cruzam este bairro apresentam performance dentro da média."
                                />
                            ) : (
                                topLines.map((l) => (
                                    <ListItem
                                        key={l.line_id}
                                        leftIcon={<span className="font-industrial text-[10px] opacity-40">L{l.line_code}</span>}
                                        title={l.line_name}
                                        description={`Média de +${l.avg_delta_min}m de atraso`}
                                        rightElement={
                                            <div className="text-[10px] font-black text-white bg-white/5 px-2 py-1 rounded-lg border border-white/10 uppercase">
                                                {l.samples_total} {t('samples.total')}
                                            </div>
                                        }
                                        href={`/linha/${l.line_id}`}
                                    />
                                ))
                            )}
                        </div>
                    </SectionCard>

                    <NextStepBlock title="Ação do Cidadão">
                        <Link href="/no-ponto" className="block">
                            <Button variant="primary" className="w-full justify-between group h-14" icon={<Bus className="opacity-50 group-hover:opacity-100 transition-all" />} iconPosition="right">
                                <div className="text-left">
                                    <p className="text-[8px] uppercase tracking-widest opacity-60 font-black">Funil</p>
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
