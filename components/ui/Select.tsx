'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
    icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', children, icon, ...props }, ref) => {
        const baseStyles = "w-full min-h-[48px] rounded-xl font-medium text-sm transition-all outline-none appearance-none";
        const industrialStyles = "bg-white/[0.03] border border-white/5 text-white focus:border-brand focus:ring-4 focus:ring-brand/10 hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

        return (
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-focus-within:text-brand transition-colors">
                        {icon}
                    </div>
                )}
                <select
                    ref={ref}
                    className={`${baseStyles} ${industrialStyles} ${className}`}
                    style={{ padding: 'var(--field-py) var(--field-px)', paddingLeft: icon ? '3rem' : 'var(--field-px)' }}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-focus-within:text-brand transition-colors">
                    <ChevronDown size={18} />
                </div>
            </div>
        );
    }
);

Select.displayName = 'Select';
