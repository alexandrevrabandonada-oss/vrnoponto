'use client';

import { useState, useEffect } from 'react';
import { Target, Zap, ArrowRight } from 'lucide-react';
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
        <Link href="/mutirao" className="block animate-scale-in">
            <div className="bg-brand hover:brightness-110 transition-all p-4 rounded-3xl shadow-[0_20px_40px_rgba(255,214,0,0.15)] flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-black shrink-0">
                    <Target size={28} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Zap size={12} className="text-black" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">Mutirão Ativo</span>
                    </div>
                    <h2 className="text-lg font-industrial text-black leading-tight uppercase tracking-tight">
                        {m.title}
                    </h2>
                    <p className="text-[10px] font-bold text-black/80 uppercase tracking-tight mt-0.5">
                        Meta: <span className="text-black font-black">{progress} / {goal}</span> registros
                    </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black">
                    <ArrowRight size={18} />
                </div>
            </div>
        </Link>
    );
}
