'use client';

import { useState, useEffect } from 'react';
import { Share2, MapPin, Zap, CheckCircle2, MessageSquare, BarChart3 } from 'lucide-react';
import { AppShell, Button, SectionCard } from '@/components/ui';
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
                    title: status?.mutirao?.title || 'Mutirão de Auditoria',
                    text: 'Bora bater a meta de registros hoje no VR no Ponto!',
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
            <AppShell title="MUTIRÃO DE AUDITORIA">
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <Zap size={64} className="text-white/10" />
                    <h2 className="text-2xl font-industrial text-white px-8 uppercase italic leading-none">Nenhum mutirão ativo</h2>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                        Mutirão = registrar relatos em pontos existentes.
                    </p>
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

    const tasks = [
        { icon: MapPin, title: 'Estou no ponto', desc: 'Capture sua posição GPS exata.' },
        { icon: MessageSquare, title: 'Relatar situação', desc: 'Diga se o ônibus passou ou se você entrou.' },
        { icon: BarChart3, title: 'Fortalecer a rede', desc: 'Ajude mais pessoas com seu boletim.' }
    ];

    return (
        <AppShell title="MUTIRÃO DE AUDITORIA">
            <div className="space-y-10 py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
                <div className="text-center space-y-3 max-w-sm">
                    <h1 className="text-4xl font-industrial text-white tracking-tight leading-none italic uppercase">
                        {m.title}
                    </h1>
                    <div className="space-y-1">
                        <p className="text-brand text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed">
                            Ajude a bater a meta de {goal} relatos para o boletim de hoje.
                        </p>
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider italic">
                            Mutirão = registrar relatos em pontos existentes.
                        </p>
                    </div>
                </div>

                {/* Progress Visual */}
                <div className="w-full max-w-sm space-y-6">
                    <div className="relative p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col items-center">
                        <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full scale-150" />
                        <div className="relative text-center">
                            <div className="text-7xl font-industrial leading-none text-white tracking-tighter italic">
                                {progress}<span className="text-white/20 text-2xl not-italic">/{goal}</span>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand mt-4">
                                Relatos Hoje
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {/* The 3 Tasks */}
                <div className="w-full max-w-sm space-y-6">
                    <SectionCard title="Sua Missão" subtitle="Complete as 3 ações abaixo">
                        <div className="space-y-6 py-2">
                            {tasks.map((task, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-brand/10 group-hover:border-brand/20 transition-all">
                                        <task.icon size={18} className="text-white/40 group-hover:text-brand transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-white leading-none">
                                            {task.title}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <div className="pt-2 space-y-4">
                        <Link href="/no-ponto" className="block">
                            <Button
                                className="w-full h-20 !text-xl !bg-brand !text-black shadow-2xl shadow-brand/20 uppercase font-black italic tracking-widest !rounded-[2rem]"
                                icon={<CheckCircle2 size={24} />}
                            >
                                ESTOU NO PONTO
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            className="w-full h-12 !text-[9px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
                            onClick={handleShare}
                            icon={<Share2 size={14} />}
                        >
                            {copySuccess ? 'LINK COPIADO!' : 'CONVOCAR MAIS PESSOAS'}
                        </Button>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
