'use client';

import * as React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    variant?: 'surface' | 'ghost' | 'brand';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className = '', icon: Icon, variant = 'surface', ...props }, ref) => {
        const variants = {
            surface: 'bg-surface-2 border-white/5 text-brand shadow-inner hover:scale-110',
            ghost: 'bg-transparent text-muted hover:text-white transition-colors',
            brand: 'bg-brand text-black hover:scale-110 active:scale-95 shadow-lg',
        };

        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center rounded-xl p-3 border transition-all duration-300 focus-ring ${variants[variant]} ${className}`}
                {...props}
            >
                {Icon}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';
