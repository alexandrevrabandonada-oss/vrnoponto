'use client';

import * as React from 'react';
import { PublicQuickActions } from './PublicQuickActions';
import { PublicTopBar } from './PublicTopBar';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AppShellProps {
    title?: string;
    backHref?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    hideHeader?: boolean;
    showQuickActions?: boolean;
}

export const AppShell = ({
    title,
    backHref,
    children,
    actions,
    hideHeader = false,
    showQuickActions = true
}: AppShellProps) => {
    const { isOnline, pendingCount } = useOfflineSync();

    return (
        <div className="min-h-screen bg-[#070707] text-white flex flex-col">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 industrial-texture opacity-20 pointer-events-none z-0" />

            {/* Topbar */}
            {!hideHeader && (
                <PublicTopBar title={title || 'VR NO PONTO'} backHref={backHref} actions={actions} />
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
            <main className={cn(
                "flex-1 relative z-10 w-full max-w-4xl mx-auto px-4 py-8",
                showQuickActions && "pb-32"
            )}>
                {children}
            </main>

            {/* Unified Quick Actions */}
            {showQuickActions && <PublicQuickActions />}
        </div>
    );
};
