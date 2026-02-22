'use client';

import React from 'react';
import { Card, Button } from '@/components/ui';
import { Bus, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { SuggestedLine } from '@/lib/suggestLine';

interface OneTapCardProps {
    stopName: string;
    suggestion: SuggestedLine | null;
    loading: boolean;
    isSubmitting: boolean;
    onRegister: (eventType: string) => void;
    onChangeLine: () => void;
}

export const OneTapCard = ({
    stopName,
    suggestion,
    loading,
    isSubmitting,
    onRegister,
    onChangeLine
}: OneTapCardProps) => {
    if (loading) {
        return (
            <Card variant="surface2" className="border-brand/20 bg-brand/5 p-6 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-brand mb-2" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-brand/50">Analisando Padrões...</p>
            </Card>
        );
    }

    if (!suggestion) return null;

    const confidenceLabels = {
        HIGH: 'Confiança Alta',
        MED: 'Sugestão Popular',
        LOW: 'Possível Opção'
    };

    return (
        <Card variant="surface2" className="border-brand/30 bg-brand/5 p-5 sm:p-6 overflow-hidden relative">
            {/* Confidence Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-tighter
                ${suggestion.confidence === 'HIGH' ? 'bg-brand text-black' : 'bg-white/10 text-white/50'}`}>
                {confidenceLabels[suggestion.confidence]}
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className="bg-brand/10 p-3 rounded-2xl text-brand shrink-0">
                    <Bus size={24} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand opacity-60">Linha Detectada</h3>
                    <p className="text-xl font-black text-white leading-tight uppercase font-industrial tracking-tight">
                        {suggestion.code} - {suggestion.name}
                    </p>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-tight mt-1">
                        Em <span className="text-white/80">{stopName}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <Button
                    onClick={() => onRegister('passed_by')}
                    loading={isSubmitting}
                    className="h-16 !text-lg !bg-orange-600 hover:!bg-orange-500 !text-white flex-col !gap-0"
                >
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Passou agora</span>
                    <span className="font-industrial tracking-tight">VAI PASSAR</span>
                </Button>

                <Button
                    onClick={() => onRegister('boarding')}
                    loading={isSubmitting}
                    className="h-16 !text-lg !bg-emerald-600 hover:!bg-emerald-500 !text-white flex-col !gap-0"
                >
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70">Entrar no</span>
                    <span className="font-industrial tracking-tight">EMBARCAR</span>
                </Button>
            </div>

            <button
                onClick={onChangeLine}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5 group"
            >
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-brand opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70">Não é esta linha?</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand">
                    Trocar Linha
                    <ChevronRight size={14} />
                </div>
            </button>
        </Card>
    );
};
