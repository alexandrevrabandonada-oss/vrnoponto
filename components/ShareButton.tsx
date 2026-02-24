'use client';

import * as React from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from './ui';

interface ShareButtonProps {
    title: string;
    text: string;
    url?: string;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const ShareButton = ({
    title,
    text,
    url,
    className = '',
    variant = 'ghost'
}: ShareButtonProps) => {
    const [copied, setCopied] = React.useState(false);

    const handleShare = async () => {
        const shareUrl = url || window.location.href;
        const fullText = `${text}\n\n— via @VR_ABANDONADA`;

        const shareData = {
            title,
            text: fullText,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (e) {
                // User cancelled or error, fallback to clipboard if not a cancellation
                if ((e as Error).name === 'AbortError') return;
            }
        }

        // Fallback: Clipboard
        try {
            await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy share link:', err);
        }
    };

    return (
        <Button
            onClick={handleShare}
            variant={variant}
            className={`flex items-center gap-2 !text-[10px] font-black uppercase tracking-widest ${className}`}
            icon={copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
        >
            {copied ? 'Link Copiado!' : 'Compartilhar'}
        </Button>
    );
};
