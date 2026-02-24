'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, MapPin, Bus, Share2, Info } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
    // Close on ESC
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!isOpen) return null;

    const steps = [
        {
            icon: <MapPin className="text-brand" size={18} />,
            title: "Check-in no Ponto",
            desc: "Use o GPS para validar que você está no local da auditoria."
        },
        {
            icon: <Bus className="text-brand" size={18} />,
            title: "Relate o Ônibus",
            desc: "Diga se ele passou ou se você embarcou. Vale prova por foto!"
        },
        {
            icon: <Share2 className="text-brand" size={18} />,
            title: "Alimente o Boletim",
            desc: "Seu dado vira transparência e ajuda a cobrar melhorias reais."
        }
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <Card className="w-full max-w-sm !bg-[#0c0f14] border-white/10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand/10 p-2 rounded-xl text-brand">
                            <Info size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-industrial italic uppercase tracking-wide text-white leading-none">Como Funciona</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1.5">Auditoria Cidadã em 10 segundos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/20 hover:text-white transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Steps */}
                <div className="space-y-6 mb-8 relative">
                    {steps.map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                                {step.icon}
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">{step.title}</h4>
                                <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Confirm Action */}
                <Button
                    onClick={onClose}
                    className="w-full !h-14 uppercase font-black italic tracking-widest shadow-xl shadow-brand/10"
                >
                    Entendi, Vamos!
                </Button>
            </Card>
        </div>
    );
}
