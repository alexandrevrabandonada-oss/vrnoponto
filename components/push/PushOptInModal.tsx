'use client';

import React from 'react';
import { Card, Button } from '@/components/ui';
import { Bell, ShieldCheck, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushOptInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function PushOptInModal({ isOpen, onClose, onSuccess }: PushOptInModalProps) {
    const { subscribe, loading } = usePushNotifications();

    if (!isOpen) return null;

    const handleSubscribe = async () => {
        try {
            const ok = await subscribe();
            if (ok) {
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch {
            // Error is handled in the hook
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card variant="surface" className="max-w-md w-full p-0 overflow-hidden border-brand/20 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="bg-brand/10 p-4 rounded-2xl text-brand">
                            <Bell size={32} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black font-industrial uppercase tracking-tight text-white leading-tight">
                            Ativar Alertas Úteis
                        </h2>
                        <p className="text-sm text-muted leading-relaxed">
                            Comece no modo resumo diário (sem spam, no máximo 1 por dia) e ajuste para tempo real se quiser.
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-3 bg-white/[0.03] p-4 rounded-xl border border-white/5">
                            <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-white/70 leading-snug">
                                <strong className="text-white">Privacidade Garantida:</strong> Não pedimos seu e-mail ou telefone. O cancelamento é instantâneo via navegador.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            variant="primary"
                            className="h-14 !text-lg !font-black !uppercase !tracking-widest"
                            onClick={handleSubscribe}
                            loading={loading}
                        >
                            Sim, Ativar Alertas
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-12 !text-xs !uppercase text-muted"
                            onClick={onClose}
                        >
                            Agora Não
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
