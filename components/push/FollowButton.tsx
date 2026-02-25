'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { Bell, BellRing, Loader2, Check } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PushOptInModal } from './PushOptInModal';
import { trackFunnel, FUNNEL_EVENTS } from '@/lib/telemetry';

interface FollowButtonProps {
    type: 'neighborhood' | 'line';
    id: string; // neighborhood_norm or line_id
    label?: string;
}

export function FollowButton({ type, id, label }: FollowButtonProps) {
    const {
        isSubscribed,
        isFollowingNeighborhood,
        isFollowingLine,
        followNeighborhood,
        followLine,
        loading
    } = usePushNotifications();

    const [modalOpen, setModalOpen] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [canFollow, setCanFollow] = useState(false);

    useEffect(() => {
        const actionCount = parseInt(localStorage.getItem('pwa_action_count') || '0', 10);
        setCanFollow(actionCount >= 1);
    }, []);

    const isFollowing = type === 'neighborhood' ? isFollowingNeighborhood(id) : isFollowingLine(id);

    if (!canFollow) {
        return null;
    }

    const handleFollow = async () => {
        if (!isSubscribed) {
            setModalOpen(true);
            return;
        }

        setLocalLoading(true);
        try {
            if (type === 'neighborhood') {
                await followNeighborhood(id);
                trackFunnel(FUNNEL_EVENTS.FOLLOW_OPTIN);
            } else {
                await followLine(id);
            }
        } catch (err) {
            console.error('Error following:', err);
        } finally {
            setLocalLoading(false);
        }
    };

    const handleOptInSuccess = () => {
        handleFollow();
    };

    if (isFollowing) {
        return (
            <Button
                variant="secondary"
                className="h-11 !px-4 !text-[11px] !border-brand/30 !bg-brand/5 text-brand"
                disabled
            >
                <Check size={14} className="mr-2" />
                Seguindo {label || (type === 'neighborhood' ? 'Bairro' : 'Linha')}
            </Button>
        );
    }

    return (
        <>
            <div className="space-y-1">
                <Button
                    variant="secondary"
                    className="h-11 !px-4 !text-[11px] hover:!border-brand/50 hover:!bg-brand/5 transition-all"
                    onClick={handleFollow}
                    loading={loading || localLoading}
                    icon={loading || localLoading ? <Loader2 className="animate-spin" size={14} /> : <Bell size={14} />}
                >
                    {type === 'neighborhood' ? 'Receber alertas deste bairro' : 'Receber alertas desta linha'}
                </Button>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Sem spam: no máximo 1 por dia no modo resumo.
                </p>
            </div>

            <PushOptInModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleOptInSuccess}
            />
        </>
    );
}

export function FollowBadge() {
    const { preferences, isSubscribed } = usePushNotifications();

    if (!isSubscribed || !preferences) return null;

    const bCount = preferences.neighborhoods_norm.length;
    const lCount = preferences.lines.length;

    if (bCount === 0 && lCount === 0) return null;

    return (
        <div className="inline-flex items-center gap-2 p-2 px-3 rounded-full bg-white/[0.03] border border-white/5 animate-scale-in">
            <BellRing size={12} className="text-brand" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
                Você segue: <span className="text-white">{bCount} bairros, {lCount} linhas</span>
            </span>
            <div className="h-3 w-px bg-white/10 mx-1" />
            <a
                href="/alertas"
                className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
            >
                Gerenciar
            </a>
        </div>
    );
}
