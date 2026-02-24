'use client';

import { useState, useEffect } from 'react';
import { Share2, MapPin, ClipboardList, Zap } from 'lucide-react';
import { AppShell, Button } from '@/components/ui';
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
            } catch { }
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
                    <h2 className="text-2xl font-industrial text-white px-8 uppercase italic leading-none">Nenhum mutirão ativo</h2>
                    <Link href="/">
                        <Button variant="secondary" className="!h-12 !px-8">Voltar para Início</Button>
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
        <AppShell title="FOCO NA AMOSTRAGEM">
            <div className="space-y-12 py-8 animate-fade-in-up flex flex-col items-center">
                <div className="text-center space-y-4 max-w-xs">
                    <h1 className="text-4xl font-industrial text-white tracking-tight leading-none italic uppercase">
                        {m.title}
                    </h1>
                    <p className="text-brand text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                        Mutirão é amostragem técnica. <br />Não é cadastro de novos pontos.
                    </p>
                </div>

                {/* Large Progress Counter */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative flex flex-col items-center justify-center">
                        <div className="text-[100px] font-industrial leading-none text-white tracking-tighter italic">
                            {progress}<span className="text-white/20 text-4xl not-italic">/{goal}</span>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mt-4">
                            Registros Acumulados
                        </div>
                    </div>
                </div>

                {/* Progress Bar (Minimalist) */}
                <div className="w-full max-w-sm px-8 space-y-10">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-brand transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,204,0,0.5)]"
                            style={{ width: `${pct}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/no-ponto">
                            <Button
                                className="w-full h-16 !text-lg !bg-brand !text-black shadow-2xl shadow-brand/10 uppercase font-black italic tracking-widest"
                                icon={<MapPin size={24} />}
                            >
                                estou no ponto
                            </Button>
                        </Link>

                        <Link href="/registrar">
                            <Button
                                variant="secondary"
                                className="w-full h-16 !text-sm uppercase font-black tracking-widest border-white/5 bg-white/[0.02] hover:bg-white/5"
                                icon={<ClipboardList size={20} />}
                            >
                                Registrar agora
                            </Button>
                        </Link>

                        <div className="pt-4">
                            <Button
                                variant="ghost"
                                className="w-full h-12 !text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
                                onClick={handleShare}
                                icon={<Share2 size={16} />}
                            >
                                {copySuccess ? 'LINK COPIADO!' : 'COMPARTILHAR MUTIRÃO'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
