'use client';

import * as React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Card, Button, IconButton } from './ui';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-md !p-8 relative border-brand/20 shadow-[0_0_50px_rgba(246,198,0,0.1)]" variant="surface">
                <div className="absolute top-4 right-4">
                    <IconButton icon={<X size={20} />} variant="ghost" onClick={onClose} aria-label="Fechar" />
                </div>

                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                        <ShieldCheck size={40} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-industrial uppercase tracking-tight text-white">Privacidade Técnica</h2>
                        <p className="text-muted text-sm leading-relaxed">
                            O VR no Ponto é uma ferramenta de auditoria pública e independente.
                        </p>
                    </div>

                    <div className="w-full space-y-4 text-left border-t border-white/5 pt-6">
                        <div className="flex gap-4">
                            <div className="font-industrial text-brand text-xl">01</div>
                            <p className="text-xs text-muted-foreground leading-snug">
                                <strong className="text-white uppercase block mb-1">Sem Login</strong>
                                Não coletamos e-mail, nome ou senhas. Seu acesso é 100% anônimo por padrão.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="font-industrial text-brand text-xl">02</div>
                            <p className="text-xs text-muted-foreground leading-snug">
                                <strong className="text-white uppercase block mb-1">Dados de Localização</strong>
                                Usamos sua posição apenas para validar o ponto de ônibus. Nenhum histórico de rastreio é mantido.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="font-industrial text-brand text-xl">03</div>
                            <p className="text-xs text-muted-foreground leading-snug">
                                <strong className="text-white uppercase block mb-1">Auditoria Coletiva</strong>
                                Os registros são agregados para gerar métricas de transparência para toda a população de VR.
                            </p>
                        </div>
                    </div>

                    <Button onClick={onClose} className="w-full mt-4">
                        Entendido
                    </Button>
                </div>
            </Card>
        </div>
    );
}
