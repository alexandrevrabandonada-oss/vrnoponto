'use client';

import { useState } from 'react';
import { Package, X, Copy, ExternalLink, Printer, ShieldCheck, MapPin } from 'lucide-react';
import { Card, Button, Input, Field } from '@/components/ui';

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
            <Button
                variant="secondary"
                onClick={() => setIsOpen(true)}
                className="!h-9 !px-3 !text-[10px]"
            >
                <Package size={14} className="mr-2" /> Gerar Kit
            </Button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 p-0 border-white/10 ring-1 ring-white/5">
                        {/* Preview Side */}
                        <div className="bg-zinc-950 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-brand/5 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-brand) 0%, transparent 70%)' }} />
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-10 relative z-10">Preview do Ativo</h3>

                            <div className="relative z-10 bg-black p-6 rounded-3xl shadow-2xl border border-brand/30 w-52 h-52 flex flex-col items-center justify-center text-center group">
                                <div className="absolute -inset-1 bg-brand/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <ShieldCheck className="text-brand mb-4 relative" size={48} strokeWidth={2.5} />
                                <div className="text-xs font-black leading-tight text-white uppercase tracking-tighter relative">{partner.name}</div>
                                <div className="bg-brand text-black text-[9px] font-black px-3 py-1 rounded-full mt-4 uppercase tracking-widest relative">Parceiro Oficial</div>
                            </div>

                            <p className="text-[9px] text-muted mt-10 font-bold max-w-[140px] text-center uppercase tracking-tight opacity-40 relative z-10">Formato 1:1 otimizado para sinalização e digital.</p>
                        </div>

                        {/* Controls Side */}
                        <div className="flex-1 p-8 flex flex-col bg-zinc-900/50">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-white leading-tight tracking-tighter uppercase">{partner.name}</h2>
                                    <div className="flex items-center gap-2 text-muted text-[10px] font-black uppercase tracking-widest mt-2">
                                        <MapPin size={12} className="text-brand" /> {partner.neighborhood}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsOpen(false)}
                                    className="!p-0 !h-10 !w-10 !rounded-full opacity-40 hover:opacity-100"
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="space-y-6 flex-1">
                                <Field label="Página do Parceiro" hint="Link público para divulgação">
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={publicUrl}
                                            className="flex-1 !text-[11px] font-mono opacity-80"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={copyToClipboard}
                                            className={`!w-12 !p-0 ${copied ? '!bg-emerald-500/10 !border-emerald-500/20 !text-emerald-400' : ''}`}
                                        >
                                            {copied ? <ShieldCheck size={20} /> : <Copy size={20} />}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            href={publicUrl}
                                            target="_blank"
                                            className="!w-12 !p-0 flex items-center justify-center"
                                        >
                                            <ExternalLink size={20} />
                                        </Button>
                                    </div>
                                </Field>

                                <div className="grid grid-cols-1 gap-4 pt-4 text-center">
                                    <Button
                                        href={sealUrl}
                                        download={`selo-${partner.id}.png`}
                                        className="h-16 rounded-2xl group flex items-center justify-center"
                                    >
                                        <ShieldCheck size={20} className="mr-3 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Baixar Selo de Auditoria</span>
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        href={posterUrl}
                                        target="_blank"
                                        className="h-16 rounded-2xl group border-white/5 hover:border-white/20 flex items-center justify-center"
                                    >
                                        <Printer size={20} className="mr-3 group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Imprimir Cartaz A4</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-brand/40 font-black text-[9px] uppercase tracking-widest">
                                    <ShieldCheck size={12} /> Diretriz de Auditoria
                                </div>
                                <p className="text-[10px] text-muted mt-2 font-bold leading-relaxed uppercase tracking-tight opacity-40">
                                    O Cartaz deve ser fixado em altura visível (1.50m). Não altere as proporções do selo digital.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
