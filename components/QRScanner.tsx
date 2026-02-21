'use client';

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QRScanner({ onClose }: { onClose: () => void }) {
    const router = useRouter();

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // O link gerado é https://.../qr/TOKEN
                // Se o usuário escanea o link oficial, redirecionamos.
                if (decodedText.includes('/qr/')) {
                    scanner.clear();
                    router.push(decodedText.split(window.location.origin)[1] || decodedText);
                    onClose();
                } else {
                    // Se for só o token (fallback manual)
                    scanner.clear();
                    router.push(`/qr/${decodedText}`);
                    onClose();
                }
            },
            (error) => {
                // Ignore scanner search errors
            }
        );

        return () => {
            scanner.clear().catch((err: unknown) => {
                console.error("Failed to clear scanner", err);
            });
        };
    }, [onClose, router]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold">
                        <Camera size={18} />
                        <span>Escaneie o QR Code</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div id="reader" className="w-full"></div>

                <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm">
                        Aponte para o QR Code fixado no ponto de ônibus para validar sua presença.
                    </p>
                </div>
            </div>
        </div>
    );
}
