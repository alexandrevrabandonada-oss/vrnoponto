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
        <div className={`mb-10 space-y-4 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-industrial leading-[0.85] tracking-tighter text-white uppercase italic">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-muted text-xs font-black uppercase tracking-[0.1em] opacity-80">
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
            <div className="w-12 h-1 bg-brand/40 rounded-full" />
        </div>
    );
};
