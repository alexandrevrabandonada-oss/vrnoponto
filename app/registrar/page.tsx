"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';
import { QRScanner } from '@/components/QRScanner';
import { QrCode, Navigation, MapPin, Bus, ChevronRight, Share2, Loader2, ChevronDown } from 'lucide-react';
import { HelpModal } from '@/components/HelpModal';
import { AppShell, PageHeader, Button, Card, Divider, Field, Textarea, InlineAlert } from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { suggestLine, SuggestedLine } from '@/lib/suggestLine';
import { OneTapCard } from '@/components/OneTapCard';
import Link from 'next/link';

export default function Registrar() {
    const deviceId = useDeviceId();
    const searchParams = useSearchParams();
    const queryStopId = searchParams.get('stopId');

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);

    const [selectedStopId, setSelectedStopId] = useState<string | null>(queryStopId);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<SuggestedLine | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [lastTrust, setLastTrust] = useState<string | null>(null);
    const [lastMethod, setLastMethod] = useState<string | null>(null);
    const [observation, setObservation] = useState('');
    const [registrationComplete, setRegistrationComplete] = useState(false);

    const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

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
            try {
                const res = await fetch(`/api/stops/nearest?lat=${location.lat}&lng=${location.lng}&lim=3`);
                if (res.ok) {
                    const data = await res.json();
                    setNearestStops(data.stops || []);
                    if (!queryStopId && data.stops?.length > 0) {
                        setSelectedStopId(data.stops[0].id);
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar pontos:", err);
            }
        }
        fetchStops();
    }, [location, queryStopId]);

    // 3. Get Suggested Line when stop is selected
    useEffect(() => {
        async function getSuggestion() {
            if (!selectedStopId) return;
            try {
                const s = await suggestLine(selectedStopId, deviceId as string);
                setSuggestion(s);
                if (s) {
                    setSelectedLineId(s.line_id);
                }
            } catch (e) {
                console.error("Erro na sugestão:", e);
            }
        }
        getSuggestion();
    }, [selectedStopId, deviceId]);

    const currentStop = nearestStops.find(s => s.id === selectedStopId);

    return (
        <AppShell title="REGISTRAR AUDITORIA">
            <PageHeader
                title={registrationComplete ? "Relato Concluído!" : "Relatar Agora"}
                subtitle={registrationComplete ? "Seu dado já está ajudando a cidade." : `Fluxo de auditoria rápida`}
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
                                    ? "Você está offline. O registro será enviado automaticamente depois."
                                    : "A rede voltou. Sincronizando dados pendentes..."}
                            </p>
                        </div>
                    </InlineAlert>
                )}

                {!registrationComplete ? (
                    <>
                        <Card variant="surface2" className="border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Navigation size={14} className={location ? "text-brand" : "text-zinc-600 animate-pulse"} />
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">GPS</p>
                                    <p className="text-xs font-bold text-white uppercase truncate">
                                        {gpsStatus}
                                    </p>
                                </div>
                                {selectedStopId && (
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Ponto</p>
                                        <p className="text-xs font-bold text-brand uppercase truncate max-w-[120px]">
                                            {currentStop?.name || queryStopId || 'Detectando...'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {selectedStopId && (
                            <OneTapCard
                                stopId={selectedStopId}
                                stopName={currentStop?.name || 'Local Atual'}
                                mode="registrar"
                                onRecorded={(result) => {
                                    if (result.ok) {
                                        if (result.queued) {
                                            setMessage("SALVO OFFLINE");
                                        } else {
                                            const trust = result.trust_level || 'L1';
                                            setLastTrust(trust);
                                            setLastMethod(trust === 'L3' ? 'TRAJETO' : trust);
                                            setMessage("RELATO ENVIADO!");
                                        }
                                        setRegistrationComplete(true);
                                        setIsModalOpen(true);
                                    }
                                }}
                            />
                        )}

                        {!selectedStopId && !location && (
                            <Card className="p-12 text-center border-dashed border-white/5 bg-white/[0.01]">
                                <Loader2 className="animate-spin text-brand mx-auto mb-4" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Iniciando auditoria...</p>
                            </Card>
                        )}

                        <div className="pt-4 space-y-3">
                            <Divider label="OPÇÕES ADICIONAIS" />
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="h-14 !text-[10px] font-black uppercase tracking-widest border-white/5"
                                    icon={<QrCode size={18} />}
                                >
                                    QR CODE
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => { /* toggle observation */ }}
                                    className="h-14 !text-[10px] font-black uppercase tracking-widest border-white/5"
                                    icon={<ChevronDown size={18} />}
                                >
                                    OBSERVAR
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {message && (
                            <div className={`p-8 rounded-[2.5rem] text-center font-industrial text-2xl tracking-widest border-2 shadow-xl ${message.includes('ERRO')
                                ? 'bg-danger/10 border-danger/20 text-danger'
                                : 'bg-brand/10 border-brand/20 text-brand'
                                }`}>
                                {message}
                                {lastTrust === 'L3' && (
                                    <p className="text-[10px] uppercase font-sans font-black tracking-tighter opacity-70 mt-2 text-white/60">
                                        PROVA FORTE ATIVADA
                                    </p>
                                )}
                            </div>
                        )}

                        <Divider label="PRÓXIMO PASSO" />

                        <div className="grid grid-cols-1 gap-4 text-left">
                            <Link href={`/ponto/${selectedStopId}`}>
                                <Card variant="surface2" className="group flex items-center justify-between !p-6 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer !rounded-[2rem]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-brand group-hover:text-black transition-colors">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Painel Público</p>
                                            <p className="font-industrial text-lg text-white tracking-tight">VER ESTE PONTO</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={24} className="text-white/20" />
                                </Card>
                            </Link>

                            <Link href="/boletim">
                                <Card variant="surface2" className="group flex items-center justify-between !p-6 border-brand/20 bg-brand/5 hover:bg-brand/10 transition-all cursor-pointer !rounded-[2rem]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-brand/10 rounded-2xl group-hover:bg-brand group-hover:text-black transition-colors">
                                            <Share2 size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-brand/60 mb-1">Transparência</p>
                                            <p className="font-industrial text-lg text-brand tracking-tight">COMPARTILHAR BOLETIM</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={24} className="text-brand/40" />
                                </Card>
                            </Link>

                            <Button
                                variant="ghost"
                                onClick={() => setRegistrationComplete(false)}
                                className="w-full h-12 !text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60"
                            >
                                Registrar outro ônibus
                            </Button>
                        </div>
                    </div>
                )}
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
                    "A auditoria em 1 toque usa GPS e seus horários habituais.",
                    "Marque 'Entrei' para ganhar Prova de Trajeto.",
                    "Seus dados alimentam o Boletim da Transparência.",
                ]}
            />
        </AppShell>
    );
}
