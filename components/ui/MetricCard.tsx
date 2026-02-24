'use client';

import * as React from 'react';
import { Card } from './Card';
import { GlossaryHint } from './GlossaryHint';

interface MetricCardProps {
    label: string;
    value: string | number;
    sublabel?: string;
    className?: string;
    trend?: string;
    trendColor?: 'brand' | 'danger' | 'success' | 'muted';
    icon?: React.ReactNode;
    hintTitle?: string;
    hintContent?: string;
}

export const MetricCard = ({
    label,
    value,
    sublabel,
    className = '',
    trend,
    trendColor = 'brand',
    icon,
    hintTitle,
    hintContent
}: MetricCardProps) => {
    const trendStyles = {
        brand: 'text-brand',
        danger: 'text-red-500',
        success: 'text-emerald-500',
        muted: 'text-muted'
    };

    return (
        <Card className={`relative text-center space-y-1 transition-all hover:border-white/10 overflow-hidden ${className}`} variant="surface">
            {icon && (
                <div className="absolute top-2 right-2 opacity-20">
                    {icon}
                </div>
            )}
            <div className="flex flex-col items-center justify-center pt-2">
                <div className="text-3xl font-industrial text-white tabular-nums leading-none">
                    {value || '--'}
                </div>
                {trend && (
                    <div className={`text-[10px] font-black uppercase tracking-tight mt-1 ${trendStyles[trendColor]}`}>
                        {trend}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-white/5">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                    {label}
                </div>
                {hintTitle && hintContent && (
                    <GlossaryHint title={hintTitle} content={hintContent} />
                )}
            </div>
            {sublabel && (
                <div className="text-[8px] font-bold text-white/20 uppercase tracking-tight">
                    {sublabel}
                </div>
            )}
        </Card>
    );
};
