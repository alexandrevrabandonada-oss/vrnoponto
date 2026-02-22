'use client';

import { useState, useEffect, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpModalProps {
    storageKey: string;  // Unique key for localStorage "don't show again"
    tips: string[];      // 3 bullets to display
}

export function HelpModal({ storageKey, tips }: HelpModalProps) {
    // Lazy initializer reads localStorage without useEffect to avoid set-state-in-effect lint
    const [open, setOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(storageKey) !== 'dismissed';
    });

    const dismiss = useCallback((permanent: boolean) => {
        if (permanent) localStorage.setItem(storageKey, 'dismissed');
        setOpen(false);
    }, [storageKey]);

    // Close on ESC
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-brand hover:brightness-110 text-black rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90"
                aria-label="Ajuda"
            >
                <HelpCircle size={20} />
            </button>

            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => dismiss(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-gray-900 dark:text-white text-base">Dicas rápidas 💡</h3>
                            <button onClick={() => dismiss(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={20} />
                            </button>
                        </div>

                        <ul className="space-y-3">
                            {tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="flex-shrink-0 w-6 h-6 bg-brand/20 text-brand rounded-full flex items-center justify-center text-xs font-black">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{tip}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                onClick={() => dismiss(false)}
                                className="w-full bg-brand hover:brightness-110 text-black font-bold py-3 rounded-2xl transition text-sm flex justify-center items-center font-industrial tracking-widest uppercase"
                            >
                                Entendi!
                            </button>
                            <button
                                onClick={() => dismiss(true)}
                                className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition"
                            >
                                Não mostrar de novo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
