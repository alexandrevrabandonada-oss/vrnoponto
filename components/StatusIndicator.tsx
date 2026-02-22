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
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 scale-in border ${isConnected
            ? 'bg-brand/5 border-brand/20 text-brand'
            : 'bg-danger/5 border-danger/20 text-danger'
            } focus-ring`} tabIndex={0}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-brand shadow-[0_0_8px_rgba(246,198,0,0.6)] animate-pulse' : 'bg-danger'}`} />
            {label || (isConnected ? 'SISTEMA OPERACIONAL' : 'VRP EM MANUTENÇÃO')}
        </div>
    );
}
