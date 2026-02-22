'use client';

import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'surface' | 'surface2';
    hasTexture?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'surface', hasTexture = true, children, ...props }, ref) => {
        const variants = {
            surface: 'bg-surface border-white/5 shadow-2xl',
            surface2: 'bg-surface-2 border-white/10 shadow-inner',
        };

        return (
            <div
                ref={ref}
                className={`rounded-2xl border relative overflow-hidden transition-all duration-300 ${variants[variant]} ${hasTexture ? 'industrial-texture' : ''} ${className}`}
                style={{ padding: 'var(--card-pad)' }}
                {...props}
            >
                {/* Subtle Industrial Detail (Micro-border accent) */}
                <div className="absolute top-0 left-0 w-1 h-8 bg-brand/20 rounded-full" />

                <div className="relative z-10">
                    {children}
                </div>
            </div>
        );
    }
);

Card.displayName = 'Card';
