'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InlineAlert } from '@/components/ui';

export function QRScanner({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
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
            // handle success
            scanner.clear().then(() => {
                // If it's a internal link, extract token
                if (decodedText.includes('/qr/')) {
                    const token = decodedText.split('/qr/')[1];
                    router.push(`/qr/${token}`);
                } else {
                    setError("QR inválido ou não suportado (" + decodedText + ")");
                    setTimeout(() => setError(null), 4000);
                }
            }).catch(err => console.error("Error clearing scanner", err));
        }, () => {
            // handle failure (scanning)
            // console.warn(errorMessage);
        });

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner on unmount", err));
            }
        };
    }, [router, onClose]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
                <div className="p-4 flex justify-between items-center border-b border-zinc-800">
                    <div className="flex items-center gap-2 text-white font-bold tracking-tight">
                        <Camera size={20} className="text-brand" />
                        <span>Escanear QR Code</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                        <X size={20} />
                    </button>
                </div>

                <div id="reader" className="w-full aspect-square bg-black"></div>

                <div className="p-6 text-center space-y-4">
                    <p className="text-zinc-500 text-sm font-medium">Aponte a câmera para o QR Code impresso no ponto ou estabelecimento.</p>
                    {error && (
                        <InlineAlert variant="error" title="Leitura Recusada">
                            {error}
                        </InlineAlert>
                    )}
                </div>
            </div>
        </div>
    );
}
