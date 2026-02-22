'use client';

import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

/**
 * Base Skeleton Component
 * Visuals: uses surface-2 (#161616 via bg-[#161616]), subtle shimmer gradient, respects prefers-reduced-motion.
 * Sem "branco", design industrial para loading states.
 */
export const Skeleton = ({ className = '', style, ...props }: SkeletonProps) => {
    return (
        <div
            className={`relative overflow-hidden bg-[#161616] border border-white/[0.02] ${className}`}
            style={style}
            {...props}
        >
            {/* Shimmer overlay - uses motion-safe to respect prefers-reduced-motion */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent motion-safe:animate-shimmer" />
        </div>
    );
};

export const SkeletonLine = ({ className = '', ...props }: SkeletonProps) => (
    <Skeleton className={`h-4 rounded-md ${className}`} {...props} />
);

export const SkeletonBlock = ({ className = '', ...props }: SkeletonProps) => (
    <Skeleton className={`h-32 rounded-2xl ${className}`} {...props} />
);

export const SkeletonList = ({ items = 3, className = '' }: { items?: number; className?: string }) => (
    <div className={`space-y-4 ${className}`}>
        {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-white/5 bg-[#111111] rounded-2xl">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <SkeletonLine className="w-1/3" />
                    <SkeletonLine className="w-1/4 !h-3 opacity-50" />
                </div>
                <SkeletonBlock className="!h-8 w-16 !rounded-xl" />
            </div>
        ))}
    </div>
);

export const SkeletonTable = ({ rows = 5, className = '' }: { rows?: number; className?: string }) => (
    <div className={`w-full border border-white/5 bg-[#111111] rounded-2xl overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
            <SkeletonLine className="w-1/4 !h-3 bg-white/5" />
            <SkeletonLine className="w-1/4 !h-3 bg-white/5" />
            <SkeletonLine className="w-1/6 !h-3 bg-white/5" />
        </div>
        {/* Rows */}
        <div className="divide-y divide-white/5">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                    <SkeletonLine className="w-1/4" />
                    <SkeletonLine className="w-1/5" />
                    <SkeletonLine className="w-1/6 !h-3 opacity-50" />
                </div>
            ))}
        </div>
    </div>
);

// Manter componentes antigos (Card e Metric) para compatibilidade reversa com o resto do App que já os utiliza.
export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
    <div className={`p-6 border border-white/5 bg-[#111111] rounded-3xl space-y-4 ${className}`}>
        <SkeletonLine className="!h-6 w-3/4" />
        <SkeletonLine className="w-1/2 opacity-50" />
        <div className="pt-4 space-y-2">
            <SkeletonBlock className="!h-12 w-full" />
        </div>
    </div>
);

export const SkeletonMetric = () => (
    <div className="p-5 border border-white/5 bg-[#111111] rounded-2xl space-y-3">
        <SkeletonLine className="!h-3 w-2/3 opacity-50" />
        <div className="flex items-end gap-2">
            <SkeletonBlock className="!h-8 w-1/2" />
            <SkeletonLine className="!h-4 w-1/4 mb-1 opacity-50" />
        </div>
    </div>
);
