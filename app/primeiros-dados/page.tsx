'use client';

import Link from 'next/link';
import { Share2, Database, CheckCircle2 } from 'lucide-react';
import { AppShell, PublicTopBar, PageHeader, Card, Button } from '@/components/ui';

export default function PrimeirosDadosPage() {
    const handleShare = async () => {
        const text = 'A base do VR no Ponto está começando. Com 2 registros rápidos a cidade já ganha visibilidade real.';
        const url = typeof window !== 'undefined' ? window.location.origin + '/boletim' : '/boletim';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'VR no Ponto - Primeiros Dados',
                    text,
                    url
                });
                return;
            } catch {
                // fallback clipboard below
            }
        }

        try {
            await navigator.clipboard.writeText(`${text} ${url}`);
        } catch {
            // no-op
        }
    };

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Primeiros Dados" />

            <div className="max-w-md mx-auto py-6 space-y-6">
                <PageHeader
                    title="Primeiros Dados"
                    subtitle="A base ainda está crescendo. Com poucas ações já dá para ligar o mapa da cidade."
                />

                <Card variant="surface2" className="border-brand/20 bg-brand/5 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-brand/20 text-brand">
                            <Database size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">Por que isso importa</p>
                            <p className="text-xs text-white/70 mt-1">
                                Sem amostra mínima, o sistema não consegue separar atraso real de ruído.
                                Com registros em pontos diferentes, os rankings e alertas ficam confiáveis.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs text-white/80">
                        <p className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand" /> 1 registro já cria sinal local.</p>
                        <p className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand" /> 2 registros em pontos diferentes melhoram a leitura.</p>
                        <p className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand" /> compartilhar acelera a amostra da comunidade.</p>
                    </div>
                </Card>

                <div className="space-y-3">
                    <Link href="/no-ponto" className="block">
                        <Button variant="primary" className="w-full h-12 !text-[10px] font-black uppercase tracking-widest">
                            Registrar agora
                        </Button>
                    </Link>

                    <Button
                        variant="secondary"
                        onClick={handleShare}
                        className="w-full h-12 !text-[10px] font-black uppercase tracking-widest"
                        icon={<Share2 size={14} />}
                    >
                        Compartilhar
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
