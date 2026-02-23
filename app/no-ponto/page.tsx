'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { HelpModal } from '@/components/HelpModal';
import { MapPin, Navigation, Bus, AlertCircle, ArrowRight, PlusCircle } from 'lucide-react';
import { StopSuggestionModal } from '@/components/StopSuggestionModal';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import {
    AppShell, PageHeader, Card, Divider, Button,
    Field, Select, InlineAlert
} from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueEvent } from '@/lib/offlineQueue';
import { OneTapCard } from '@/components/OneTapCard';
import Link from 'next/link';

export default function NoPonto() {
    const deviceId = useDeviceId();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);

    const [selectedStop, setSelectedStop] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoadingStops, setIsLoadingStops] = useState(false);
    const [hasArrived, setHasArrived] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);

    // Top Lines Logic
    const [topLines, setTopLines] = useState<{ line_id: string, code: string, name: string, count: number, pctVerified: number }[]>([]);
    const [isLoadingTopLines, setIsLoadingTopLines] = useState(false);

    const { isOnline, isSyncing, pendingCount, syncNow, refreshPending } = useOfflineSync();

    // Telemetry helper
    const trackTelemetry = useCallback((event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event })
        }).catch(() => { /* silent */ });
    }, []);

    // Efeito para GPS
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setGpsStatus('GPS Capturado 🎉');
                },
                (error) => {
                    setGpsStatus('Erro ao capturar GPS: ' + error.message);
                }
            );
        } else {
            queueMicrotask(() => setGpsStatus('Geolocalização não suportada neste navegador.'));
        }
    }, []);

    // Efeito para buscar pontos quando o GPS atualizar
    useEffect(() => {
        async function fetchStops() {
            if (!location) return;
            setIsLoadingStops(true);
            try {
                const res = await fetch(`/api/stops/nearest?lat=${location.lat}&lng=${location.lng}&lim=3`);
                if (res.ok) {
                    const data = await res.json();
                    setNearestStops(data.stops || []);
                    if (data.stops?.length > 0) {
                        setSelectedStop(data.stops[0].id); // Auto-seleciona o mais próximo
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar pontos:", err);
            } finally {
                setIsLoadingStops(false);
            }
        }
        fetchStops();
    }, [location]);

    // Efeito para buscar linhas top do ponto selecionado
    useEffect(() => {
        async function fetchTopLines() {
            if (!selectedStop) {
                setTopLines([]);
                return;
            }
            setIsLoadingTopLines(true);
            try {
                const res = await fetch(`/api/stop/top-lines?stop_id=${selectedStop}`);
                if (res.ok) {
                    const data = await res.json();
                    setTopLines(data.lines || []);
                }
            } catch (err) {
                console.error("Erro ao buscar top linhas:", err);
            } finally {
                setIsLoadingTopLines(false);
            }
        }
        fetchTopLines();
    }, [selectedStop]);

    const handleArrived = async () => {
        if (!deviceId) return;
        setIsSubmitting(true);
        setMessage('');

        if (!selectedStop) {
            setMessage('ERRO: SELECIONE UM PONTO PRIMEIRO.');
            setIsSubmitting(false);
            return;
        }

        const eventId = crypto.randomUUID();
        const payload = {
            deviceId,
            stopId: selectedStop,
            lineId: selectedStop, // arrived events use stop as line context
            eventType: 'arrived'
        };

        try {
            if (!isOnline) {
                await enqueueEvent({
                    id: eventId,
                    payload,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });
                await refreshPending();

                trackTelemetry('offline_queue_enqueued');
                setMessage("SALVO OFFLINE (SERÁ ENVIADO QUANDO HOUVER REDE)");
                setHasArrived(true);
                setIsSubmitting(false);
                return;
            }

            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, clientEventId: eventId })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro desconhecido');
            }
            setMessage('PRESENÇA REGISTRADA! NÍVEL: ' + (data.event?.trust_level || 'L1'));
            setHasArrived(true);
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('ERRO NO REGISTRO: ' + errMessage.toUpperCase());
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStop = nearestStops.find(s => s.id === selectedStop);

    return (
        <AppShell title="CHECK-IN NO PONTO">
            <PageHeader
                title="Cheguei agora"
                subtitle="Valide sua presença para auditoria real"
            />

            <div className="space-y-6">
                {/* Offline Queue UI */}
                {(!isOnline || pendingCount > 0) && (
                    <InlineAlert
                        variant={isOnline ? "warning" : "error"}
                        title={isOnline ? "Fila Aguardando Sincronismo" : "Conexão Instável (Offline)"}
                    >
                        <div className="flex flex-col gap-3 mt-1">
                            <p className="text-xs">
                                {!isOnline
                                    ? "Você está offline. O check-in será salvo e enviado automaticamente quando a conexão voltar."
                                    : "A rede voltou. Você possui check-ins salvos precisando ser despachados."}
                            </p>
                            {pendingCount > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold bg-black/20 px-2 py-1 rounded">PENDENTES: {pendingCount}</span>
                                    <Button
                                        variant="secondary"
                                        disabled={!isOnline || isSyncing}
                                        onClick={syncNow}
                                        loading={isSyncing}
                                        className="h-8 !text-xs !px-3"
                                    >
                                        Sincronizar Agora
                                    </Button>
                                </div>
                            )}
                        </div>
                    </InlineAlert>
                )}

                {/* Status GPS */}
                <Card variant="surface2" className="border-brand/10 bg-brand/5">
                    <div className="flex items-center gap-3">
                        <Navigation size={16} className={location ? "text-brand" : "text-white/40 animate-pulse"} />
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand">Status do Sensor</p>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">{gpsStatus}</p>
                        </div>
                        {location && (
                            <div className="text-right">
                                <p className="text-[8px] font-mono text-white/40">LAT: {location.lat.toFixed(4)}</p>
                                <p className="text-[8px] font-mono text-white/40">LNG: {location.lng.toFixed(4)}</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Seleção de Parada Dinâmica */}
                {!hasArrived && (
                    <div className="space-y-6">
                        <Field
                            label="Onde você está?"
                            hint={isLoadingStops ? "Buscando pontos próximos..." : "Selecione o ponto correto para validar"}
                        >
                            {nearestStops.length > 0 ? (
                                <Select
                                    id="stop"
                                    value={selectedStop}
                                    onChange={(e) => setSelectedStop(e.target.value)}
                                    icon={<MapPin size={16} />}
                                >
                                    {nearestStops.map((stop) => (
                                        <option key={stop.id} value={stop.id} className="bg-zinc-900">
                                            {stop.name} ({stop.distance_m}m)
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <div className="p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center space-y-4">
                                    <AlertCircle size={28} className="mx-auto text-white/20" />
                                    <p className="text-[10px] text-muted font-black uppercase tracking-tight leading-relaxed">
                                        {location ? "Nenhum ponto encontrado perto de você." : "Aguardando GPS para listar pontos..."}
                                    </p>
                                    {location && !isLoadingStops && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                trackTelemetry('stop_suggestion_open');
                                                setShowSuggestionModal(true);
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand/10 border border-brand/20 text-brand text-xs font-black uppercase tracking-widest hover:bg-brand/20 transition-colors"
                                        >
                                            <PlusCircle size={16} />
                                            Sugerir ponto aqui
                                        </button>
                                    )}
                                </div>
                            )}
                        </Field>

                        <Divider label="AÇÃO DE AUDITORIA" />

                        <div className="space-y-4">
                            <Button
                                onClick={handleArrived}
                                loading={isSubmitting}
                                disabled={!deviceId || !selectedStop}
                                className="w-full h-20 !text-xl !bg-brand !text-black hover:!scale-[1.02] active:!scale-[0.98] transition-all"
                                icon={<MapPin size={24} />}
                                iconPosition="right"
                            >
                                ESTOU NO PONTO
                            </Button>
                        </div>
                    </div>
                )}

                {/* Feedback da Chegada */}
                {message && (
                    <div className={`p-6 rounded-2xl text-center font-industrial text-lg tracking-widest animate-scale-in border ${message.includes('ERRO')
                        ? 'bg-danger/10 border-danger/20 text-danger'
                        : 'bg-brand/10 border-brand/20 text-brand'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Painel de Histórico / Top Linhas */}
                {selectedStop && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <Divider label="LINHAS MAIS VISTAS AQUI (30D)" />

                        {isLoadingTopLines ? (
                            <div className="p-8 border border-white/5 rounded-2xl bg-white/[0.01] text-center text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">
                                Buscando Histórico...
                            </div>
                        ) : topLines.length > 0 ? (
                            <div className="space-y-3">
                                {topLines.map((line) => (
                                    <div key={line.line_id} className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
                                        <div className="flex justify-between items-start gap-4 z-10">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-industrial text-lg text-brand tracking-widest leading-none bg-brand/10 px-2 py-0.5 rounded-md">
                                                        {line.code}
                                                    </span>
                                                    <span className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                                                        {line.name}
                                                    </span>
                                                </div>
                                                <TrustMixBadge total={line.count} pctVerified={line.pctVerified} />
                                            </div>

                                        </div>

                                        {/* Botão de Registro Rápido */}
                                        <div className="pt-2 border-t border-white/5">
                                            <Link
                                                href={`/registrar?stopId=${selectedStop}&lineId=${line.line_id}`}
                                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-brand/20 hover:text-brand text-white text-xs font-black uppercase tracking-widest transition-colors border border-white/5 hover:border-brand/30"
                                            >
                                                <Bus size={14} />
                                                Registrar 1-toque
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center space-y-2">
                                <AlertCircle size={24} className="mx-auto text-white/20 mb-2" />
                                <p className="text-xs text-white/60 font-medium">Sem dados ainda neste ponto.</p>
                                <p className="text-[10px] text-brand/80 font-black uppercase tracking-widest">Seja o primeiro a registrar abaixo! 👑</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 1-Tap Section (after arrival) */}
                {hasArrived && selectedStop && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <Divider label="QUER REGISTRAR AGORA?" />

                        <OneTapCard
                            stopId={selectedStop}
                            stopName={currentStop?.name || 'Ponto Selecionado'}
                            mode="no-ponto"
                        />

                        <Link
                            href={`/registrar?stopId=${selectedStop}`}
                            onClick={() => trackTelemetry('no_ponto_to_registrar_clicked')}
                            className="flex items-center justify-between w-full p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Bus size={18} className="text-brand opacity-60" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/70">
                                    Ir para registrar completo
                                </span>
                            </div>
                            <ArrowRight size={16} className="text-brand" />
                        </Link>
                    </div>
                )}

                {/* Tips Section */}
                {!hasArrived && (
                    <>
                        <Divider label="MEIOS DE PROVA" />
                        <Card className="!p-4 bg-white/[0.02] border-white/5">
                            <p className="text-[11px] text-muted font-bold leading-relaxed uppercase tracking-tight">
                                💡 <strong className="text-brand">Check-in:</strong> Fazer check-in no ponto aumenta sua reputação de auditor e ajuda a penalizar atrasos fantasmas.
                            </p>
                        </Card>
                    </>
                )}
            </div>

            <HelpModal
                storageKey="help_no_ponto_v1"
                tips={[
                    "O GPS é capturado automáticamente ao abrir a página.",
                    "Sempre selecione o ponto correto da lista para que seu dado seja computado.",
                    "Após fazer check-in, você pode registrar passagem ou embarque com 1 toque.",
                    "Se não encontrar seu ponto, use 'Sugerir ponto aqui' para ajudar a mapear a cidade.",
                ]}
            />

            {showSuggestionModal && location && (
                <StopSuggestionModal
                    lat={location.lat}
                    lng={location.lng}
                    deviceId={deviceId}
                    onClose={() => setShowSuggestionModal(false)}
                />
            )}
        </AppShell>
    );
}
