'use client';

import * as React from 'react';
import Link from 'next/link';

export interface ListItemProps {
    title: string;
    description?: string;
    leftIcon?: React.ReactNode;
    rightElement?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    selected?: boolean;
    tone?: 'neutral' | 'brand' | 'danger';
    className?: string;

    // Legacy mapping support
    icon?: React.ReactNode;
    subtitle?: string;
    extra?: React.ReactNode;
}

export const ListItem = ({
    title,
    description,
    leftIcon,
    rightElement,
    href,
    onClick,
    selected = false,
    tone = 'neutral',
    className = '',
    // Legacy
    icon,
    subtitle,
    extra
}: ListItemProps) => {
    // Map legacy props to new ones
    const finalIcon = leftIcon || icon;
    const finalDesc = description || subtitle;
    const finalRight = rightElement || extra;

    const toneStyles = {
        neutral: 'border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 text-white',
        brand: 'border-brand/30 bg-brand/5 hover:bg-brand/10 hover:border-brand/40 text-brand',
        danger: 'border-danger/30 bg-danger/5 hover:bg-danger/10 hover:border-danger/40 text-danger'
    };

    const selectedStyles = selected
        ? tone === 'neutral'
            ? 'border-white/20 bg-white/[0.06]'
            : toneStyles[tone]
        : toneStyles[tone];

    const isInteractive = !!href || !!onClick;

    const innerContent = (
        <div className={`
            flex items-center gap-4 p-4 rounded-2xl transition-all outline-none
            ${selectedStyles}
            ${isInteractive ? 'cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-transparent' : ''}
            ${className}
        `}>
            {finalIcon && (
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors
                    ${tone === 'neutral' ? 'bg-white/[0.03] text-muted group-hover:text-brand' : ''}
                    ${tone === 'brand' ? 'bg-brand/10' : ''}
                    ${tone === 'danger' ? 'bg-danger/10' : ''}
                `}>
                    {finalIcon}
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-industrial text-sm uppercase tracking-widest truncate leading-tight">
                    {title}
                </h4>
                {finalDesc && (
                    <p className={`text-[10px] font-bold uppercase tracking-tight truncate mt-0.5
                        ${tone === 'neutral' ? 'text-muted opacity-50' : 'opacity-70'}
                    `}>
                        {finalDesc}
                    </p>
                )}
            </div>

            {finalRight && (
                <div className="shrink-0 flex items-center gap-3">
                    {finalRight}
                </div>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="group block outline-none">
                {innerContent}
            </Link>
        );
    }

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="group block w-full text-left outline-none">
                {innerContent}
            </button>
        );
    }

    return (
        <div className="group block">
            {innerContent}
        </div>
    );
};
