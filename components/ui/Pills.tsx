'use client';

import * as React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'brand' | 'muted' | 'danger';
}

export const Badge = ({ className = '', variant = 'brand', children, ...props }: BadgeProps) => {
    const variants = {
        brand: 'bg-brand/10 border-brand/20 text-brand',
        muted: 'bg-white/5 border-white/10 text-muted',
        danger: 'bg-danger/10 border-danger/20 text-danger',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-[0.15em] ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};

interface StatusPillProps {
    status: 'online' | 'offline' | 'error';
    label?: string;
}

export const StatusPill = ({ status, label }: StatusPillProps) => {
    const configs = {
        online: { color: 'bg-brand', text: label || 'SISTEMA OPERACIONAL', class: 'text-brand bg-brand/5 border-brand/20' },
        offline: { color: 'bg-muted', text: label || 'MODO OFFLINE — SINCRONIZAMOS DEPOIS', class: 'text-muted bg-white/5 border-white/10' },
        error: { color: 'bg-danger', text: label || 'ERRO DE CONEXÃO — TENTE DE NOVO', class: 'text-danger bg-danger/5 border-danger/20' },
    };

    const config = configs[status];

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${config.class}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'online' ? 'shadow-[0_0_8px_rgba(246,198,0,0.6)] animate-pulse' : ''}`} />
            {config.text}
        </div>
    );
};
