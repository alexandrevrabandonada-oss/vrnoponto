'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorStandalone extends Navigator {
    standalone?: boolean;
}

export function InstallPrompt() {
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // 1. Detect environment
        const nav = window.navigator as NavigatorStandalone;
        const isIOSDevice = /iPad|iPhone|iPod/.test(nav.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone;

        // Use a small delay to avoid "setState synchronously in effect" warning
        const timer = setTimeout(() => {
            if (isIOSDevice) setIsIOS(true);
        }, 0);

        if (isStandalone) {
            clearTimeout(timer);
            return;
        }

        // 2. Setup logic for prompt
        const checkPrompt = () => {
            const dismissed = localStorage.getItem('pwa_prompt_dismissed');
            const actionCount = parseInt(localStorage.getItem('pwa_action_count') || '0', 10);

            if (dismissed === 'true' || actionCount < 2) return;

            setShow(true);
        };

        // Listen for beforeinstallprompt (Android/Chrome)
        const handler = (e: Event) => {
            const promptEvent = e as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setDeferredPrompt(promptEvent);
            checkPrompt();
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Manual check for iOS (since it doesn't have the event)
        if (isIOSDevice) {
            checkPrompt();
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShow(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa_prompt_dismissed', 'true');
        setShow(false);
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-6 left-4 right-4 z-[100] max-w-sm mx-auto"
            >
                <Card variant="surface" className="!p-5 shadow-2xl border-brand/30 bg-black/90 backdrop-blur-xl relative overflow-hidden">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-2 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                            <div className="h-8 w-8 bg-brand rounded-lg flex items-center justify-center">
                                <Download size={20} className="text-black" />
                            </div>
                        </div>

                        <div className="flex-1 pr-6">
                            <h3 className="font-industrial text-sm text-white tracking-widest uppercase italic">Instalar VR no Ponto</h3>
                            <p className="text-[10px] text-white/60 font-medium leading-relaxed mt-1">
                                {isIOS
                                    ? "Toque em compartilhar e 'Adicionar à Tela de Início' para usar como aplicativo."
                                    : "Adicione o app à sua tela inicial para acesso rápido e offline básico."}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        {isIOS ? (
                            <div className="flex items-center justify-center gap-4 py-2 border border-white/5 bg-white/[0.02] rounded-xl">
                                <div className="flex flex-col items-center gap-1 opacity-60">
                                    <Share size={16} className="text-brand" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Compartilhar</span>
                                </div>
                                <X size={12} className="opacity-20" />
                                <div className="flex flex-col items-center gap-1 opacity-60">
                                    <PlusSquare size={16} className="text-brand" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Tela de Início</span>
                                </div>
                            </div>
                        ) : (
                            <Button
                                onClick={handleInstall}
                                className="w-full bg-brand text-black font-black uppercase text-[10px] tracking-widest h-10 rounded-xl"
                            >
                                Instalar Agora
                            </Button>
                        )}
                        <button
                            onClick={handleDismiss}
                            className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white/50 transition-colors py-1"
                        >
                            Agora não
                        </button>
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
