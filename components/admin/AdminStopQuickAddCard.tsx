'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Loader2, Save, MousePointer2 } from 'lucide-react';
import { SectionCard, PrimaryCTA, Button, Field, InlineAlert } from '@/components/ui';
import { formatStopName } from '@/lib/utils';

interface AdminStopQuickAddCardProps {
    onSuccess?: () => void;
}

export function AdminStopQuickAddCard({ onSuccess }: AdminStopQuickAddCardProps) {
    const [name, setName] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'CAPTURING' | 'OK' | 'FAIL'>('IDLE');
    const [gpsError, setGpsError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; link?: string } | null>(null);

    const captureGps = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setGpsStatus('FAIL');
            setGpsError('Navegador sem suporte a GPS');
            return;
        }

        setGpsStatus('CAPTURING');
        setMessage(null);

        // Track open event only once per mount
        // (Handled via useEffect)

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude);
                setLng(pos.coords.longitude);
                setAccuracy(Math.round(pos.coords.accuracy));
                setGpsStatus('OK');

                fetch('/api/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'admin_stop_quickadd_gps_ok' })
                }).catch(() => { });
            },
            (err) => {
                setGpsStatus('FAIL');
                setGpsError(err.message === 'User denied Geolocation' ? 'GPS Negado' : 'Erro ao capturar');

                fetch('/api/telemetry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'admin_stop_quickadd_gps_fail' })
                }).catch(() => { });
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    }, []);

    useEffect(() => {
        captureGps();

        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'admin_stop_quickadd_open' })
        }).catch(() => { });
    }, [captureGps]);

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault();

        const formattedName = formatStopName(name);

        if (!formattedName || formattedName.length < 6) {
            setMessage({ type: 'error', text: 'Nome muito curto ou inválido. Use pelo menos 6 letras (Ex: Em frente ao Hospital X).' });
            return;
        }

        if (lat === null || lng === null || isSubmitting) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/stops/quick-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formattedName, lat, lng })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.status === 'CREATED') {
                    setMessage({ type: 'success', text: data.message });
                    setName('');
                    onSuccess?.();

                    fetch('/api/telemetry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: 'admin_stop_quickadd_saved' })
                    }).catch(() => { });
                } else if (data.status === 'DEDUPE') {
                    setMessage({
                        type: 'info',
                        text: data.message,
                        link: `/admin/pontos?search=${data.stop.id}` // Placeholder link logic
                    });

                    fetch('/api/telemetry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: 'admin_stop_quickadd_dedupe' })
                    }).catch(() => { });
                }
            } else {
                setMessage({ type: 'error', text: data.error || 'Erro ao salvar.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Falha na conexão com o servidor.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputBase = "w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand/50 transition-all text-sm font-bold h-14";
    const labelBase = "block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 ml-1";

    return (
        <SectionCard
            title="Cadastro Rápido (GPS)"
            subtitle="Adicione o ponto onde você está agora"
            className="border-brand/20 bg-brand/[0.02]"
        >
            <div className="space-y-6">
                {/* Status do GPS */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${gpsStatus === 'OK' ? 'bg-emerald-500/20 text-emerald-400' :
                            gpsStatus === 'FAIL' ? 'bg-red-500/20 text-red-400' :
                                'bg-white/5 text-brand animate-pulse'
                            }`}>
                            {gpsStatus === 'OK' ? <CheckCircle2 size={24} /> :
                                gpsStatus === 'FAIL' ? <AlertCircle size={24} /> :
                                    <Navigation size={24} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Precisão do GPS</p>
                            <p className="text-sm font-black text-white uppercase italic">
                                {gpsStatus === 'CAPTURING' ? 'Buscando satélites...' :
                                    gpsStatus === 'OK' ? `Posição capturada (${accuracy}m de precisão)` :
                                        gpsStatus === 'FAIL' ? `GPS falhou: ${gpsError}` : 'Aguardando GPS...'}
                            </p>
                            {gpsStatus === 'CAPTURING' && (
                                <p className="text-[9px] text-brand/60 uppercase font-bold mt-1 animate-pulse">
                                    Dica: Fique em céu aberto para melhor precisão
                                </p>
                            )}
                        </div>
                    </div>
                    {gpsStatus === 'FAIL' && (
                        <Button variant="secondary" onClick={captureGps} className="!h-10 !px-4 text-[10px]">
                            Tentar novamente
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-2">
                        <label className={labelBase}>Nome do Ponto</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Em frente ao Hospital X ou Próximo à Padaria Y"
                            className={inputBase}
                            required
                        />
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">
                            Use referências claras: "Em frente ao...", "Próximo à..."
                        </p>
                    </div>

                    {/* Fallback Manual if GPS fails */}
                    {gpsStatus === 'FAIL' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className={labelBase}>Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={lat || ''}
                                    onChange={(e) => setLat(parseFloat(e.target.value))}
                                    placeholder="-22.1234"
                                    className={inputBase}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelBase}>Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={lng || ''}
                                    onChange={(e) => setLng(parseFloat(e.target.value))}
                                    placeholder="-44.1234"
                                    className={inputBase}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`p-4 rounded-2xl text-[11px] font-bold uppercase tracking-wide flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            message.type === 'info' ? 'bg-brand/10 text-brand border border-brand/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <div className="flex-1">
                                {message.text}
                                {message.link && (
                                    <a href={message.link} className="ml-2 underline opacity-80 hover:opacity-100">Ver ponto</a>
                                )}
                            </div>
                        </div>
                    )}

                    <PrimaryCTA
                        type="submit"
                        disabled={!name || lat === null || lng === null || isSubmitting}
                        className="!h-16 !rounded-2xl"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={20} className="animate-spin mr-2" /> SALVANDO...</>
                        ) : (
                            <><Save size={20} className="mr-2" /> SALVAR COM GPS</>
                        )}
                    </PrimaryCTA>
                </form>
            </div>
        </SectionCard>
    );
}
