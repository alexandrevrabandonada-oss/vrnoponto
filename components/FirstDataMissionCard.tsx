'use client';

import { Share2 } from 'lucide-react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';

interface FirstDataMissionCardProps {
    title?: string;
}

export function FirstDataMissionCard({ title = 'Missão de hoje (10 min)' }: FirstDataMissionCardProps) {
    const handleShare = async () => {
        const text = 'Ajuda a subir a base do VR no Ponto: faça 2 registros rápidos e compartilhe o boletim.';
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
        <Card variant="surface2" className="border-brand/20 bg-brand/5">
            <div className="space-y-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand/80">{title}</p>
                    <p className="text-xs text-white/70 mt-1">Três passos rápidos para criar a amostra mínima.</p>
                </div>

                <div className="space-y-2">
                    <Link href="/no-ponto" className="block">
                        <Button variant="primary" className="w-full h-11 !text-[10px] font-black uppercase tracking-widest">
                            1. Registrar em 1 ponto agora
                        </Button>
                    </Link>

                    <Link href="/no-ponto" className="block">
                        <Button variant="secondary" className="w-full h-11 !text-[10px] font-black uppercase tracking-widest">
                            2. Registrar em mais 1 ponto
                        </Button>
                    </Link>

                    <Button
                        variant="ghost"
                        onClick={handleShare}
                        className="w-full h-11 !text-[10px] font-black uppercase tracking-widest bg-white/[0.04]"
                        icon={<Share2 size={14} />}
                    >
                        3. Compartilhar o boletim
                    </Button>
                </div>
            </div>
        </Card>
    );
}
