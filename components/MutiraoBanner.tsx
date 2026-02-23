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
        <div className="bg-brand border border-black/10 p-3 px-5 rounded-3xl flex items-center justify-between gap-4 animate-fade-in mb-6">
            <div className="flex items-center gap-3 overflow-hidden">
                <Target size={18} className="text-black/40 shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight text-black truncate italic">
                    {m.title}: {progress}/{goal} registros agora
                </p>
            </div>
            <Link href="/mutirao" className="shrink-0">
                <Button className="!bg-black !text-white !rounded-full !px-4 !py-1 !h-8 !text-[10px] font-black uppercase tracking-widest">
                    Participar <ArrowRight size={14} className="ml-1" />
                </Button>
            </Link>
        </div>
    );
}
