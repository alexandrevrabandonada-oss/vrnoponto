'use client';

import { useState, useEffect } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import Link from 'next/link';

export function MutiraoBanner() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [status, setStatus] = useState<{ active: boolean, mutirao?: any, progress?: number } | null>(null);

    useEffect(() => {
        fetch('/api/mutirao/active')
            .then(res => res.json())
            .then(setStatus)
            .catch(() => setStatus(null));
    }, []);

    if (!status || !status.active) return null;

    const m = status.mutirao;
    const progress = status.progress || 0;
    const goal = m.goal || 50;

    return (
        <div className="w-full bg-zinc-900/50 border border-brand/20 p-2.5 px-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in group hover:border-brand/40 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                    <Target size={16} className="text-brand animate-pulse" />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <Link href="/mutirao" className="hover:underline decoration-brand/30">
                        <p className="text-[10px] font-black uppercase tracking-tight text-white/50 leading-none mb-1">
                            Mutirão de Auditoria
                        </p>
                    </Link>
                    <div className="flex items-baseline gap-2 overflow-hidden">
                        <p className="text-xs font-industrial text-white truncate italic uppercase tracking-wider">
                            {m.title} <span className="text-brand not-italic ml-1">({progress}/{goal})</span>
                        </p>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter shrink-0 hidden xs:block">
                            Dados, não pontos.
                        </span>
                    </div>
                </div>
            </div>
            <Link href="/mutirao" className="shrink-0">
                <Button className="!bg-brand !text-black !rounded-xl !px-4 !h-9 !text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                    Ver Mutirão <ArrowRight size={14} className="ml-1" />
                </Button>
            </Link>
        </div>
    );
}
