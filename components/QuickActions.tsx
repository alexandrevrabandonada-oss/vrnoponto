'use client';

import Link from 'next/link';
import { MapPin, Bus, BarChart3, Map, BookOpen } from 'lucide-react';
import { Card, IconButton } from '@/components/ui';

const ACTIONS = [
    { href: '/no-ponto', label: 'No Ponto', sub: 'Registrar GPS', icon: MapPin },
    { href: '/registrar', label: 'Mover', sub: 'Fluxo Técnico', icon: Bus },
    { href: '/boletim', label: 'Dados', sub: 'Métricas / GAP', icon: BarChart3 },
    { href: '/bairros', label: 'Bairros', sub: 'Ranking', icon: BookOpen },
    { href: '/mapa/bairros', label: 'Mapa', sub: 'Bairros', icon: Map },
] as const;

export function QuickActions() {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ACTIONS.map(({ href, label, sub, icon: Icon }) => (
                <Link key={href} href={href} className="focus-ring rounded-2xl">
                    <Card
                        variant="surface2"
                        className="!p-4 text-center hover:bg-white/[0.02] border-white/5 transition-all group flex flex-col items-center gap-2"
                    >
                        <IconButton
                            icon={<Icon size={22} className="text-muted group-hover:text-brand transition-colors" />}
                            variant="ghost"
                            className="pointer-events-none p-0 border-0"
                        />
                        <div className="space-y-0.5">
                            <span className="block font-industrial text-[11px] text-white tracking-widest uppercase leading-tight">
                                {label}
                            </span>
                            <span className="block text-[8px] text-muted-foreground font-black uppercase tracking-tighter">
                                {sub}
                            </span>
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
