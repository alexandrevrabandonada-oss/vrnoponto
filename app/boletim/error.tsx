'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { AppShell, Button } from '@/components/ui';

export default function BoletimError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to telemetry (fire-and-forget, no PII, just event name + short message)
        fetch('/api/telemetry', {
            method: 'POST',
            body: JSON.stringify({
                event: 'client_error_boletim',
            }),
        }).catch(() => { });

        console.error('[boletim] Error boundary caught:', error.message);
    }, [error]);

    return (
        <AppShell title="BOLETIM">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <AlertCircle size={32} className="text-red-400" />
                </div>

                <h2 className="font-industrial text-xl uppercase tracking-widest text-white mb-2">
                    Erro ao carregar Boletim
                </h2>

                <p className="text-[11px] text-white/40 font-bold uppercase tracking-tight mb-8 max-w-xs">
                    Algo deu errado ao montar o boletim de transparência.
                    Isso já foi registrado automaticamente.
                </p>

                <Button onClick={reset} className="!text-sm">
                    Tentar Novamente
                </Button>
            </div>
        </AppShell>
    );
}
