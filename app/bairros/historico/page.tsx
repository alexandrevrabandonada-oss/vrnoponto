'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, History as HistoryIcon, AlertTriangle, Calendar, AlertCircle } from 'lucide-react';
import { AppShell, PageHeader, Card, MetricRow, EmptyState, Divider, ListItem, SkeletonCard, SkeletonList } from '@/components/ui';
import { t } from '@/lib/copy';

type MonthlyChange = {
    month_start: string;
    neighborhood_norm: string;
    cur_avg_delta_min: number;
    prev_avg_delta_min: number | null;
    delta_change_min: number | null;
    delta_change_pct: number | null;
    samples_total: number;
    pct_verified_avg: number;
};

export default function HistoricoBairrosPage() {
    const [changes, setChanges] = useState<MonthlyChange[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistoricalData() {
            setLoading(true);
            try {
                const resChanges = await fetch(`/api/neighborhoods/changes`);
                if (resChanges.ok) {
                    const json = await resChanges.json();
                    setChanges(json.data || []);
                }
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistoricalData();
    }, []);

    // Get latest month available
    const latestMonth = changes.length > 0 ? changes[0].month_start : null;
    const currentMonthData = changes.filter(c => c.month_start === latestMonth);

    const worsening = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min > 0)
        .sort((a, b) => (b.delta_change_min || 0) - (a.delta_change_min || 0))
        .slice(0, 5);

    const improving = [...currentMonthData]
        .filter(c => c.delta_change_min !== null && c.delta_change_min < 0)
        .sort((a, b) => (a.delta_change_min || 0) - (b.delta_change_min || 0))
        .slice(0, 5);

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
            .format(new Date(dateStr + 'T12:00:00Z'));
    };

    if (loading && changes.length === 0) {
        return (
            <AppShell title="HISTÓRICO MENSAL">
                <PageHeader
                    title="Histórico de Bairros"
                    subtitle="Carregando série histórica de Volta Redonda..."
                />
                <div className="space-y-8 p-4">
                    <SkeletonCard className="h-40" />
                    <SkeletonList items={5} />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="HISTÓRICO MENSAL">
            <PageHeader
                title="Histórico de Bairros"
                subtitle="Comparativo mensal de desempenho e tendências de atraso."
            />

            <div className="space-y-8">

                {latestMonth && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Worsening */}
                        <Card className="!p-0 border-danger/20 overflow-hidden">
                            <div className="p-5 bg-danger/5 border-b border-danger/10 flex items-center justify-between">
                                <h2 className="font-industrial text-sm uppercase text-danger flex items-center gap-2">
                                    <TrendingUp size={18} /> MAIOR PIORA
                                </h2>
                                <span className="text-[10px] font-bold text-danger/50 uppercase">{formatDate(latestMonth)}</span>
                            </div>
                            <div className="divide-y divide-white/5 bg-white/[0.01]">
                                {worsening.length === 0 ? (
                                    <div className="p-8 text-center text-muted text-[11px] font-bold uppercase opacity-50">Nenhuma piora significativa.</div>
                                ) : worsening.map(w => (
                                    <MetricRow
                                        key={w.neighborhood_norm}
                                        label={`${w.cur_avg_delta_min}m total`}
                                        value={w.neighborhood_norm}
                                        delta="negative"
                                        deltaLabel={`${w.delta_change_min}m`}
                                        tone="danger"
                                        className="!py-3"
                                    />
                                ))}
                            </div>
                        </Card>

                        {/* Improving */}
                        <Card className="!p-0 border-emerald-500/20 overflow-hidden">
                            <div className="p-5 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
                                <h2 className="font-industrial text-sm uppercase text-emerald-400 flex items-center gap-2">
                                    <TrendingDown size={18} /> MELHOROU
                                </h2>
                                <span className="text-[10px] font-bold text-emerald-500/50 uppercase">{formatDate(latestMonth)}</span>
                            </div>
                            <div className="divide-y divide-white/5 bg-white/[0.01]">
                                {improving.length === 0 ? (
                                    <div className="p-8 text-center text-muted text-[11px] font-bold uppercase opacity-50">Nenhuma melhoria significativa.</div>
                                ) : improving.map(i => (
                                    <MetricRow
                                        key={i.neighborhood_norm}
                                        label={`${i.cur_avg_delta_min}m total`}
                                        value={i.neighborhood_norm}
                                        delta="positive"
                                        deltaLabel={`${i.delta_change_min}m`}
                                        tone="brand"
                                        className="!py-3"
                                    />
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                <Divider label="LINHA DO TEMPO POR BAIRRO" />

                {changes.length === 0 ? (
                    <Card className="p-0">
                        <EmptyState
                            icon={AlertCircle}
                            title="Sem Dados"
                            description="Não há histórico consolidado suficiente para essa visualização no momento."
                        />
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {changes.map((c) => {
                            const isWorsening = c.delta_change_min && c.delta_change_min > 0;
                            const isImproving = c.delta_change_min && c.delta_change_min < 0;

                            const FormattedTrend = c.delta_change_min ? (
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${isWorsening ? 'bg-danger/10 text-danger' : isImproving ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-muted'}`}>
                                    {isWorsening ? '+' : ''}{c.delta_change_min}m
                                </span>
                            ) : (
                                <span className="text-[10px] font-black uppercase text-muted bg-white/5 px-2 py-1 rounded-full">--</span>
                            );

                            return (
                                <ListItem
                                    key={`${c.month_start}-${c.neighborhood_norm}`}
                                    title={c.neighborhood_norm}
                                    description={formatDate(c.month_start)}
                                    leftIcon={<span className="font-industrial text-[10px]">&bull;</span>}
                                    tone={isWorsening ? 'danger' : isImproving ? 'brand' : 'neutral'}
                                    rightElement={
                                        <div className="flex items-center gap-4 text-right">
                                            <div>
                                                <div className="text-lg font-industrial text-white leading-none">+{c.cur_avg_delta_min}m</div>
                                                <div className="text-[8px] font-black text-muted uppercase tracking-tight opacity-40">Média</div>
                                            </div>
                                            {FormattedTrend}
                                        </div>
                                    }
                                    href={`/bairro/${encodeURIComponent(c.neighborhood_norm)}`}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Call to Action */}
                <Card className="!p-8 bg-brand/5 border-l-4 border-l-brand rounded-none rounded-r-2xl border-t-0 border-r-0 border-b-0">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="text-brand flex-shrink-0" size={28} />
                        <div>
                            <h3 className="text-white font-black text-lg font-industrial uppercase tracking-tight">Evolução do Serviço</h3>
                            <p className="text-muted text-[11px] font-bold uppercase tracking-tight leading-relaxed mt-1 opacity-70">
                                Pioras constantes em determinados bairros indicam necessidade de revisão de frota ou itinerário pelas autoridades.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
