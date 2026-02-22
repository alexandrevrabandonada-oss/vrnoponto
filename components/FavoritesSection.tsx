'use client';

import React, { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Star, MapPin, Bus, ChevronRight } from 'lucide-react';
import { getFavorites, type Favorites } from '@/lib/favorites';
import { FollowButton } from '@/components/push/FollowButton';
import { Card } from '@/components/ui';

export function FavoritesSection() {
    const subscribe = useCallback((callback: () => void) => {
        window.addEventListener('storage', callback);
        window.addEventListener('focus', callback);
        return () => {
            window.removeEventListener('storage', callback);
            window.removeEventListener('focus', callback);
        };
    }, []);

    const getSnapshot = useCallback(() => {
        return JSON.stringify(getFavorites());
    }, []);

    const getServerSnapshot = useCallback(() => {
        return JSON.stringify({ neighborhoods: [], lines: [] });
    }, []);

    const favs: Favorites = JSON.parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));

    const hasAny = favs.neighborhoods.length > 0 || favs.lines.length > 0;

    if (!hasAny) {
        return (
            <Card className="!p-8 text-center border-dashed border-white/10 bg-white/[0.01]">
                <Star size={28} className="mx-auto mb-4 text-amber-400/40" />
                <h2 className="font-industrial text-base uppercase tracking-widest text-white/70 mb-2">
                    Favoritos
                </h2>
                <p className="text-[11px] text-white/40 font-bold uppercase tracking-tight mb-6 max-w-xs mx-auto">
                    Favorite bairros e linhas para acessar direto daqui. Toque ⭐ na página do bairro ou linha.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link
                        href="/bairros"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest hover:border-brand/30 hover:text-brand transition-all"
                    >
                        <MapPin size={12} /> Ver Bairros
                    </Link>
                    <Link
                        href="/boletim"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest hover:border-brand/30 hover:text-brand transition-all"
                    >
                        <Bus size={12} /> Ver Linhas
                    </Link>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Neighborhoods */}
            {favs.neighborhoods.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-brand" />
                        <h2 className="font-industrial text-xs uppercase tracking-[0.3em] text-white/60">
                            Meus Bairros
                        </h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {favs.neighborhoods.map((slug) => {
                            const displayName = decodeURIComponent(slug)
                                .split('-')
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ');
                            return (
                                <div
                                    key={slug}
                                    className="flex-shrink-0 w-52"
                                >
                                    <Card className="!p-4 border-white/5 hover:border-brand/20 transition-all h-full">
                                        <Link href={`/bairro/${slug}`} className="block mb-3">
                                            <span className="font-industrial text-sm text-white uppercase tracking-widest leading-tight block truncate">
                                                {displayName}
                                            </span>
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-tight flex items-center gap-1 mt-1">
                                                Ver diagnóstico <ChevronRight size={10} />
                                            </span>
                                        </Link>
                                        <FollowButton
                                            type="neighborhood"
                                            id={slug}
                                            label={displayName}
                                        />
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lines */}
            {favs.lines.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Bus size={14} className="text-brand" />
                        <h2 className="font-industrial text-xs uppercase tracking-[0.3em] text-white/60">
                            Minhas Linhas
                        </h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {favs.lines.map((lineId) => (
                            <div
                                key={lineId}
                                className="flex-shrink-0 w-52"
                            >
                                <Card className="!p-4 border-white/5 hover:border-brand/20 transition-all h-full">
                                    <Link href={`/linha/${lineId}`} className="block mb-3">
                                        <span className="font-industrial text-sm text-white uppercase tracking-widest leading-tight block truncate">
                                            Linha
                                        </span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-tight flex items-center gap-1 mt-1">
                                            Ver análise <ChevronRight size={10} />
                                        </span>
                                    </Link>
                                    <FollowButton
                                        type="line"
                                        id={lineId}
                                    />
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
