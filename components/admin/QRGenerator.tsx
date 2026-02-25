'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui';

export function QRGenerator({ stopId, stopName }: { stopId: string, stopName: string }) {
    const [showModal, setShowModal] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${baseUrl}/registrar?stopId=${stopId}`;
    const shortCode = `vrnp:stop:${stopId.split('-')[0]}`; // Using first part of UUID as short code for display

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
                    <title>Imprimir QR - ${stopName}</title>
                    <style>
                        body { 
                            font-family: 'Inter', sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0; 
                            background: white;
                            color: black;
                        }
                        .container { 
                            text-align: center; 
                            border: 4px solid black; 
                            padding: 60px; 
                            border-radius: 40px; 
                            max-width: 500px;
                        }
                        .brand { font-size: 14px; font-weight: 900; letter-spacing: 0.2em; margin-bottom: 20px; }
                        h1 { font-size: 32px; font-weight: 900; margin: 10px 0; text-transform: uppercase; line-height: 1; }
                        .cta { font-size: 20px; font-weight: 900; background: black; color: white; padding: 8px 20px; border-radius: 10px; margin: 20px 0; display: inline-block; }
                        .shortcode { font-size: 12px; font-family: monospace; color: #666; margin-top: 20px; }
                        .footer { margin-top: 20px; font-size: 10px; font-weight: bold; opacity: 0.5; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="brand">VR NO PONTO</div>
                        <h1>${stopName}</h1>
                        <div class="cta">ESCANEIE E REGISTRE EM 10s</div>
                        <div style="margin: 20px 0;">${content}</div>
                        <div class="shortcode">ID: ${shortCode}</div>
                        <div class="footer">PROJETO DE AUDITORIA POPULAR</div>
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
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/20 transition border border-brand/20"
            >
                <QrCode size={14} />
                Gerar QR
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0c0f14] rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-5 right-5 text-white/20 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center space-y-6 relative">
                            <div>
                                <h3 className="text-xl font-industrial italic uppercase tracking-wide text-white leading-tight">
                                    QR Code do Ponto
                                </h3>
                                <p className="text-brand text-[10px] font-black uppercase tracking-widest mt-2">{stopName}</p>
                            </div>

                            <div ref={qrRef} className="flex justify-center p-6 bg-white rounded-2xl mx-auto w-fit">
                                <QRCodeCanvas
                                    value={qrUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[14px] font-black text-white uppercase italic tracking-tight">
                                    &quot;Escaneie e registre em 10s&quot;
                                </p>
                                <p className="text-[10px] text-white/30 font-mono">
                                    Código: {shortCode}
                                </p>
                            </div>

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
