'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
                            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-4 w-96 bg-gray-100 dark:bg-gray-800/50 rounded animate-pulse" />
                    </div>
                </div>

                {/* Legend Skeleton */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-16 animate-pulse" />

                {/* Map Area Skeleton */}
                <div className="min-h-[600px] h-[calc(100vh-300px)] relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-brand mb-4" size={48} />
                    <p className="text-zinc-500 font-industrial text-xs tracking-widest uppercase animate-pulse">Sincronizando Geo-Dados...</p>
                </div>
            </div>
        </main>
    );
}
