'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Info, ArrowRight, Loader2, Copy, Check, MessageCircle } from 'lucide-react';
import type { PartnerMapItem } from '@/components/DelayMap';
import Link from 'next/link';
import { getWhatsAppShort, getInstagramDM } from '@/lib/editorial/partner_invite';

// Import map dynamically for Client Side
const DelayMap = dynamic(() => import('@/components/DelayMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse flex flex-col items-center justify-center text-gray-400 gap-2">
            <Loader2 className="animate-spin" />
            <span className="text-sm font-medium">Carregando Mapa...</span>
        </div>
    )
});

interface Partner {
    id: string;
    name: string;
    category: string;
    neighborhood: string;
    location: {
        lat: number;
        lng: number;
    } | null;
}

export default function ParceirosPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

    const copyInvite = (type: string) => {
        const text = type === 'whatsapp' ? getWhatsAppShort() : getInstagramDM();
        navigator.clipboard.writeText(text);
        setCopiedInvite(type);
        setTimeout(() => setCopiedInvite(null), 2000);
    };

    useEffect(() => {
        async function fetchPartners() {
            const supabase = createClient();
            const { data } = await supabase
                .from('partners')
                .select('id, name, category, neighborhood, location')
                .eq('is_active', true);

            if (data) {
                const partnersData = data as unknown as Array<{ id: string, name: string, category: string, neighborhood: string, location: { lat: number, lng: number } | string | null }>;
                const mapped = partnersData.map(p => {
                    const loc = p.location;
                    if (typeof loc === 'string') {
                        const coords = loc.match(/POINT\((.+) (.+)\)/);
                        if (coords) return { ...p, location: { lng: parseFloat(coords[1]), lat: parseFloat(coords[2]) } };
                    }
                    return p;
                });
                setPartners(mapped as Partner[]);
            }
            setLoading(false);
        }
        fetchPartners();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <header className="bg-indigo-900 text-white p-6 rounded-b-3xl shadow-lg">
                <h1 className="text-2xl font-black">Pontos Parceiros</h1>
                <p className="text-indigo-200 text-sm mt-1">Locais autorizados para validar sua presença (L3).</p>
            </header>

            <div className="p-4 space-y-4">
                {/* Join CTA */}
                <Link href="/parceiros/entrar"
                    className="flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all">
                    <div>
                        <div className="font-black text-sm">Quero ser um Ponto Parceiro</div>
                        <div className="text-indigo-200 text-xs mt-0.5">Cadastro gratuito em 2 minutos</div>
                    </div>
                    <ArrowRight size={20} className="text-indigo-200" />
                </Link>

                {/* Invite Copy Buttons */}
                <div className="flex gap-2">
                    <button onClick={() => copyInvite('whatsapp')}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50 px-3 py-2.5 rounded-2xl text-xs font-bold transition hover:bg-green-100 active:scale-95">
                        {copiedInvite === 'whatsapp' ? <Check size={14} className="text-current" /> : <Copy size={14} />}
                        Copiar convite WhatsApp
                    </button>
                    <button onClick={() => copyInvite('instagram')}
                        className="flex-1 flex items-center justify-center gap-2 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 px-3 py-2.5 rounded-2xl text-xs font-bold transition hover:bg-pink-100 active:scale-95">
                        {copiedInvite === 'instagram' ? <Check size={14} className="text-current" /> : <MessageCircle size={14} />}
                        Copiar convite Instagram
                    </button>
                </div>
                {/* Map Section */}
                <div className="h-[300px] w-full bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-inner border dark:border-gray-700 relative z-0">
                    <DelayMap stops={[]} partners={partners as unknown as PartnerMapItem[]} />
                </div>

                <div className="flex items-start gap-2 px-1 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                    <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-indigo-900/70 dark:text-indigo-300/70 font-medium leading-tight">
                        Escaneie o QR oficial nestes locais (balcões, totens ou adesivos) para ganhar Prova de Presença (L3) e ajudar na auditoria.
                    </span>
                </div>

                {/* List Section */}
                <div className="grid grid-cols-1 gap-3">
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
                        </div>
                    ) : partners.map(partner => (
                        <div key={partner.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group active:scale-[0.98] transition-all">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">{partner.name}</h3>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                                        {partner.category}
                                    </span>
                                    <span>•</span>
                                    <MapPin size={12} />
                                    <span>{partner.neighborhood || 'Localização'}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-full">
                                <ArrowRight size={18} className="text-gray-400" />
                            </div>
                        </div>
                    ))}
                    {!loading && partners.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhum parceiro ativo encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation Space */}
            <div className="h-16" />
        </div>
    );
}
