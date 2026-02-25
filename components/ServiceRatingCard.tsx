'use client';

import * as React from 'react';
import { Card, Button } from '@/components/ui';
import { enqueueEvent } from '@/lib/offlineQueue';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type ServiceRating = 'GOOD' | 'REGULAR' | 'BAD';

interface ServiceRatingCardProps {
    deviceId: string | null;
    clientEventId?: string | null;
    eventId?: string | null;
    eventType?: string | null;
    initialRating?: ServiceRating | null;
    initialRatingAt?: string | null;
    title?: string;
    onSaved?: (rating: ServiceRating) => void;
    onDismiss?: () => void;
}

const RATING_OPTIONS: Array<{ value: ServiceRating; label: string; tone: string }> = [
    { value: 'GOOD', label: 'Boa', tone: '!bg-emerald-600 hover:!bg-emerald-500 !text-white' },
    { value: 'REGULAR', label: 'Regular', tone: '!bg-amber-500 hover:!bg-amber-400 !text-black' },
    { value: 'BAD', label: 'Ruim', tone: '!bg-red-600 hover:!bg-red-500 !text-white' }
];

export function ServiceRatingCard({
    deviceId,
    clientEventId,
    eventId,
    eventType,
    initialRating = null,
    initialRatingAt = null,
    title = 'Como foi o serviço desta viagem?',
    onSaved,
    onDismiss
}: ServiceRatingCardProps) {
    const { isOnline, refreshPending } = useOfflineSync();
    const [currentRating, setCurrentRating] = React.useState<ServiceRating | null>(initialRating);
    const [currentRatingAt, setCurrentRatingAt] = React.useState<string | null>(initialRatingAt);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [dismissed, setDismissed] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        setCurrentRating(initialRating ?? null);
        setCurrentRatingAt(initialRatingAt ?? null);
    }, [initialRating, initialRatingAt]);

    const shouldRender =
        !dismissed &&
        eventType === 'boarding' &&
        (!currentRating || !!message) &&
        !!deviceId &&
        !!clientEventId;

    if (!shouldRender) return null;

    const submitRating = async (rating: ServiceRating) => {
        if (!deviceId || !clientEventId) return;

        setIsSubmitting(true);
        setMessage(null);

        const payload = {
            deviceId,
            clientEventId,
            eventId: eventId || undefined,
            rating
        };

        try {
            if (!isOnline) {
                await enqueueEvent({
                    id: crypto.randomUUID(),
                    kind: 'event_rating',
                    payload,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });
                await refreshPending();
                setCurrentRating(rating);
                setCurrentRatingAt(new Date().toISOString());
                setMessage('Salvo no celular. Envio quando voltar.');
                onSaved?.(rating);
                window.setTimeout(() => {
                    setDismissed(true);
                }, 1800);
                return;
            }

            const res = await fetch('/api/events/service-rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok || !data?.ok) {
                setMessage(data?.error || 'Não foi possível salvar agora.');
                return;
            }

            setCurrentRating(rating);
            setCurrentRatingAt(new Date().toISOString());
            setMessage('Avaliação registrada.');
            onSaved?.(rating);
            window.setTimeout(() => {
                setDismissed(true);
            }, 1200);
        } catch {
            setMessage('Não foi possível salvar agora.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card variant="surface2" className="border-white/10 bg-white/[0.03]">
            <div className="p-4 space-y-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand">Avaliação rápida</p>
                    <p className="text-sm font-bold text-white mt-1">{title}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {RATING_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            onClick={() => submitRating(option.value)}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            className={`!h-11 !text-[11px] font-black uppercase tracking-widest !rounded-xl ${option.tone}`}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setDismissed(true);
                            onDismiss?.();
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white/80 transition-colors"
                    >
                        Agora não
                    </button>
                    {message && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 text-right">
                            {message}
                        </span>
                    )}
                </div>

                {currentRating && currentRatingAt && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                        Avaliação salva.
                    </p>
                )}
            </div>
        </Card>
    );
}
