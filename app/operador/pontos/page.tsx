'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { AppShell, Card, PageHeader, Button, PrimaryCTA } from '@/components/ui';

function OperadorContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('t');

    const [name, setName] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'CAPTURING' | 'OK' | 'FAIL'>('IDLE');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const captureGps = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setGpsStatus('FAIL');
            return;
        }

        setGpsStatus('CAPTURING');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setAccuracy(Math.round(pos.coords.accuracy));
                setGpsStatus('OK');
            },
            () => {
                setGpsStatus('FAIL');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    useEffect(() => {
        if (token) captureGps();
    }, [token, captureGps]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !location || !token || isSubmitting) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/operator/stops/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    lat: location.lat,
                    lon: location.lng,
                    token
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Enviado com sucesso! Admin irá revisar.' });
                setName('');
            } else {
                setMessage({ type: 'error', text: data.error || 'Falha ao enviar.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro de conexão.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle size={48} className="mx-auto text-red-400" />
                <h1 className="text-xl font-black uppercase text-white">Link Inválido</h1>
                <p className="text-sm text-white/40">Este link de operador não possui um token de acesso.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-lg mx-auto p-4 md:p-8">
            <PageHeader
                title="Novo Rascunho"
                subtitle="Cadastre um ponto para revisão"
                className="!text-center"
            />

            <Card className="bg-brand/[0.03] border-brand/20 p-6 space-y-6">
                {/* Status GPS */}
                <div className="flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                    <div className={`p-3 rounded-xl ${gpsStatus === 'OK' ? 'bg-emerald-500/20 text-emerald-400' :
                        gpsStatus === 'FAIL' ? 'bg-red-500/20 text-red-400' :
                            'bg-white/5 text-brand animate-pulse'
                        }`}>
                        {gpsStatus === 'OK' ? <CheckCircle2 size={24} /> :
                            gpsStatus === 'FAIL' ? <AlertCircle size={24} /> :
                                <Navigation size={24} />}
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Localização</p>
                        <p className="text-sm font-black text-white uppercase italic">
                            {gpsStatus === 'CAPTURING' ? 'Buscando satélites...' :
                                gpsStatus === 'OK' ? `Posição capturada (${accuracy}m)` :
                                    gpsStatus === 'FAIL' ? 'GPS falhou' : 'Aguardando...'}
                        </p>
                        {gpsStatus === 'FAIL' && (
                            <p className="text-[9px] text-red-400/60 uppercase font-bold mt-1">
                                Verifique se o GPS está ativo e dê permissão
                            </p>
                        )}
                    </div>
                    {gpsStatus === 'FAIL' && (
                        <Button variant="secondary" onClick={captureGps} className="!h-10 !px-4">Reset</Button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Nome do Ponto</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Em frente ao Hospital X"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-all font-bold h-14"
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in zoom-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <PrimaryCTA
                        type="submit"
                        disabled={!name || gpsStatus !== 'OK' || isSubmitting}
                        className="!h-16 !rounded-2xl"
                    >
                        {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <><Send size={20} className="mr-2" /> ENVIAR RASCUNHO</>}
                    </PrimaryCTA>
                </form>
            </Card>

            <p className="text-[10px] font-bold text-center text-white/20 uppercase tracking-widest">
                Você está em modo operador público.<br />Rascunhos são revisados manualmente.
            </p>
        </div>
    );
}

export default function OperatorPage() {
    return (
        <AppShell title="Operador de Campo">
            <Suspense fallback={<div className="p-20 text-center animate-pulse"><Loader2 className="mx-auto" /></div>}>
                <OperadorContent />
            </Suspense>
        </AppShell>
    );
}
