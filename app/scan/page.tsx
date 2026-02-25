'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, QrCode, X, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { AppShell, PageHeader, Button, PrimaryCTA, InlineAlert } from '@/components/ui';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { trackFunnel, FUNNEL_EVENTS } from '@/lib/telemetry';
import { parseQrContent } from '@/lib/qrUtils';

export default function ScanPage() {
    const router = useRouter();
    const [isScannerActive, setIsScannerActive] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleScanResult = useCallback((text: string) => {
        const target = parseQrContent(text);
        if (target) {
            trackFunnel(FUNNEL_EVENTS.QR_SCAN_SUCCESS as any);
            router.push(target);
            return true;
        }
        return false;
    }, [router]);

    const startScanner = () => {
        setIsScannerActive(true);
        trackFunnel(FUNNEL_EVENTS.QR_SCAN_OPEN as any);

        // Initialize after small delay to ensure div is rendered
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                scanner.clear().then(() => {
                    if (!handleScanResult(decodedText)) {
                        setError(`QR Inválido: ${decodedText}`);
                        setIsScannerActive(false);
                        trackFunnel(FUNNEL_EVENTS.QR_SCAN_FAIL as any);
                    }
                }).catch(err => console.error(err));
            }, (error) => {
                // handle scan failures
            });

            // Handle ESC to close
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    scanner.clear().then(() => setIsScannerActive(false));
                }
            };
            window.addEventListener('keydown', handleEsc);
        }, 100);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode) return;

        if (!handleScanResult(manualCode)) {
            setError("Código manual não reconhecido. Use o link completo ou o ID do ponto.");
            trackFunnel(FUNNEL_EVENTS.QR_SCAN_FAIL as any);
        }
    };

    return (
        <AppShell title="Escanear QR">
            <div className="max-w-md mx-auto py-8 space-y-8 p-4">
                <PageHeader
                    title="Acesso via QR"
                    subtitle="Escaneie o código do ponto ou digite manualmente"
                    className="!text-center"
                />

                {!isScannerActive ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <PrimaryCTA
                            onClick={startScanner}
                            icon={<Camera size={24} />}
                            className="!h-32 !rounded-[2.5rem] !text-xl font-black uppercase italic tracking-tight"
                        >
                            Abrir Câmera
                        </PrimaryCTA>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                <span className="bg-[#0a0a0a] px-4 text-white/30">OU DIGITE</span>
                            </div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Código do Ponto / Link</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="Ex: vrnp:stop:123 ou link completo"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-all font-bold h-14 pr-12"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-black rounded-xl hover:bg-brand/90 transition-colors"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </form>

                        {error && (
                            <InlineAlert variant="error" title="Erro na leitura">
                                {error}
                            </InlineAlert>
                        )}

                        <div className="p-6 border border-dashed border-white/10 rounded-[2rem] text-center space-y-3">
                            <QrCode size={32} className="mx-auto text-white/10" />
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                                Aponte a câmera para o adesivo do projeto<br />ou cole o link que recebeu.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
                        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <Camera size={24} className="text-brand" />
                                <span className="text-sm font-black text-white uppercase italic tracking-tight">Escaneando...</span>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setIsScannerActive(false)}
                                className="!h-12 !px-4 bg-white/5 rounded-full"
                            >
                                <X size={24} />
                            </Button>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
                            <div id="reader" className="w-full max-w-sm aspect-square bg-zinc-900 rounded-3xl overflow-hidden border-2 border-brand/20 shadow-2xl"></div>

                            <p className="text-[11px] font-black uppercase tracking-widest text-white/40 text-center max-w-[200px]">
                                Enquadre o QR Code dentro do quadrado acima.
                            </p>

                            <Button
                                variant="secondary"
                                onClick={() => setIsScannerActive(false)}
                                className="!h-14 !px-8 text-[10px]"
                            >
                                Cancelar e voltar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
