'use client';

import * as React from 'react';
import { Card } from './Card';
import { Divider } from './Divider';

interface SectionCardProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    variant?: 'surface' | 'surface2';
}

export const SectionCard = ({
    title,
    subtitle,
    children,
    className = '',
    variant = 'surface'
}: SectionCardProps) => {
    return (
        <Card className={`space-y-6 ${className}`} variant={variant}>
            {(title || subtitle) && (
                <div className="space-y-1">
                    {title && (
                        <h3 className="text-lg font-industrial italic text-white tracking-widest leading-none">
                            {title}
                        </h3>
                    )}
                    {subtitle && (
                        <p className="text-[10px] font-black text-muted uppercase tracking-tight opacity-60">
                            {subtitle}
                        </p>
                    )}
                    <Divider className="!mt-3 opacity-20" />
                </div>
            )}
            <div className="relative">
                {children}
            </div>
        </Card>
    );
};
