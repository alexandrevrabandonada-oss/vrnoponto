'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Map as MapIcon } from 'lucide-react';
import {
    AppShell, PageHeader, Button, Card, Divider, EmptyState,
    SkeletonCard, SkeletonList, ListItem, MetricCard, SecondaryCTA, SectionCard
} from '@/components/ui';
import { t } from '@/lib/copy';

type NeighborhoodRow = {
    neighborhood: string;
    avg_delta_min: number;
    stops_count: number;
    samples_total: number;
    pct_verified_avg: number;
};

export default function BairrosPage() {
    const [loading, setLoading] = useState(true);
    const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRow[]>([]);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch('/api/neighborhoods?limit=50');
                if (res.ok) {
                    const json = await res.json();
                    setNeighborhoods(json.data || []);
                }
            } catch (err) {
                console.error('Error fetching neighborhoods:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading && neighborhoods.length === 0) {
        return (
            <AppShell title="RANKING">
                <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                    <SkeletonList items={10} />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="RANKING DE BAIRROS">
            <PageHeader
                title="Bairros com Mais Atraso"
                subtitle="Diferença entre o horário oficial e a realidade (30d)"
                actions={
                    <SecondaryCTA href="/mapa/bairros" className="!h-10 !px-4 !text-[10px]">
                        <MapIcon size={14} className="mr-2" /> MAPA
                    </SecondaryCTA>
                }
            />

            <div className="space-y-8">
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Bairros"
                        value={neighborhoods.length}
                    />
                    <MetricCard
                        label="Pior Atraso"
                        value={neighborhoods.length > 0 ? `+${neighborhoods[0]?.avg_delta_min}m` : '--'}
                        trendColor="brand"
                        trend="Cenário Crítico"
                    />
                    <MetricCard
                        label="Pontos"
                        value={neighborhoods.reduce((a, b) => a + b.stops_count, 0)}
                    />
                    <MetricCard
                        label="Relatos"
                        value={neighborhoods.reduce((a, b) => a + b.samples_total, 0)}
                    />
                </div>

                {/* Ranking Section */}
                <SectionCard title="Classificação Técnica" subtitle="Ranking baseado em relatos auditados">
                    <div className="space-y-3">
                        {neighborhoods.length === 0 ? (
                            <EmptyState
                                icon={AlertTriangle}
                                title="Sem Dados de Ranking"
                                description="Não há auditores suficientes hoje. Que tal registrar em pelo menos 3 pontos agora para reverter este cenário?"
                                actionLabel="Auditar Ponto"
                                onAction={() => window.location.href = '/no-ponto'}
                                secondaryActionLabel="Como Funciona"
                                onSecondaryAction={() => window.location.href = '/como-usar'}
                            />
                        ) : (
                            neighborhoods.map((n, i) => (
                                <ListItem
                                    key={n.neighborhood}
                                    icon={<span className="font-industrial text-[10px] opacity-40">#{i + 1}</span>}
                                    title={n.neighborhood}
                                    subtitle={`${n.stops_count} pontos monitorados • ${n.samples_total} ${t('samples.total')}`}
                                    extra={
                                        <div className="text-right">
                                            <div className="text-lg font-industrial text-brand italic leading-none">+{n.avg_delta_min}m</div>
                                            <div className="text-[8px] font-black text-muted uppercase tracking-tight opacity-40">Média</div>
                                        </div>
                                    }
                                    onClick={() => window.location.href = `/bairro/${encodeURIComponent(n.neighborhood)}`}
                                />
                            ))
                        )}
                    </div>
                </SectionCard>

                {/* Auditoria Pop Message */}
                <Card className="!p-6 bg-brand/5 border-brand/10">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="text-brand flex-shrink-0" size={24} />
                        <div>
                            <h3 className="font-industrial text-sm uppercase tracking-widest text-brand mb-1">Padrão de Auditoria Comunitária</h3>
                            <p className="text-[10px] font-bold text-brand/60 uppercase leading-relaxed">
                                Este ranking é alimentado pela sua participação. Cada registro de espera fortalece a transparência técnica e a cobrança por melhorias.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
