'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, Button } from '@/components/ui';
import { useDeviceId } from '@/hooks/useDeviceId';
import { Copy, MessageCircle } from 'lucide-react';

interface Variant {
    key: string;
    title: string;
    message: string;
}

// Simple stable hash to bucket users consistently based on device ID
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export const InvitePartnerCard = ({
    onVariantAssigned
}: {
    onVariantAssigned?: (key: string) => void
}) => {
    const deviceId = useDeviceId();
    const [variant, setVariant] = useState<Variant | null>(null);
    const [hasBounced, setHasBounced] = useState(false);
    const impressionTracked = useRef(false);

    useEffect(() => {
        if (!deviceId) return;

        async function fetchVariant() {
            try {
                const res = await fetch('/api/invite-variants');
                const data = await res.json();
                const variants: Variant[] = data.variants || [];

                if (variants.length === 0) return;

                // Pick variant based on device ID stable hash parity
                const bucketIndex = hashString(deviceId as string) % variants.length;
                const picked = variants[bucketIndex];

                setVariant(picked);

                if (onVariantAssigned) {
                    onVariantAssigned(picked.key);
                }

                // Fire impression ONLY ONCE
                if (!impressionTracked.current) {
                    impressionTracked.current = true;
                    // Fire and forget
                    fetch('/api/invite-stats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'impression', variantKey: picked.key })
                    }).catch(() => { });
                }

            } catch (err) {
                console.error('Failed to load invite variants', err);
            }
        }

        fetchVariant();
    }, [deviceId, onVariantAssigned]);

    if (!variant) return null; // Loading or none active

    const handleCopy = () => {
        navigator.clipboard.writeText(variant.message);
        setHasBounced(true);
        setTimeout(() => setHasBounced(false), 2000);
        trackClick();
    };

    const handleWhatsApp = () => {
        trackClick();
        const url = `https://wa.me/?text=${encodeURIComponent(variant.message)}`;
        window.open(url, '_blank');
    };

    const trackClick = () => {
        fetch('/api/invite-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'click', variantKey: variant.key })
        }).catch(() => { });
    };

    return (
        <Card variant="surface2" className="border-brand/20 bg-brand/5 p-5 sm:p-6 mb-8 flex flex-col items-center text-center">
            <h3 className="font-industrial text-xl text-brand uppercase tracking-widest font-black mb-3">
                {variant.title}
            </h3>
            <p className="text-sm font-bold opacity-80 leading-relaxed max-w-lg mb-6">
                &quot;{variant.message}&quot;
            </p>
            <div className="flex flex-col sm:flex-row w-full max-w-md gap-3">
                <Button
                    variant="primary"
                    className="flex-1 w-full"
                    onClick={handleWhatsApp}
                >
                    <MessageCircle size={18} className="mr-2" />
                    Enviar WhatsApp
                </Button>
                <Button
                    variant="secondary"
                    className="flex-1 w-full"
                    onClick={handleCopy}
                >
                    <Copy size={18} className="mr-2" />
                    {hasBounced ? "COPIADO!" : "COPIAR TEXTO"}
                </Button>
            </div>
            {/* Invisibly inject the chosen variant for debugging/monitoring */}
            <span data-variant={variant.key} className="hidden" />
        </Card>
    );
};
