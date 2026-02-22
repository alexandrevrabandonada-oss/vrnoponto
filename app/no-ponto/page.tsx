'use client';

import { useState, useEffect } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { HelpModal } from '@/components/HelpModal';
import { MapPin, Navigation, Bus, AlertCircle } from 'lucide-react';
import {
    AppShell, PageHeader, Card, Divider, Button,
    Field, Select, InlineAlert
} from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueEvent } from '@/lib/offlineQueue';

// IDs mockados (vindos da migration 0002_seed.sql)
const MOCK_LINE_ID = '11111111-1111-1111-1111-111111111111';

export default function NoPonto() {
    const deviceId = useDeviceId();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);

    const [selectedStop, setSelectedStop] = useState('');
    const [selectedLine, setSelectedLine] = useState(MOCK_LINE_ID); // Manteremos a linha mockada pro MVP
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoadingStops, setIsLoadingStops] = useState(false);

    const { isOnline, isSyncing, pendingCount, syncNow, refreshPending } = useOfflineSync();

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
            lineId: selectedLine,
            eventType: 'arrived'
        };

        try {
            if (!isOnline) {
                // Fila Offline
                await enqueueEvent({
                    id: eventId,
                    payload,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });
                await refreshPending();

                fetch('/api/telemetry', { method: 'POST', body: JSON.stringify({ event: 'offline_queue_enqueued' }) }).catch(() => { });
                setMessage("SALVO OFFLINE (SERÁ ENVIADO QUANDO HOUVER REDE)");
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
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('ERRO NO REGISTRO: ' + errMessage.toUpperCase());
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <div className="p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center space-y-2">
                                <AlertCircle size={24} className="mx-auto text-white/20" />
                                <p className="text-[10px] text-muted font-black uppercase tracking-tight leading-relaxed">
                                    {location ? "Nenhum ponto localizado no seu perímetro." : "Aguardando GPS para listar pontos..."}
                                </p>
                            </div>
                        )}
                    </Field>

                    <Field label="Linha pretendida" hint="Qual ônibus você vai pegar?">
                        <Select
                            id="line"
                            value={selectedLine}
                            onChange={(e) => setSelectedLine(e.target.value)}
                            icon={<Bus size={16} />}
                        >
                            <option value={MOCK_LINE_ID} className="bg-zinc-900">P200 - Vila Rica / Centro</option>
                        </Select>
                    </Field>
                </div>

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

                    {message && (
                        <div className={`p-6 rounded-2xl text-center font-industrial text-lg tracking-widest animate-scale-in border ${message.includes('ERRO')
                            ? 'bg-danger/10 border-danger/20 text-danger'
                            : 'bg-brand/10 border-brand/20 text-brand'
                            }`}>
                            {message}
                        </div>
                    )}
                </div>

                <Divider label="MEIOS DE PROVA" />
                <Card className="!p-4 bg-white/[0.02] border-white/5">
                    <p className="text-[11px] text-muted font-bold leading-relaxed uppercase tracking-tight">
                        💡 <strong className="text-brand">Check-in:</strong> Fazer check-in no ponto aumenta sua reputação de auditor e ajuda a penalizar atrasos fantasmas.
                    </p>
                </Card>
            </div>

            <HelpModal
                storageKey="help_no_ponto_v1"
                tips={[
                    "O GPS é capturado automáticamente ao abrir a página.",
                    "Sempre selecione o ponto correto da lista para que seu dado seja computado.",
                    "Este check-in é o primeiro passo para uma auditoria L3 (Trajeto).",
                ]}
            />
        </AppShell>
    );
}
