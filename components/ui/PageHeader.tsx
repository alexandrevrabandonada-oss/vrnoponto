'use client';

import * as React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader = ({ title, subtitle, actions, className = '' }: PageHeaderProps) => {
    return (
        <div className={`mb-12 space-y-6 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-industrial leading-[0.8] tracking-tighter text-white uppercase italic selection:bg-brand selection:text-black">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-muted text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-60 max-w-md">
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </div>
            {/* Subtle highlight line */}
            <div className="w-16 h-1 bg-brand/30 rounded-full" />
        </div>
    );
};
