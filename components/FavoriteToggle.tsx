'use client';

import React, { useState, useCallback, useSyncExternalStore } from 'react';
import { Star } from 'lucide-react';
import {
    isFavoriteNeighborhood,
    isFavoriteLine,
    toggleFavoriteNeighborhood,
    toggleFavoriteLine,
} from '@/lib/favorites';

interface FavoriteToggleProps {
    type: 'neighborhood' | 'line';
    id: string;
    label?: string;
}

// Simple external store for favorite state based on localStorage
function useFavoriteState(type: 'neighborhood' | 'line', id: string) {
    const subscribe = useCallback((callback: () => void) => {
        window.addEventListener('storage', callback);
        window.addEventListener('focus', callback);
        return () => {
            window.removeEventListener('storage', callback);
            window.removeEventListener('focus', callback);
        };
    }, []);

    const getSnapshot = useCallback(() => {
        return type === 'neighborhood'
            ? isFavoriteNeighborhood(id)
            : isFavoriteLine(id);
    }, [type, id]);

    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function FavoriteToggle({ type, id, label }: FavoriteToggleProps) {
    const active = useFavoriteState(type, id);
    const [pulse, setPulse] = useState(false);

    const toggle = useCallback(() => {
        if (type === 'neighborhood') {
            toggleFavoriteNeighborhood(id);
        } else {
            toggleFavoriteLine(id);
        }
        // Force a storage event so useSyncExternalStore re-reads
        window.dispatchEvent(new Event('storage'));
        setPulse(true);
        setTimeout(() => setPulse(false), 300);
    }, [type, id]);

    const title = active
        ? `Remover ${label || 'item'} dos favoritos`
        : `Favoritar ${label || 'item'}`;

    return (
        <button
            onClick={toggle}
            title={title}
            aria-label={title}
            className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-xl
                text-[11px] font-black uppercase tracking-widest
                border transition-all duration-200 cursor-pointer
                ${active
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-white/[0.02] border-white/10 text-white/50 hover:border-amber-500/30 hover:text-amber-400'}
                ${pulse ? 'scale-110' : 'scale-100'}
            `}
        >
            <Star
                size={14}
                className={`transition-all ${active ? 'fill-amber-400 text-amber-400' : ''}`}
            />
            {active ? 'Favoritado' : 'Favoritar'}
        </button>
    );
}
