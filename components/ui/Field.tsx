'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldProps {
    label?: string;
    hint?: string;
    error?: string;
    children: React.ReactElement;
    className?: string;
}

export const Field = ({ label, hint, error, children, className = '' }: FieldProps) => {
    const child = React.isValidElement(children) ? (children as React.ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>) : null;
    const id = child?.props?.id;
    const hintId = id ? `${id}-hint` : undefined;
    const errorId = id ? `${id}-error` : undefined;

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-xs font-black uppercase tracking-[0.15em] text-white/50 mb-2 ml-1"
                >
                    {label}
                </label>
            )}

            <div className="relative group">
                {child && React.cloneElement(child, {
                    'aria-describedby': [
                        error ? errorId : null,
                        hint ? hintId : null
                    ].filter(Boolean).join(' ') || undefined,
                    'aria-invalid': error ? true : undefined,
                })}
            </div>

            {(hint || error) && (
                <div className="px-1 space-y-1">
                    {error && (
                        <p
                            id={errorId}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-danger uppercase tracking-tight animate-in fade-in slide-in-from-top-1"
                        >
                            <AlertCircle size={12} strokeWidth={3} />
                            {error}
                        </p>
                    )}
                    {hint && !error && (
                        <p
                            id={hintId}
                            className="text-[10px] font-medium text-muted uppercase tracking-wide opacity-50"
                        >
                            {hint}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
