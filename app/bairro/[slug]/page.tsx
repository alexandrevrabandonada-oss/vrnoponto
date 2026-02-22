'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    MapPin, Bus, Clock, Users, ShieldCheck, Download,
    History as HistoryIcon, AlertCircle, BarChart3
} from 'lucide-react';
import { Sparkline } from '@/components/Sparkline';
import { EditorialCard } from '@/components/editorial/EditorialCard';
import { generateNeighborhoodDetailCaption } from '@/lib/editorial/templates';
import {
    AppShell, PageHeader, Button, Card, Divider,
    EmptyState, SkeletonBlock, SkeletonCard, SkeletonList, ListItem, MetricRow
} from '@/components/ui';
import { FollowButton, FollowBadge } from '@/components/push/FollowButton';
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
            <AppShell title="DIAGNÓSTICO">
                <div className="space-y-8">
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
            <AppShell title="DIAGNÓSTICO">
                <EmptyState
                    icon={AlertCircle}
                    title="Bairro não encontrado"
                    description="Não conseguimos localizar os dados para este bairro no sistema."
                    actionLabel="Voltar ao Ranking"
                    onAction={() => window.location.href = '/bairros'}
                />
            </AppShell>
        );
    }

    const { summary, topStops, topLines } = data;
    const sparkData = history.map((h: MonthlyHistoryItem) => h.avg_delta_min);

    return (
        <AppShell title="DIAGNÓSTICO DO BAIRRO">
            <PageHeader
                title={summary.neighborhood}
                subtitle="Prometido vs Real nos últimos 30 dias"
                actions={
                    <FollowButton
                        type="neighborhood"
                        id={summary.neighborhood.toLowerCase().trim()}
                        label={summary.neighborhood}
                    />
                }
            />

            <div className="mb-6 flex justify-center">
                <FollowBadge />
            </div>

            <div className="space-y-8">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="text-center group hover:border-brand/30 transition-all border-white/5">
                        <Clock size={16} className="mx-auto mb-2 text-muted" />
                        <div className="text-2xl font-industrial italic text-brand">
                            {summary.avg_delta_min !== null ? `+${summary.avg_delta_min}m` : '--'}
                        </div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Atraso Médio</div>
                    </Card>
                    <Card className="text-center transition-all border-white/5">
                        <MapPin size={16} className="mx-auto mb-2 text-muted" />
                        <div className="text-2xl font-industrial text-white">{summary.stops_count}</div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Pontos</div>
                    </Card>
                    <Card className="text-center transition-all border-white/5">
                        <Users size={16} className="mx-auto mb-2 text-muted" />
                        <div className="text-2xl font-industrial text-white">{summary.samples_total}</div>
                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Auditado</div>
                    </Card>
                    <Card className="text-center transition-all border-emerald-500/10 bg-emerald-500/5">
                        <ShieldCheck size={16} className="mx-auto mb-2 text-emerald-500/50" />
                        <div className="text-2xl font-industrial text-emerald-400">{summary.pct_verified_avg}%</div>
                        <div className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest mt-1">Confiança</div>
                    </Card>
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
                                <Sparkline data={sparkData} width={100} height={24} color="#FFCC00" />
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
                <Divider label="PONTOS MAIS CRÍTICOS" />
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
                                        <div className="text-lg font-industrial italic leading-none">+{s.worst_delta_min}m</div>
                                        <div className="text-[8px] font-black uppercase tracking-tight opacity-40">{t('metric.worst')}</div>
                                    </div>
                                }
                                href={`/ponto/${s.stop_id}`}
                            />
                        ))
                    )}
                </div>

                {/* Top Lines */}
                <Divider label="LINHAS PROBLEMÁTICAS" />
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

                {/* Editorial Kit */}
                <EditorialCard
                    data={{ ...summary, topStop: topStops[0] || null }}
                    generator={generateNeighborhoodDetailCaption}
                    title="Kit de Divulgação: Auditoria do Bairro"
                />

                {/* Download Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        variant="secondary"
                        href={`/api/bulletin/worst-neighborhoods-card?format=square&limit=5`}
                        target="_blank"
                        className="h-16 !text-[10px]"
                    >
                        <Download size={18} className="mr-2" /> Card Feed
                    </Button>
                    <Button
                        variant="secondary"
                        href={`/api/bulletin/worst-neighborhoods-card?format=story&limit=5`}
                        target="_blank"
                        className="h-16 !text-[10px]"
                    >
                        <Download size={18} className="mr-2" /> Card Story
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
