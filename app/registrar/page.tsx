"use client";
import { useState, useEffect } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';
import { QRScanner } from '@/components/QRScanner';
import { QrCode, MapPin, Bus, Navigation, Search } from 'lucide-react';
import { HelpModal } from '@/components/HelpModal';
import { AppShell, PageHeader, Button, Card, Divider, Field, Textarea, InlineAlert, Select } from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueEvent } from '@/lib/offlineQueue';
import { suggestLine, saveLastLine, SuggestedLine } from '@/lib/suggestLine';
import { OneTapCard } from '@/components/OneTapCard';

export default function Registrar() {
    const deviceId = useDeviceId();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);
    const [isLoadingStops, setIsLoadingStops] = useState(false);

    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<SuggestedLine | null>(null);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [showFullSelector, setShowFullSelector] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [lastTrust, setLastTrust] = useState<string | null>(null);
    const [lastMethod, setLastMethod] = useState<string | null>(null);
    const [observation, setObservation] = useState('');

    const { isOnline, isSyncing, pendingCount, syncNow, refreshPending } = useOfflineSync();

    // 1. Get GPS Location
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setGpsStatus('Localizado');
                },
                (error) => {
                    setGpsStatus('Erro: ' + error.message);
                }
            );
        }
    }, []);

    // 2. Fetch Nearest Stops
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
                        setSelectedStopId(data.stops[0].id);
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

    // 3. Get Suggested Line when stop is selected
    useEffect(() => {
        async function getSuggestion() {
            if (!selectedStopId) return;
            setIsLoadingSuggestion(true);
            try {
                const s = await suggestLine(selectedStopId, deviceId as string);
                setSuggestion(s);
                if (s) {
                    setSelectedLineId(s.line_id);
                }
            } catch (e) {
                console.error("Erro na sugestão:", e);
            } finally {
                setIsLoadingSuggestion(false);
            }
        }
        getSuggestion();
    }, [selectedStopId, deviceId]);

    const registerEvent = async (eventType: string, overrideLineId?: string) => {
        const lineId = overrideLineId || selectedLineId;
        const stopId = selectedStopId;

        if (!deviceId || !stopId || !lineId) {
            setMessage('ERRO: SELECIONE PONTO E LINHA.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        setLastTrust(null);
        setLastMethod(null);

        const eventId = crypto.randomUUID();
        const payload = {
            deviceId,
            stopId,
            lineId,
            eventType,
            metadata: observation ? { observation } : undefined
        };

        // Telemetry helpers
        const isOneTap = !showFullSelector && !overrideLineId && suggestion?.line_id === lineId;
        const trackTelemetry = (event: string) => {
            fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event })
            }).catch(() => { });
        };

        try {
            if (isOneTap) {
                trackTelemetry('one_tap_used');
                trackTelemetry(`one_tap_confidence_${suggestion?.confidence.toLowerCase()}`);
            }

            if (!isOnline) {
                await enqueueEvent({
                    id: eventId,
                    payload,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });
                await refreshPending();
                setMessage("SALVO OFFLINE (SERÁ ENVIADO QUANDO HOUVER REDE)");
                if (eventType === 'boarding' || eventType === 'passed_by') setIsModalOpen(true);
                setIsSubmitting(false);

                // Save last line on success (even offline)
                if (suggestion && lineId === suggestion.line_id) {
                    saveLastLine(stopId, { line_id: suggestion.line_id, code: suggestion.code, name: suggestion.name });
                }
                return;
            }

            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, clientEventId: eventId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

            // Save last line for future suggestions
            if (suggestion && lineId === suggestion.line_id) {
                saveLastLine(stopId, { line_id: suggestion.line_id, code: suggestion.code, name: suggestion.name });
            }

            const trust = data.event?.trust_level || 'L1';
            const method = data.event?.trust_method || 'L1';
            setLastTrust(trust);
            setLastMethod(method);

            let successMsg = "RELATO ENVIADO!";
            if (trust === 'L2') successMsg = "CONFIRMADO PELA COMUNIDADE!";
            if (trust === 'L3') successMsg = `PROVA FORTE ATIVADA VIA ${method}!`;

            setMessage(successMsg);

            if (eventType === 'boarding' || eventType === 'passed_by') {
                setIsModalOpen(true);
            }
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setMessage('ERRO NO REGISTRO: ' + errMessage.toUpperCase());
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStop = nearestStops.find(s => s.id === selectedStopId);

    return (
        <AppShell title="REGISTRAR AUDITORIA">
            <PageHeader
                title="Relatar Agora"
                subtitle={`O ${suggestion ? "1 toque" : "fluxo"} de auditoria baseado em posição`}
            />

            <div className="space-y-6">
                {(!isOnline || pendingCount > 0) && (
                    <InlineAlert
                        variant={isOnline ? "warning" : "error"}
                        title={isOnline ? "Fila Aguardando Sincronismo" : "Conexão Instável (Offline)"}
                    >
                        <div className="flex flex-col gap-3 mt-1">
                            <p className="text-xs">
                                {!isOnline
                                    ? "Você está offline. Novos registros serão salvos e enviados automaticamente quando a conexão voltar."
                                    : "A rede voltou. Você possui relatos salvos precisando ser despachados."}
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

                {/* Localização e Ponto Detectado */}
                <Card variant="surface2" className="border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <Navigation size={14} className={location ? "text-brand" : "text-zinc-600 animate-pulse"} />
                        <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Localização GPS</p>
                            <p className="text-xs font-bold text-white uppercase truncate">
                                {gpsStatus} {location && `(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`}
                            </p>
                        </div>
                        {nearestStops.length > 0 && (
                            <div className="h-8 w-px bg-white/5" />
                        )}
                        {selectedStopId && (
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Ponto</p>
                                <p className="text-xs font-bold text-brand uppercase truncate max-w-[120px]">
                                    {currentStop?.name}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* 1 Touch Feature */}
                {!showFullSelector && suggestion && (
                    <OneTapCard
                        stopName={currentStop?.name || 'Local Atual'}
                        suggestion={suggestion}
                        loading={isLoadingSuggestion}
                        isSubmitting={isSubmitting}
                        onRegister={registerEvent}
                        onChangeLine={() => setShowFullSelector(true)}
                    />
                )}

                {/* Full Selector / Fallback */}
                {(!suggestion || showFullSelector) && (
                    <Card variant="surface" className="p-6 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Search size={16} className="text-brand" />
                            <h3 className="font-industrial text-sm text-white uppercase tracking-widest">Seleção Manual</h3>
                        </div>

                        <Field label="Ponto de Ônibus" hint={isLoadingStops ? "Buscando..." : "Localizado via GPS"}>
                            <Select
                                value={selectedStopId || ''}
                                onChange={(e) => setSelectedStopId(e.target.value)}
                                icon={<MapPin size={16} />}
                                disabled={isLoadingStops}
                            >
                                {nearestStops.map(s => (
                                    <option key={s.id} value={s.id} className="bg-zinc-900">{s.name} ({s.distance_m}m)</option>
                                ))}
                                {nearestStops.length === 0 && <option value="">Nenhum ponto próximo</option>}
                            </Select>
                        </Field>

                        <Field label="Linha de Ônibus" hint="Qual linha você deseja auditar?">
                            <Select
                                value={selectedLineId || ''}
                                onChange={(e) => setSelectedLineId(e.target.value)}
                                icon={<Bus size={16} />}
                            >
                                <option value="">Selecione uma linha...</option>
                                {/* In a real app, this would be a filtered searchable list. For the MVP, we assume recent or common lines */}
                                <option value="11111111-1111-1111-1111-111111111111" className="bg-zinc-900">P200 - Vila Rica</option>
                                <option value="315-RETIRO" className="bg-zinc-900">315 - Retiro</option>
                            </Select>
                        </Field>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button
                                onClick={() => registerEvent('passed_by')}
                                loading={isSubmitting}
                                disabled={!selectedLineId || !selectedStopId}
                                className="h-14 !bg-orange-600 !text-white"
                            >
                                Passou
                            </Button>
                            <Button
                                onClick={() => registerEvent('boarding')}
                                loading={isSubmitting}
                                disabled={!selectedLineId || !selectedStopId}
                                className="h-14 !bg-emerald-600 !text-white"
                            >
                                Entrei
                            </Button>
                        </div>
                    </Card>
                )}

                <Divider label="DETALHES ADICIONAIS" />

                <Field
                    label="Observação Opcional"
                    hint="Algo incomum? Ex: Ônibus extra, mudou itinerário..."
                >
                    <Textarea
                        id="observation"
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Escreva aqui..."
                        className="!min-h-[80px]"
                    />
                </Field>

                {message && (
                    <div className={`p-6 rounded-2xl text-center font-industrial text-lg tracking-widest animate-scale-in border ${message.includes('ERRO')
                        ? 'bg-danger/10 border-danger/20 text-danger'
                        : 'bg-brand/10 border-brand/20 text-brand'
                        }`}>
                        {message}
                        {lastTrust === 'L3' && lastMethod === 'TRAJETO' && (
                            <p className="text-[10px] uppercase font-sans font-black tracking-tighter opacity-70 mt-1 text-white">
                                AUDITORIA VALIDADA PELO SISTEMA
                            </p>
                        )}
                    </div>
                )}

                <Divider label="MEIOS DE PROVA" />

                <div className="space-y-4">
                    <Card className="!p-4 bg-white/[0.02]">
                        <p className="text-[11px] text-muted font-bold leading-relaxed uppercase tracking-tight">
                            💡 <strong className="text-brand">Dica L3:</strong> Marque &quot;Entrei&quot; no embarque e &quot;Desci&quot; ao chegar no destino para ganhar Prova de Trajeto automaticamente.
                        </p>
                    </Card>

                    <Button
                        variant="secondary"
                        onClick={() => setIsScannerOpen(true)}
                        className="w-full h-14 !text-sm border-white/10"
                        icon={<QrCode size={18} />}
                    >
                        Prova de Ponto Parceiro (QR)
                    </Button>
                </div>
            </div>

            {isScannerOpen && (
                <QRScanner onClose={() => setIsScannerOpen(false)} />
            )}

            <RatingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lineId={selectedLineId || ''}
                deviceId={deviceId}
            />

            <HelpModal
                storageKey="help_registrar_v1"
                tips={[
                    "Marque 'Ônibus Passou' se o veículo chegou cheio ou você preferiu não embarcar.",
                    "Marque 'Entrei' ao embarcar. Se depois marcar 'Desci', o sistema gera Prova de Trajeto (L3).",
                    "A sugestão de 1 toque aprende com seus hábitos diários de transporte.",
                ]}
            />
        </AppShell>
    );
}
