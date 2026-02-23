'use client';

import { useState, useEffect } from 'react';
import { Share2, MapPin, ClipboardList, Zap } from 'lucide-react';
import { AppShell, Card, Button } from '@/components/ui';
import Link from 'next/link';

export default function MutiraoPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [status, setStatus] = useState<{ active: boolean, mutirao?: any, progress?: number } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'mutirao_open_minimal' })
        }).catch(() => { });

        fetch('/api/mutirao/active').then(res => res.json()).then(setStatus);
    }, []);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: status?.mutirao?.title || 'Mutirão VR no Ponto',
                    text: 'Bora bater a meta de registros hoje!',
                    url: shareUrl,
                });
            } catch (err) { }
        } else {
            navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    if (!status) return <div className="p-8 text-center text-white font-industrial">Carregando...</div>;

    if (!status.active) {
        return (
            <AppShell title="MUTIRÃO">
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <Zap size={64} className="text-white/10" />
                    <h2 className="text-2xl font-industrial text-white px-8">Nenhum mutirão ativo no momento</h2>
                    <Link href="/">
                        <Button variant="secondary">Voltar para Início</Button>
                    </Link>
                </div>
            </AppShell>
        );
    }

    const m = status.mutirao;
    const progress = status.progress || 0;
    const goal = m.goal || 50;
    const pct = Math.min(100, (progress / goal) * 100);

    return (
        <AppShell title="MODO OPERACIONAL">
            <div className="space-y-12 py-8 animate-fade-in-up">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-industrial text-white tracking-tight px-4 leading-none">
                        {m.title}
                    </h1>
                    <p className="text-white/70 text-sm font-black uppercase tracking-widest px-8">
                        Mutirão é amostragem, não cadastro de pontos.
                    </p>
                </div>

                {/* Simplified Counter */}
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-[80px] font-industrial leading-none text-brand tracking-tighter">
                        {progress}<span className="text-white/20 text-4xl">/{goal}</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mt-2">
                        Registros Realizados Hoje
                    </div>
                </div>

                {/* Progress Bar (Minimalist) */}
                <div className="px-8 flex flex-col gap-12">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/no-ponto">
                            <Button
                                className="w-full h-20 !text-2xl !bg-brand !text-black shadow-2xl"
                                icon={<MapPin size={28} />}
                            >
                                ESTOU NO PONTO
                            </Button>
                        </Link>

                        <Link href="/registrar">
                            <Button
                                variant="secondary"
                                className="w-full h-16 !text-lg"
                                icon={<ClipboardList size={20} />}
                            >
                                REGISTRAR AGORA
                            </Button>
                        </Link>

                        <div className="pt-4">
                            <Button
                                variant="ghost"
                                className="w-full h-14 !text-xs !bg-white/5 opacity-50 hover:opacity-100"
                                onClick={handleShare}
                                icon={<Share2 size={18} />}
                            >
                                {copySuccess ? 'LINK COPIADO!' : 'COMPARTILHAR LINK'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

