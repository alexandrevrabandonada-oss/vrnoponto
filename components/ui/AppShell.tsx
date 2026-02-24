'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { BrandSymbol } from './BrandSymbol';
import { IconButton } from './IconButton';
import { SettingsModal } from './SettingsModal';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppShellProps {
    title?: string;
    backHref?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    hideHeader?: boolean;
}

export const AppShell = ({ title, backHref, children, actions, hideHeader = false }: AppShellProps) => {
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const { isOnline, pendingCount } = useOfflineSync();

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
            {!hideHeader && (
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
            )}

            {/* Global Offline/Sync Banner */}
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-brand/10 border-b border-brand/20 relative z-40 overflow-hidden"
                    >
                        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <WifiOff size={14} className="text-brand animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand">Modo Offline — Relatos salvos no celular</span>
                            </div>
                            {pendingCount > 0 && (
                                <div className="flex items-center gap-1.5 bg-brand/20 px-2 py-0.5 rounded text-brand">
                                    <CloudUpload size={12} />
                                    <span className="text-[9px] font-black">{pendingCount} Pendentes</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Container */}
            <main className="flex-1 relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>

            {/* Accessibility Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
