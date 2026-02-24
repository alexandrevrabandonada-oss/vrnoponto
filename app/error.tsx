'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { AppShell, Card, Button } from '@/components/ui';

type ErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GlobalRouteError({ error, reset }: ErrorPageProps) {
    React.useEffect(() => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'client_error_global',
                meta: {
                    digest: error?.digest || null,
                    name: error?.name || 'Error',
                    pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
                },
            }),
        }).catch(() => {
            // noop: telemetry is best-effort
        });
    }, [error]);

    return (
        <AppShell title="Falha Temporária">
            <div className="max-w-md mx-auto py-8">
                <Card variant="surface2" className="border-danger/20 bg-danger/10">
                    <div className="space-y-6" role="alert" aria-live="assertive">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-2xl bg-danger/20 p-3 text-danger">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-danger/80">
                                    Erro inesperado
                                </p>
                                <h1 className="font-industrial text-2xl italic uppercase text-white">
                                    Algo deu errado agora
                                </h1>
                                <p className="text-sm text-white/80">
                                    Seu dado não foi perdido. Tente novamente em alguns segundos.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                                onClick={reset}
                                className="w-full !h-12 !text-[10px] font-black uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-brand/60"
                                icon={<RefreshCw size={16} />}
                                aria-label="Tentar novamente"
                            >
                                Tentar novamente
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => { window.location.href = '/'; }}
                                className="w-full !h-12 !text-[10px] font-black uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-white/60"
                                icon={<Home size={16} />}
                                aria-label="Voltar para Home"
                            >
                                Voltar para Home
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
