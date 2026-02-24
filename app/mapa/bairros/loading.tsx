'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <main className="min-h-screen bg-[#070707] p-4 md:p-8 text-white">
            <div className="fixed inset-0 industrial-texture opacity-15 pointer-events-none" />
            <div className="max-w-7xl mx-auto space-y-6 relative z-10">
                {/* Header Skeleton */}
                <div className="rounded-2xl border border-white/10 bg-[#0c0f14] p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-4 w-96 bg-white/10 rounded animate-pulse" />
                    </div>
                </div>

                {/* Legend Skeleton */}
                <div className="bg-[#0c0f14] p-4 rounded-xl border border-white/10 h-16 animate-pulse" />

                {/* Map Area Skeleton */}
                <div className="min-h-[600px] h-[calc(100vh-300px)] relative bg-[#0c0f14] rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-brand mb-4" size={48} />
                    <p className="text-white/70 font-industrial text-xs tracking-widest uppercase animate-pulse">Sincronizando Geo-Dados...</p>
                </div>
            </div>
        </main>
    );
}
