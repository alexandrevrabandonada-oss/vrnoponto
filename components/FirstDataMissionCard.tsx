'use client';

import { Share2 } from 'lucide-react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';

interface FirstDataMissionCardProps {
    title?: string;
}

export function FirstDataMissionCard({ title = 'Mutirão de Auditoria' }: FirstDataMissionCardProps) {
    const handleShare = async () => {
        const text = 'Ajuda a gerar os primeiros dados no VR no Ponto: registre um evento rápido e compartilhe o boletim.';
        const url = typeof window !== 'undefined' ? window.location.origin + '/boletim' : '/boletim';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Mutirão de Auditoria',
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
        <Card variant="surface2" className="border-brand/20 bg-brand/5">
            <div className="space-y-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand/80">{title}</p>
                    <p className="text-xs text-white/70 mt-1 leading-tight">Mutirão = registrar relatos em pontos existentes.</p>
                </div>

                <div className="space-y-2">
                    <Link href="/no-ponto" className="block">
                        <Button variant="primary" className="w-full h-11 !text-[11px] font-black uppercase tracking-widest">
                            1. Estou no ponto
                        </Button>
                    </Link>

                    <Link href="/no-ponto" className="block">
                        <Button variant="secondary" className="w-full h-11 !text-[11px] font-black uppercase tracking-widest">
                            2. Registrar 1 evento
                        </Button>
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleShare}
                        className="w-full h-11 !text-[11px] font-black uppercase tracking-widest bg-white/[0.04]"
                        icon={<Share2 size={14} />}
                    >
                        3. Compartilhar boletim
                    </Button>
                </div>
            </div>
        </Card>
    );
}
