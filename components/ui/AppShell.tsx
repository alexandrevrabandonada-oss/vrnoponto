'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { BrandSymbol } from './BrandSymbol';
import { IconButton } from './IconButton';
import { SettingsModal } from './SettingsModal';

interface AppShellProps {
    title?: string;
    backHref?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export const AppShell = ({ title, backHref, children, actions }: AppShellProps) => {
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const handleBack = () => {
        if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white flex flex-col">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 industrial-texture opacity-20 pointer-events-none z-0" />

            {/* Topbar */}
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
                        <span className="font-industrial text-sm tracking-[0.2em] uppercase opacity-70">
                            {title || 'VR NO PONTO'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {actions}
                    <IconButton
                        icon={<Settings size={20} />}
                        variant="ghost"
                        onClick={() => setIsSettingsOpen(true)}
                        aria-label="Configurações de Acessibilidade"
                        className="!p-2 hover:bg-white/5"
                    />
                </div>
            </header>

            {/* Content Container */}
            <main className="flex-1 relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>

            {/* Accessibility Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
