'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, QrCode, Loader2, X } from 'lucide-react';

export function QRGenerator({ stopId, partnerId, stopName }: { stopId?: string, partnerId?: string, stopName: string }) {
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    async function generateQR() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/qr/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stop_id: stopId,
                    partner_id: partnerId
                })
            });
            const data = await res.json();
            if (data.qr_url) {
                setQrUrl(data.qr_url);
                setShowModal(true);

                // Log telemetry on successful kit generation
                fetch('/api/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'partner_kit_generated' }),
                }).catch(() => { });
            }
        } catch (err) {
            console.error('Failed to generate QR', err);
        } finally {
            setLoading(false);
        }
    }

    const downloadPNG = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `QR-${stopName.replace(/\s+/g, '-')}.png`;
        link.href = url;
        link.click();
    };

    const printQR = () => {
        const content = qrRef.current?.innerHTML;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir QR Code - ${stopName}</title>
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .container { text-align: center; border: 2px solid #eee; padding: 40px; border-radius: 20px; }
                        h1 { font-size: 24px; margin-bottom: 8px; }
                        h2 { font-size: 18px; color: #666; margin-bottom: 40px; }
                        .footer { margin-top: 40px; font-weight: bold; color: #ef4444; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>VR NO PONTO</h1>
                        <h2>${stopName}</h2>
                        ${content}
                        <div class="footer">AUDITORIA POPULAR - ESCANEIE PARA VALIDAR</div>
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <>
            <button
                onClick={generateQR}
                disabled={loading}
                className="flex items-center gap-2 bg-brand/20 text-brand px-3 py-1.5 rounded-lg font-bold hover:bg-brand/30 transition disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
                Gerar QR
            </button>

            {showModal && qrUrl && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-4">
                            <h3 className="text-xl font-black text-gray-900 leading-tight">
                                QR Code de Auditoria
                            </h3>
                            <p className="text-gray-500 text-sm">Escaneie para validar presença em {stopName}</p>

                            <div ref={qrRef} className="flex justify-center py-6 bg-gray-50 rounded-xl">
                                <QRCodeCanvas
                                    value={qrUrl}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={downloadPNG}
                                    className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                                >
                                    <Download size={18} />
                                    PNG
                                </button>
                                <button
                                    onClick={printQR}
                                    className="flex items-center justify-center gap-2 bg-brand text-black py-3 rounded-xl font-bold hover:brightness-110 transition shadow-none"
                                >
                                    <Printer size={18} />
                                    Imprimir A4
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
