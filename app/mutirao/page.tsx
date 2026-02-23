'use client';

import { useState, useEffect } from 'react';
import { Share2, CheckCircle2, QrCode, Trophy, Zap, MapPin } from 'lucide-react';
import { AppShell, Card, Button, Divider } from '@/components/ui';
import Link from 'next/link';

export default function MutiraoPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [status, setStatus] = useState<{ active: boolean, mutirao?: any, progress?: number } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        // Telemetry: mutirao_open
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'mutirao_open' })
        }).catch(() => { });

        fetch('/api/mutirao/active').then(res => res.json()).then(setStatus);
    }, []);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    const handleShare = async () => {
        // Telemetry: mutirao_share
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'mutirao_share' })
        }).catch(() => { });

        if (navigator.share) {
            try {
                await navigator.share({
                    title: status?.mutirao?.title || 'Mutirão VR no Ponto',
                    text: status?.mutirao?.description || 'Bora bater a meta de registros hoje!',
                    url: shareUrl,
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
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
                    <Trophy size={64} className="text-white/10" />
                    <h2 className="text-2xl font-industrial text-white px-8">Nenhum mutirão ativo no momento</h2>
                    <p className="text-muted text-sm max-w-xs">Fique atento às nossas redes para as próximas mobilizações comunitárias!</p>
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
        <AppShell title="MUTIRÃO ATIVO">
            <div className="space-y-8 animate-fade-in-up">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Zap size={14} />
                        Mobilização em andamento
                    </div>
                    <h1 className="text-4xl font-industrial text-white tracking-tight px-4 leading-[0.9]">{m.title}</h1>
                    <p className="text-muted text-xs font-bold leading-relaxed px-6 uppercase tracking-tight">{m.description}</p>
                </div>

                {/* Meta Progress */}
                <Card variant="surface2" className="!p-6 border-brand/20 bg-brand/5">
                    <div className="flex justify-between items-end mb-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand">Progresso hoje</p>
                            <h2 className="text-3xl font-industrial text-white leading-none tracking-tight">
                                {progress}<span className="text-white/40 font-sans text-lg"> / {goal}</span>
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-industrial text-brand leading-none">{Math.round(pct)}%</p>
                        </div>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-brand shadow-[0_0_20px_rgba(255,214,0,0.4)] transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </Card>

                {/* 3 Step Script */}
                <div className="space-y-4">
                    <Divider label="COMO PARTICIPAR" />
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-industrial text-brand shadow-lg shrink-0">1</div>
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-white/90">Vá ao Ponto</p>
                                <p className="text-[10px] text-muted leading-tight">Mantenha o GPS ligado e abra o app.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-industrial text-brand shadow-lg shrink-0">2</div>
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-white/90">Faça Check-in</p>
                                <p className="text-[10px] text-muted leading-tight">Use o &ldquo;Estou no Ponto&rdquo; para validar sua localidade.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-industrial text-brand shadow-lg shrink-0">3</div>
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-white/90">Registre o Ônibus</p>
                                <p className="text-[10px] text-muted leading-tight">Escolha sua linha e valide o horário oficial.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <Link href="/no-ponto">
                        <Button
                            className="w-full h-18 !text-xl !bg-brand !text-black shadow-[0_15px_30px_rgba(255,214,0,0.2)]"
                            icon={<MapPin size={24} />}
                        >
                            ESTOU NO PONTO AGORA
                        </Button>
                    </Link>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            className="!h-14 !text-xs"
                            onClick={handleShare}
                            icon={<Share2 size={16} />}
                        >
                            {copySuccess ? 'COPIADO!' : 'COMPARTILHAR'}
                        </Button>
                        <Button
                            variant="ghost"
                            className="!h-14 !text-[10px] !bg-white/5 !border-white/5"
                            icon={<QrCode size={16} />}
                            onClick={() => window.print()}
                        >
                            IMPRIMIR QR
                        </Button>
                    </div>
                </div>

                {/* Checklist Footer */}
                <Card className="!p-4 bg-white/[0.01] border-white/5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-muted leading-relaxed uppercase tracking-tight">
                            Cada registro ajuda a nossa cidade a ter dados mais precisos contra atrasos. Sua meta individual de hoje: <span className="text-white">mínimo 1 registro.</span>
                        </p>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
