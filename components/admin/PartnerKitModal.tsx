'use client';

import { useState } from 'react';
import { Package, X, Copy, ExternalLink, Printer, ShieldCheck, MapPin } from 'lucide-react';

interface Partner {
    id: string;
    name: string;
    neighborhood: string;
}

export function PartnerKitModal({ partner }: { partner: Partner }) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/parceiro/${partner.id}`;
    const sealUrl = `/api/admin/partner/kit/seal?id=${partner.id}`;
    const posterUrl = `/api/admin/partner/kit/poster?id=${partner.id}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors"
            >
                <Package size={14} /> Gerar Kit
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
                        {/* Preview Side */}
                        <div className="bg-gray-100 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Preview do Selo</h3>
                            <div className="bg-white p-4 rounded-2xl shadow-lg border-4 border-indigo-600 w-48 h-48 flex flex-col items-center justify-center text-center">
                                <ShieldCheck className="text-indigo-600 mb-2" size={40} />
                                <div className="text-[10px] font-black leading-tight text-gray-900 uppercase">{partner.name}</div>
                                <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full mt-2 uppercase">Verificado</div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-6 font-medium max-w-[120px] text-center">O selo 1:1 é ideal para redes sociais e adesivos.</p>
                        </div>

                        {/* Controls Side */}
                        <div className="flex-1 p-8 flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{partner.name}</h2>
                                    <div className="flex items-center gap-1 text-gray-500 text-sm font-medium mt-1">
                                        <MapPin size={14} /> {partner.neighborhood}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                {/* Link Box */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Link da Página Pública</label>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={publicUrl}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 font-medium focus:outline-none"
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            className={`p-2 rounded-xl border transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            {copied ? <ShieldCheck size={20} /> : <Copy size={20} />}
                                        </button>
                                        <a
                                            href={publicUrl}
                                            target="_blank"
                                            className="p-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all"
                                        >
                                            <ExternalLink size={20} />
                                        </a>
                                    </div>
                                </div>

                                {/* Download Buttons */}
                                <div className="grid grid-cols-1 gap-3 pt-4">
                                    <a
                                        href={sealUrl}
                                        download={`selo-${partner.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all text-sm"
                                    >
                                        <ShieldCheck size={18} /> Baixar Selo (SVG/PNG)
                                    </a>
                                    <a
                                        href={posterUrl}
                                        target="_blank"
                                        className="w-full bg-white border-2 border-gray-900 text-gray-900 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-900 hover:text-white active:scale-95 transition-all text-sm"
                                    >
                                        <Printer size={18} /> Imprimir Cartaz A4
                                    </a>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-indigo-600/60 font-black text-[10px] uppercase tracking-widest">
                                    <ShieldCheck size={12} /> Dica de Auditoria
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 font-medium leading-relaxed">
                                    O Cartaz A4 deve ser colocado em local de fácil visibilidade no estabelecimento. Evite colagens em espaços públicos externos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
