'use client';

import * as React from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface InlineAlertProps {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
};

const styles = {
    info: 'bg-brand/5 border-brand/20 text-brand',
    success: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
    error: 'bg-danger/5 border-danger/20 text-danger',
};

export const InlineAlert = ({
    variant = 'info',
    title,
    children,
    className = ''
}: InlineAlertProps) => {
    const Icon = icons[variant];

    return (
        <div className={`flex gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${styles[variant]} ${className}`}>
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
                {title && (
                    <h4 className="font-industrial text-xs uppercase tracking-widest">
                        {title}
                    </h4>
                )}
                <div className="text-[11px] font-bold uppercase tracking-tight opacity-70 leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );
};
