'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ''
}: EmptyStateProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 ${className}`}>
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand/10 blur-3xl rounded-full scale-150" />
                <div className="relative bg-white/[0.03] border border-white/5 p-6 rounded-3xl shadow-2xl">
                    <Icon size={48} className="text-brand opacity-60" strokeWidth={1.5} />
                </div>
            </div>

            <h3 className="font-industrial text-xl uppercase tracking-tighter text-white mb-2">
                {title}
            </h3>
            <p className="max-w-[280px] text-[11px] font-bold text-muted uppercase tracking-tight leading-relaxed opacity-50 mb-8">
                {description}
            </p>

            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    className="!h-12 !px-8 !text-[11px]"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
