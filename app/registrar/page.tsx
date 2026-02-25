"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDeviceId } from '@/hooks/useDeviceId';
import { QRScanner } from '@/components/QRScanner';
import { QrCode, Navigation, Loader2, ChevronDown, Camera, Bus, Search } from 'lucide-react';
import {
    AppShell, PageHeader, Button, Card, Divider, InlineAlert, SecondaryCTA, RecordReceipt
} from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { suggestLine } from '@/lib/suggestLine';
import { OneTapCard } from '@/components/OneTapCard';
import type { OneTapResult } from '@/hooks/useOneTap';
import { BusPhotoModal } from '@/components/BusPhotoModal';
import { LineSearchModal } from '@/components/LineSearchModal';
import { BusPhotoDraft, getRecentBusPhotoDraft } from '@/lib/busPhotoDraft';
import { ServiceRatingCard } from '@/components/ServiceRatingCard';
import Link from 'next/link';
import { saveLastLine } from '@/lib/suggestLine';
import { trackFunnel, FUNNEL_EVENTS } from '@/lib/telemetry';

const DAILY_TIPS = [
    "Se puder, registre 'passou' e depois 'entrei' - melhora a prova.",
    'Registrar em 2 pontos diferentes no dia ajuda a leitura real da cidade.',
    'Quando trocar de linha, atualize o registro para manter o mapa limpo.'
];
const DAILY_TIP_INDEX = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_TIPS.length;

