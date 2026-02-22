'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', ...props }, ref) => {
        const baseStyles = "w-full min-h-[100px] px-4 py-3 rounded-xl font-medium text-sm transition-all outline-none resize-none";
        const industrialStyles = "bg-white/[0.03] border border-white/5 text-white placeholder:text-white/20 focus:border-brand focus:ring-4 focus:ring-brand/10 hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

        return (
            <textarea
                ref={ref}
                className={`${baseStyles} ${industrialStyles} ${className}`}
                style={{ padding: 'var(--field-py) var(--field-px)' }}
                {...props}
            />
        );
    }
);

Textarea.displayName = 'Textarea';
