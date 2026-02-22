import { AppShell, PageHeader, SkeletonCard, SkeletonList } from '@/components/ui';

export default function BairrosHistoricoLoading() {
    return (
        <AppShell title="HISTÓRICO MENSAL">
            <PageHeader
                title="Histórico de Bairros"
                subtitle="Carregando série histórica de Volta Redonda..."
            />

            <div className="space-y-8 animate-pulse">
                {/* Worsening / Improving Skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>

                {/* Timeline Skeletons */}
                <div className="h-8 w-48 bg-white/5 rounded-lg mb-4" />
                <SkeletonList items={8} />
            </div>
        </AppShell>
    );
}
