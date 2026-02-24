'use client';

import * as React from 'react';
import { Divider } from './Divider';
import { SectionCard } from './SectionCard';

interface NextStepBlockProps {
    title?: string;
    children: React.ReactNode; // Deve conter exatamente 2 botões ou CTAs
}

export const NextStepBlock = ({
    title = "Próximo Passo",
    children
}: NextStepBlockProps) => {
    return (
        <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Divider label={title.toUpperCase()} />
            <SectionCard
                title={title}
                subtitle="O que você deseja fazer agora?"
                className="bg-brand/[0.02] border-brand/10"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {children}
                </div>
            </SectionCard>
        </div>
    );
};
