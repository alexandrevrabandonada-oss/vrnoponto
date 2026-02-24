'use client';

import { Loader2 } from 'lucide-react';
import { AppShell, SectionCard } from '@/components/ui';

export default function Loading() {
    return (
        <AppShell title="Mapa de Bairros">

            <div className="max-w-7xl mx-auto py-4 space-y-8">
                {/* Header Skeleton */}
                <SectionCard>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse" />
                            <div className="h-4 w-96 max-w-full bg-white/5 rounded animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                            <div className="h-12 w-48 bg-white/5 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </SectionCard>

                <div className="space-y-6">
                    {/* Legend Skeleton */}
                    <div className="bg-white/[0.02] border border-white/5 h-16 rounded-2xl animate-pulse" />

                    {/* Map Area Skeleton */}
                    <div className="min-h-[600px] h-[calc(100vh-450px)] relative bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-brand/20 mb-4" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 animate-pulse">
                            Sincronizando Geo-Dados...
                        </p>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
