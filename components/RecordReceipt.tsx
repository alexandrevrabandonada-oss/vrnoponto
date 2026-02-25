'use client';

import React from 'react';
import { Card, Button, NextStepBlock } from '@/components/ui';
import { ChevronRight, Share2, Check, WifiOff } from 'lucide-react';
import Link from 'next/link';

interface RecordReceiptProps {
    stopId: string;
    stopName: string;
    trustLevel?: string;
    isPending?: boolean;
}

const TRUST_COPY: Record<string, string> = {
    L1: 'Relato registrado.',
    L2: 'Confirmado por mais pessoas.',
    L3: 'Prova técnica forte.'
};

export const RecordReceipt = ({
    stopId,
    stopName,
    trustLevel = 'L1',
    isPending = false
}: RecordReceiptProps) => {
    const trustPhrase = TRUST_COPY[trustLevel] || TRUST_COPY.L1;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" role="alert">
            <div className={`p-6 rounded-[2.5rem] border text-center relative overflow-hidden
                ${isPending
                    ? 'border-amber-500/25 bg-amber-500/10'
                    : 'border-emerald-500/25 bg-emerald-500/10'}`}>

                <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className={`p-3 rounded-full mb-1
                        ${isPending ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isPending ? <WifiOff size={24} /> : <Check size={24} />}
                    </div>

                    <p className={`text-xl font-industrial italic uppercase tracking-wide
                        ${isPending ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {isPending ? 'Salvo no Celular' : 'Registrado.'}
                    </p>

                    <p className="text-sm font-bold text-white max-w-[240px] mx-auto">
                        Isso fortalece o ponto <span className="text-brand">{stopName}</span>.
                    </p>

                    <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${isPending
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200/70'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200/70'}`}>
                        {isPending
                            ? 'Pendente de envio (offline)'
                            : `Relato nível ${trustLevel}: ${trustPhrase}`}
                    </div>
                </div>
            </div>

            <NextStepBlock title="Qual o próximo passo?">
                <Link href={`/ponto/${stopId}`} className="block">
                    <Button
                        variant="secondary"
                        className="w-full justify-between group h-14"
                        icon={<ChevronRight className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                        iconPosition="right"
                    >
                        <div className="text-left">
                            <p className="text-[8px] uppercase tracking-widest opacity-60">Diagnóstico</p>
                            <p>Ver meu ponto agora</p>
                        </div>
                    </Button>
                </Link>

                <Link href="/boletim#share-pack" className="block">
                    <Button
                        variant="primary"
                        className="w-full justify-between group h-14"
                        icon={<Share2 className="opacity-50 group-hover:opacity-100 transition-all" />}
                        iconPosition="right"
                    >
                        <div className="text-left">
                            <p className="text-[8px] uppercase tracking-widest opacity-60 font-black text-black/60">Impacto</p>
                            <p>Compartilhar boletim</p>
                        </div>
                    </Button>
                </Link>
            </NextStepBlock>
        </div>
    );
};
