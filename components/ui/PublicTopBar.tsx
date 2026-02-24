'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { IconButton } from './IconButton';
import { BrandSymbol } from './BrandSymbol';

interface PublicTopBarProps {
    title: string;
    backHref?: string;
}

export const PublicTopBar = ({ title, backHref }: PublicTopBarProps) => {
    const router = useRouter();

    const handleBack = () => {
        if (backHref) {
            router.push(backHref);
        } else {
            // Se não houver histórico, vai para a home
            if (window.history.length <= 1) {
                router.push('/');
            } else {
                router.back();
            }
        }
    };

    return (
        <header className="sticky top-0 z-50 glass border-b border-white/5 px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <IconButton
                    icon={<ArrowLeft size={24} />}
                    variant="ghost"
                    onClick={handleBack}
                    aria-label="Voltar"
                    className="!p-2 -ml-2 hover:bg-white/5 active:scale-90"
                />
                <div className="flex items-center gap-2">
                    <BrandSymbol className="w-4 h-4 text-brand opacity-50" />
                    <h2 className="font-industrial text-sm tracking-[0.2em] uppercase text-white italic">
                        {title}
                    </h2>
                </div>
            </div>

            <IconButton
                icon={<HelpCircle size={20} />}
                variant="ghost"
                onClick={() => router.push('/como-usar')}
                aria-label="Ajuda e Como Funciona"
                className="!p-2 hover:bg-white/5 text-muted hover:text-brand transition-colors"
            />
        </header>
    );
};
