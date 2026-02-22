'use client';

import { Loader2 } from 'lucide-react';

interface StatusIndicatorProps {
    isConnected: boolean;
    label?: string;
    loading?: boolean;
}

export function StatusIndicator({ isConnected, label, loading }: StatusIndicatorProps) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                Validando conexão...
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 scale-in ${isConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
            : 'bg-red-50 dark:bg-red-950/30 text-red-600'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            {label || (isConnected ? 'Sistema Online' : 'Banco Offline')}
        </div>
    );
}
