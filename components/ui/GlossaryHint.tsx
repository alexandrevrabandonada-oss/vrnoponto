'use client';

import * as React from 'react';
import { HelpCircle, X } from 'lucide-react';

interface GlossaryHintProps {
    title: string;
    content: string;
    className?: string;
}

export function GlossaryHint({ title, content, className = '' }: GlossaryHintProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const toggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    React.useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
            <button
                onClick={toggle}
                className="p-1 rounded-full text-white/30 hover:text-brand hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-brand/50"
                aria-label={`Ajuda para ${title}`}
                type="button"
            >
                <HelpCircle size={14} />
            </button>

            {isOpen && (
                <div
                    className="absolute z-[100] top-full left-0 mt-2 w-64 p-4 rounded-2xl bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand">{title}</p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 -mr-1 rounded-lg text-white/20 hover:text-white"
                        >
                            <X size={12} />
                        </button>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed text-white/70 italic">
                        {content}
                    </p>

                    {/* Arrow */}
                    <div className="absolute -top-1 left-3 w-2 h-2 bg-surface/95 border-l border-t border-white/10 rotate-45" />
                </div>
            )}
        </div>
    );
}
