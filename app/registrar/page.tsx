"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDeviceId } from '@/hooks/useDeviceId';
import { RatingModal } from '@/components/RatingModal';
import { QRScanner } from '@/components/QRScanner';
import { QrCode, Navigation, ChevronRight, Share2, Loader2, ChevronDown, Camera } from 'lucide-react';
import { HelpModal } from '@/components/HelpModal';
import {
    AppShell, PageHeader, Button, Card, Divider, InlineAlert, SecondaryCTA, PublicTopBar, NextStepBlock
} from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { suggestLine } from '@/lib/suggestLine';
import { OneTapCard } from '@/components/OneTapCard';
import { BusPhotoModal } from '@/components/BusPhotoModal';
import { BusPhotoDraft, getRecentBusPhotoDraft } from '@/lib/busPhotoDraft';
import Link from 'next/link';

const TRUST_COPY: Record<string, string> = {
    L1: 'vale como relato.',
    L2: 'confirmado por mais gente.',
    L3: 'prova forte.'
};

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isBusPhotoModalOpen, setIsBusPhotoModalOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [recentPhotoDraft, setRecentPhotoDraft] = useState<BusPhotoDraft | null>(() =>
        typeof window === 'undefined' ? null : getRecentBusPhotoDraft()
    );

    const { isOnline, pendingCount } = useOfflineSync();

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
        <AppShell hideHeader>
            <PublicTopBar title="Registrar" />

            <div className="max-w-md mx-auto py-4 space-y-6">
                <PageHeader
                    title={registrationComplete ? "Relato Concluído!" : "Relatar Presença"}
                    subtitle={registrationComplete ? "Seu dado já está ajudando a cidade." : `Relate agora onde você está`}
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
                                                if (result.queued) {
                                                    setMessage("SALVO NO CELULAR");
                                                } else {
                                                    const trust = result.trust_level || 'L1';
                                                    const trustCopy = TRUST_COPY[trust] || TRUST_COPY.L1;
                                                    setMessage(`Seu registro contou como: ${trust} - ${trustCopy}`);
                                                }
                                                setRegistrationComplete(true);
                                                setIsModalOpen(true);
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
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Iniciando auditoria...</p>
                                </Card>
                            )}

                            <div className="pt-4 space-y-4">
                                <Divider label="MEIOS DE PROVA" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <SecondaryCTA
                                        onClick={() => setIsScannerOpen(true)}
                                        icon={<QrCode size={18} aria-hidden="true" />}
                                        aria-label="Escanear QR Code no ponto parceiro"
                                    >
                                        QR CODE
                                    </SecondaryCTA>
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
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" role="alert">
                            {message && (
                                <div className={`p-8 rounded-[2.5rem] text-center font-industrial text-2xl tracking-widest border-2 shadow-xl ${message.includes('ERRO')
                                    ? 'bg-danger/10 border-danger/20 text-danger'
                                    : 'bg-brand/10 border-brand/20 text-brand'
                                    }`}>
                                    {message}
                                </div>
                            )}

                            <NextStepBlock>
                                <Link href={`/ponto/${selectedStopId}`} className="block">
                                    <Button
                                        variant="secondary"
                                        className="w-full justify-between group h-14"
                                        icon={<ChevronRight className="opacity-0 group-hover:opacity-100 transition-all" />}
                                        iconPosition="right"
                                    >
                                        <div className="text-left">
                                            <p className="text-[8px] uppercase tracking-widest opacity-60">Status Real</p>
                                            <p>Ver este ponto</p>
                                        </div>
                                    </Button>
                                </Link>

                                <Link href="/boletim" className="block">
                                    <Button
                                        variant="primary"
                                        className="w-full justify-between group h-14"
                                        icon={<Share2 className="opacity-50 group-hover:opacity-100 transition-all" />}
                                        iconPosition="right"
                                    >
                                        <div className="text-left">
                                            <p className="text-[8px] uppercase tracking-widest opacity-60 font-black">Impacto</p>
                                            <p>Ver Boletim</p>
                                        </div>
                                    </Button>
                                </Link>
                            </NextStepBlock>

                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => setRegistrationComplete(false)}
                                    className="text-[10px] opacity-40 hover:opacity-100"
                                >
                                    Registrar outro ônibus
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isScannerOpen && (
                <QRScanner onClose={() => setIsScannerOpen(false)} />
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
