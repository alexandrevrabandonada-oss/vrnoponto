'use client';

import * as React from 'react';

interface DividerProps {
    className?: string;
    label?: string;
}

export const Divider = ({ className = '', label }: DividerProps) => {
    return (
        <div className={`relative flex items-center py-8 ${className}`}>
            <div className="flex-grow border-t border-white/5"></div>
            {label && (
                <span className="flex-shrink mx-4 font-industrial text-[10px] tracking-[0.3em] uppercase text-muted/30">
                    {label}
                </span>
            )}
            <div className="flex-grow border-t border-white/5"></div>
        </div>
    );
};
