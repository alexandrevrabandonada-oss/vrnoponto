'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, QrCode, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui';

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
                className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/20 transition disabled:opacity-50 border border-brand/20"
            >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <QrCode size={14} />}
                Gerar QR
            </button>

            {showModal && qrUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0c0f14] rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16" />

                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-5 right-5 text-white/20 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-6 relative">
                            <div>
                                <h3 className="text-xl font-industrial italic uppercase tracking-wide text-white leading-tight">
                                    QR Code de Auditoria
                                </h3>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2">{stopName}</p>
                            </div>

                            <div ref={qrRef} className="flex justify-center p-6 bg-white rounded-2xl">
                                <QRCodeCanvas
                                    value={qrUrl}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <p className="text-[11px] text-white/30 leading-relaxed px-4">
                                Posicione este QR Code em local visível no ponto para que os usuários possam validar sua presença.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={downloadPNG}
                                    className="!h-12 !text-[10px] font-black uppercase tracking-widest"
                                    icon={<Download size={16} />}
                                >
                                    PNG
                                </Button>
                                <Button
                                    onClick={printQR}
                                    className="!h-12 !text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20"
                                    icon={<Printer size={16} />}
                                >
                                    Imprimir A4
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
