'use client';

import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, ...props }, ref) => {
        const baseStyles = "w-full min-h-[48px] px-4 py-3 rounded-xl font-medium text-sm transition-all outline-none";
        const industrialStyles = "bg-white/[0.03] border border-white/5 text-white placeholder:text-white/20 focus:border-brand focus:ring-4 focus:ring-brand/10 hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

        return (
            <input
                ref={ref}
                className={`${baseStyles} ${industrialStyles} ${className}`}
                style={{ padding: 'var(--field-py) var(--field-px)' }}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';
