'use client';

import * as React from 'react';
import { LucideIcon, MapPin, Search } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    samplesMissing?: number;
    className?: string;
    children?: React.ReactNode;
}

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    samplesMissing,
    className = '',
    children
}: EmptyStateProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl ${className}`}>
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full scale-150" />
                <div className="relative bg-zinc-900/50 border border-white/5 p-6 rounded-2xl shadow-2xl group-hover:border-brand/20 transition-all">
                    <Icon size={40} className="text-brand opacity-40 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
            </div>

            <div className="space-y-3 max-w-sm mx-auto mb-8">
                <h3 className="font-industrial text-xl uppercase tracking-widest text-white italic">
                    {title}
                </h3>
                <p className="text-[10px] font-bold text-muted uppercase tracking-tight leading-relaxed opacity-60">
                    {description}
                </p>
                <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 bg-brand/10 border border-brand/20 rounded-full text-[9px] font-black text-brand uppercase tracking-widest animate-pulse">
                    <span className="w-1 h-1 bg-brand rounded-full" />
                    {samplesMissing !== undefined && samplesMissing > 0
                        ? `Faltam ${samplesMissing} ${samplesMissing === 1 ? 'Relato' : 'Relatos'}`
                        : "Precisamos de mais relatos (mínimo 3)"
                    }
                </div>
            </div>

            {children && (
                <div className="w-full mb-8 opacity-50 relative group">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-brand text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter animate-pulse whitespace-nowrap">
                        Exemplo (Ilustrativo)
                    </div>
                    {children}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs mx-auto">
                {actionLabel && (
                    <Button
                        variant="primary"
                        onClick={onAction}
                        className="w-full !h-12 !text-[11px] font-black uppercase tracking-widest"
                        icon={<MapPin size={14} />}
                    >
                        {actionLabel}
                    </Button>
                )}
                {secondaryActionLabel && (
                    <Button
                        variant="secondary"
                        onClick={onSecondaryAction}
                        className="w-full !h-12 !text-[11px] font-black uppercase tracking-widest"
                        icon={<Search size={14} />}
                    >
                        {secondaryActionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};
