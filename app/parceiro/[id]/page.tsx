'use client';

import { useEffect, useState, use } from 'react';
import { ShieldCheck, MapPin, Info, ArrowRight, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';

interface PartnerDetail {
    id: string;
    name: string;
    category: string;
    address: string;
    neighborhood: string;
}

export default function PartnerPublicPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [partner, setPartner] = useState<PartnerDetail | null>(null);
    const [qrToken, setQrToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDetail() {
            try {
                const res = await fetch(`/api/partner/detail?id=${params.id}`);
                const data = await res.json();
                if (res.ok) {
                    setPartner(data.partner);
                    setQrToken(data.qr_token);
                } else {
                    setError(data.error);
                }
            } catch {
                setError('Erro ao carregar dados do parceiro.');
            } finally {
                setLoading(false);
            }
        }
        fetchDetail();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-brand" size={40} />
            </div>
        );
    }

    if (error || !partner) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-50 p-6 rounded-full text-red-500 mb-4">
                    <MapPin size={48} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 leading-tight">Parceiro não encontrado</h1>
                <p className="text-gray-500 mt-2">{error || 'Este local não está cadastrado ou está inativo.'}</p>
                <Link href="/parceiros" className="mt-8 text-brand font-bold flex items-center gap-2">
                    <ArrowRight size={16} className="rotate-180" /> Voltar para a lista
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Header Hero */}
            <header className="bg-zinc-900 border-b border-brand/20 text-white pt-12 pb-16 px-6 relative rounded-b-[40px] overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-brand">
                    <ShieldCheck size={120} />
                </div>

                <div className="max-w-2xl mx-auto relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-brand/20 text-brand border border-brand/30 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded">
                            {partner.category} Verificado
                        </span>
                    </div>
                    <h1 className="text-4xl font-black font-industrial uppercase tracking-tight leading-[1.1] mb-2">{partner.name}</h1>
                    <div className="flex items-center gap-2 text-white/70 font-medium">
                        <MapPin size={16} className="text-brand" />
                        <span>{partner.neighborhood}{partner.address ? ` • ${partner.address}` : ''}</span>
                    </div>
                </div>
            </header>

            {/* Content Card */}
            <div className="max-w-xl mx-auto px-6 -mt-8 space-y-6">
                {/* Validation CTA */}
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200 border border-zinc-100">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-emerald-100 p-3 rounded-2xl">
                            <ShieldCheck className="text-emerald-600" size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 leading-tight">Ponto Autorizado</h2>
                            <p className="text-sm text-gray-500 font-medium leading-normal">Validar presença aqui garante o nível máximo de confiabilidade.</p>
                        </div>
                    </div>

                    {qrToken ? (
                        <Link
                            href={`/qr/${qrToken}`}
                            className="block w-full bg-brand hover:brightness-110 text-black text-center py-5 rounded-2xl font-black text-lg active:scale-95 transition-all"
                        >
                            Validar Presença Agora
                        </Link>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-center">
                            <p className="text-gray-500 text-sm font-bold italic">Procure o QR Code físico no balcão deste local para validar.</p>
                        </div>
                    )}
                </div>

                {/* How it works */}
                <section className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 px-2">Como Funciona</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { step: '01', title: 'Visite o Local', desc: 'Vá até o estabelecimento parceiro e localize o cartaz oficial.' },
                            { step: '02', title: 'Escaneie o QR', desc: 'Use sua câmera ou o validador do app para ler o código.' },
                            { step: '03', title: 'Ganhe Trust L3', desc: 'Seus relatos recentes serão automaticamente promovidos.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100">
                                <span className="text-brand font-black text-xs mt-1">{item.step}</span>
                                <div>
                                    <h4 className="font-bold text-gray-900 leading-tight">{item.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Transparency */}
                <section className="bg-brand/10 p-6 rounded-3xl border border-brand/20 space-y-3">
                    <div className="flex items-center gap-2 text-brand font-black uppercase text-[10px] tracking-widest">
                        <Info size={14} /> Transparência ao Cidadão
                    </div>
                    <p className="text-zinc-700 text-sm leading-relaxed font-medium">
                        Os **Pontos Parceiros** são locais físicos autorizados pela comunidade para expandir a auditoria urbana.
                        Este local não é necessariamente um ponto de ônibus, mas um local seguro onde você pode confirmar sua identidade civil no sistema sem a necessidade de colagem de adesivos em patrimônio público.
                    </p>
                </section>

                {/* Footer Controls */}
                <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-white border border-gray-200 py-4 rounded-2xl font-bold text-gray-700 flex items-center justify-center gap-2 shadow-sm">
                        <Share2 size={18} /> Compartilhar
                    </button>
                </div>
            </div>

            {/* Bottom Spacer */}
            <div className="h-10" />
        </main>
    );
}
