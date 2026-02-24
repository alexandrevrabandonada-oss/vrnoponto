'use client';

import * as React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { GlossaryKey } from '@/lib/glossary';
import { GlossaryHint } from './GlossaryHint';

export interface MetricRowProps {
    label: string;
    value: string | number;
    sublabel?: string;
    delta?: 'positive' | 'negative' | 'neutral';
    deltaLabel?: string;
    tone?: 'neutral' | 'brand' | 'danger';
    className?: string;

    // Legacy support
    unit?: string;
    trend?: {
        value: number | string;
        isPositive: boolean;
    };
    hintTitle?: string;
    hintContent?: string;
    term?: GlossaryKey;
}

export const MetricRow = ({
    label,
    value,
    sublabel,
    delta,
    deltaLabel,
    tone = 'neutral',
    className = '',
    // Legacy
    unit,
    trend,
    hintTitle,
    hintContent,
    term
}: MetricRowProps) => {


    // Map legacy
    const finalDelta = delta || (trend ? (trend.isPositive ? 'positive' : 'negative') : undefined);
    const finalDeltaLabel = deltaLabel || (trend ? `${trend.isPositive ? '+' : ''}${trend.value}` : undefined);
    const finalSublabel = sublabel || unit; // Fallback unit to sublabel visually

    const toneStyles = {
        neutral: 'text-white',
        brand: 'text-brand',
        danger: 'text-danger'
    };

    return (
        <div className={`flex justify-between items-center py-3 border-b border-white/5 last:border-0 ${className}`}>
            {/* Left side: Label & Sublabel */}
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5 opacity-80">
                    <span className="font-industrial text-[11px] text-muted uppercase tracking-widest">
                        {label}
                    </span>
                    {(term || (hintTitle && hintContent)) && (
                        <GlossaryHint term={term} title={hintTitle} content={hintContent} />
                    )}
                </div>
                {finalSublabel && (
                    <span className="text-[9px] font-bold text-muted uppercase tracking-tight opacity-40">
                        {finalSublabel}
                    </span>
                )}
            </div>

            {/* Right side: Value & Delta */}
            <div className="flex items-center gap-3 text-right">
                {finalDelta && finalDeltaLabel && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                        ${finalDelta === 'positive' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                        ${finalDelta === 'negative' ? 'bg-white/5 text-muted' : ''} 
                        ${finalDelta === 'neutral' ? 'bg-white/5 text-muted' : ''}
                    `}>
                        {finalDelta === 'positive' && <ArrowUpRight size={10} className="mr-0.5" />}
                        {/* We use subtle white/5 for negative to avoid "screaming red", as requested ("sem vermelho berrando") */}
                        {finalDelta === 'negative' && <ArrowDownRight size={10} className="mr-0.5 opacity-70" />}
                        {finalDelta === 'neutral' && <Minus size={10} className="mr-0.5 opacity-50" />}
                        {finalDeltaLabel}
                    </div>
                )}

                <span className={`font-industrial text-xl tabular-nums tracking-tighter leading-none ${toneStyles[tone]}`}>
                    {value}
                </span>
            </div>
        </div>
    );
};
