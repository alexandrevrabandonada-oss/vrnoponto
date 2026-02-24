'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, BarChart3, LayoutList, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PublicQuickActions() {
    const pathname = usePathname();

    const actions = [
        {
            href: '/no-ponto',
            label: 'Estou no ponto',
            icon: MapPin,
            primary: true
        },
        {
            href: '/boletim',
            label: 'Boletim',
            icon: BarChart3
        },
        {
            href: '/bairros',
            label: 'Ranking',
            icon: LayoutList
        },
        {
            href: '/mapa/bairros',
            label: 'Mapa',
            icon: Map
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-4 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
                <nav className="bg-[#0c0f14]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-2 flex items-center justify-between gap-1 overflow-hidden">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        const isActive = pathname === action.href;

                        if (action.primary) {
                            return (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 h-14 rounded-[1.5rem] transition-all relative overflow-hidden group",
                                        isActive ? "bg-brand text-black" : "bg-brand/20 text-brand"
                                    )}
                                    aria-label={action.label}
                                >
                                <Icon size={20} className={cn(isActive ? "animate-bounce" : "group-hover:scale-110 transition-transform")} />
                                    <span className="font-industrial text-[10px] font-black uppercase tracking-wide italic">
                                        {action.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                                    )}
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={action.href}
                                href={action.href}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center gap-1.5 h-14 rounded-[1.5rem] transition-all",
                                    isActive
                                        ? "bg-white/10 text-brand border border-white/10"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                                aria-label={action.label}
                            >
                                <Icon size={18} />
                                <span className="text-[8px] font-black uppercase tracking-tight">
                                    {action.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