export default function Registrar() {
    const deviceId = useDeviceId();
    const searchParams = useSearchParams();
    const queryStopId = searchParams.get('stopId');
    const queryLineId = searchParams.get('lineId');

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, distance_m: number }[]>([]);

    const [selectedStopId, setSelectedStopId] = useState<string | null>(queryStopId);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(queryLineId);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isLineSearchOpen, setIsLineSearchOpen] = useState(false);
    const [isBusPhotoModalOpen, setIsBusPhotoModalOpen] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [registrationData, setRegistrationData] = useState<{ trust_level?: string; queued?: boolean } | null>(null);
    const [lastRecorded, setLastRecorded] = useState<OneTapResult | null>(null);
    const [recentPhotoDraft, setRecentPhotoDraft] = useState<BusPhotoDraft | null>(() =>
        typeof window === 'undefined' ? null : getRecentBusPhotoDraft()
    );

    const { isOnline, pendingCount } = useOfflineSync();

    // 1. Get GPS Location
    useEffect(() => {
        trackFunnel(FUNNEL_EVENTS.REGISTRAR_OPEN);
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
    const dailyTip = DAILY_TIPS[DAILY_TIP_INDEX];

    return (
        <AppShell title="Registrar">
            <div className="max-w-md mx-auto py-4 space-y-6">
                <PageHeader
                    title={registrationComplete ? "Relato Concluído!" : "Registrar Relato"}
                    subtitle={registrationComplete ? "Seu relato já está ajudando a cidade." : `Diga agora onde você está`}
                />

                <div className="space-y-6">
                    {(!isOnline || pendingCount > 0) && (
                        <InlineAlert
                            variant={isOnline ? "warning" : "error"}
                            title={isOnline ? "Sincronizando Dados" : "Internet Instável (Offline)"}
                        >
                            <div className="flex flex-col gap-3 mt-1">
                                <p className="text-xs">
                                    {!isOnline
                                        ? "Você está sem internet. O registro ficará salvo no celular e será enviado assim que a rede voltar."
                                        : "A rede voltou. Enviando os relatos que estavam guardados..."}
                                </p>
                            </div>
                        </InlineAlert>
                    )}

                    {!registrationComplete ? (
                        <>
                            <div className="min-h-[64px]">
                                <Card variant="surface2" className="border-white/5 bg-white/[0.02]" aria-label="Status da Localização">
                                    <div className="flex items-center gap-3">
                                        <Navigation size={14} className={location ? "text-brand" : "text-zinc-600 animate-pulse"} aria-hidden="true" />
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Localização</p>
                                            <p className="text-xs font-bold text-white uppercase truncate">
                                                {location ? "Localizado via GPS" : gpsStatus}
                                            </p>
                                        </div>
                                        {selectedStopId && (
                                            <div className="text-right">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Seu Ponto</p>
                                                <p className="text-xs font-bold text-brand uppercase truncate max-w-[120px]">
                                                    {currentStop?.name || queryStopId || 'Detectando...'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="min-h-[180px]">
                                <Card variant="surface2" className="mb-3 border-white/10 bg-white/[0.03]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-brand/80">
                                        Dica do dia
                                    </p>
                                    <p className="text-xs font-bold text-white/85 mt-1">
                                        {dailyTip}
                                    </p>
                                </Card>

                                <div className="mb-4">
                                    <button
                                        onClick={() => setIsLineSearchOpen(true)}
                                        className="w-full h-20 flex items-center justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all group shadow-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-brand/10 p-3 rounded-2xl text-brand group-hover:scale-110 transition-transform">
                                                <Bus size={24} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Linha selecionada</p>
                                                <p className="text-lg font-black text-white uppercase italic font-industrial tracking-tight">
                                                    {selectedLineId === 'unknown' ? 'Linha desconhecida' : (selectedLineId || 'Detectando...')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand group-hover:bg-brand group-hover:text-black transition-all">
                                            Trocar
                                            <Search size={14} />
                                        </div>
                                    </button>
                                    <p className="text-[10px] text-white/30 mt-3 px-1 leading-relaxed">
                                        Se o ônibus não tiver número ou se você estiver na dúvida, escolha <strong>&quot;Linha desconhecida&quot;</strong>.
                                    </p>
                                </div>

                                {selectedStopId ? (
                                    <OneTapCard
                                        stopId={selectedStopId}
                                        stopName={currentStop?.name || 'Local Atual'}
                                        defaultLineId={queryLineId || undefined}
                                        onRecorded={(result) => {
                                            if (result.ok) {
                                                // Increment PWA action count
                                                const currentCount = parseInt(localStorage.getItem('pwa_action_count') || '0', 10);
                                                localStorage.setItem('pwa_action_count', (currentCount + 1).toString());

                                                setRecentPhotoDraft(getRecentBusPhotoDraft());
                                                setRegistrationData({
                                                    trust_level: result.trust_level,
                                                    queued: result.queued
                                                });
                                                setLastRecorded(result);
                                                setRegistrationComplete(true);
                                                trackFunnel(FUNNEL_EVENTS.EVENT_RECORDED);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-[180px] w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2">
                                                    <div className="h-4 w-24 bg-white/5 rounded" />
                                                    <div className="h-6 w-48 bg-white/5 rounded" />
                                                </div>
                                                <div className="h-10 w-10 bg-white/5 rounded-full" />
                                            </div>
                                            <div className="h-12 w-full bg-brand/10 rounded-2xl" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!selectedStopId && !location && (
                                <Card className="p-12 text-center border-dashed border-white/5 bg-white/[0.01]">
                                    <Loader2 className="animate-spin text-brand mx-auto mb-4" size={32} aria-hidden="true" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Preparando relato...</p>
                                </Card>
                            )}

                            <div className="pt-4 space-y-4">
                                <Divider label="MEIOS DE PROVA" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Link href="/scan" className="contents">
                                        <SecondaryCTA
                                            onClick={() => { }}
                                            icon={<QrCode size={18} aria-hidden="true" />}
                                            aria-label="Escanear QR Code no ponto parceiro"
                                        >
                                            QR CODE
                                        </SecondaryCTA>
                                    </Link>
                                    <SecondaryCTA
                                        onClick={() => setIsBusPhotoModalOpen(true)}
                                        icon={<Camera size={18} aria-hidden="true" />}
                                        aria-label="Capturar foto opcional do ônibus"
                                    >
                                        FOTO
                                    </SecondaryCTA>
                                    <SecondaryCTA
                                        onClick={() => { /* toggle observation */ }}
                                        icon={<ChevronDown size={18} aria-hidden="true" />}
                                        aria-label="Adicionar uma observação ao relato"
                                    >
                                        OBSERVAR
                                    </SecondaryCTA>
                                </div>
                                {recentPhotoDraft && (
                                    <Card variant="surface2" className="border-emerald-500/20 bg-emerald-500/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                            Foto de prova anexada
                                        </p>
                                        <p className="text-xs font-bold text-white mt-1">
                                            {recentPhotoDraft.line_code
                                                ? `Sugestão/linha: ${recentPhotoDraft.line_code}`
                                                : 'Foto pronta para reforçar o próximo registro.'}
                                        </p>
                                    </Card>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-8">
                            <ServiceRatingCard
                                deviceId={deviceId}
                                clientEventId={lastRecorded?.client_event_id}
                                eventId={lastRecorded?.event_id}
                                eventType={lastRecorded?.event_type}
                                title="Como foi o serviço nesta viagem?"
                            />

                            <RecordReceipt
                                stopId={selectedStopId || ''}
                                stopName={currentStop?.name || 'selecionado'}
                                trustLevel={registrationData?.trust_level}
                                isPending={registrationData?.queued}
                            />

                            <Card variant="surface2" className="border-white/10 bg-white/[0.03]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand">Quer fortalecer mais?</p>
                                <div className="mt-3 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs text-white/85">
                                            Registrar &quot;passou&quot; e depois &quot;entrei&quot; melhora a prova.
                                        </p>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setRegistrationComplete(false)}
                                            className="!h-9 !px-3 !text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10"
                                        >
                                            Registrar aqui
                                        </Button>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs text-white/85">
                                            Registrar em mais 1 ponto hoje fecha amostra.
                                        </p>
                                        <Link href="/no-ponto">
                                            <Button
                                                variant="ghost"
                                                className="!h-9 !px-3 !text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10"
                                            >
                                                Ir para outro ponto
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {isScannerOpen && (
                <QRScanner onClose={() => setIsScannerOpen(false)} />
            )}

            {isLineSearchOpen && (
                <LineSearchModal
                    onClose={() => setIsLineSearchOpen(false)}
                    onSelect={(line) => {
                        setSelectedLineId(line.line_id);
                        trackFunnel(FUNNEL_EVENTS.STOP_SELECTED);
                        if (selectedStopId) {
                            saveLastLine(selectedStopId, line);
                        }
                        setIsLineSearchOpen(false);
                    }}
                />
            )}

            <BusPhotoModal
                isOpen={isBusPhotoModalOpen}
                onClose={() => setIsBusPhotoModalOpen(false)}
                deviceId={deviceId}
                stopId={selectedStopId}
                lineId={selectedLineId || queryLineId}
                location={location}
                isOnline={isOnline}
                onSaved={(draft) => setRecentPhotoDraft(draft)}
            />
        </AppShell>
    );
}
