'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { HelpModal } from '@/components/HelpModal';
import { MapPin, Navigation, Bus, AlertCircle, ArrowRight, PlusCircle, CheckCircle2, HelpCircle, Camera, LocateFixed, Search, X, Share } from 'lucide-react';
import { StopSuggestionModal } from '@/components/StopSuggestionModal';
import { TrustMixBadge } from '@/components/TrustMixBadge';
import { useRouter } from 'next/navigation';
import {
    AppShell, Card, Divider, Button,
    Field, Select, Badge, PrimaryCTA, SectionCard,
    PublicTopBar, NextStepBlock, PageHeader
} from '@/components/ui';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useUiPrefs } from '@/lib/useUiPrefs';
import { enqueueEvent } from '@/lib/offlineQueue';
import { OneTapCard } from '@/components/OneTapCard';
import { BusPhotoModal } from '@/components/BusPhotoModal';
import { BusPhotoDraft, getRecentBusPhotoDraft } from '@/lib/busPhotoDraft';
import Link from 'next/link';

export default function NoPonto() {
    const deviceId = useDeviceId();
    const router = useRouter();

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<string>('Solicitando GPS...');
    const [nearestStops, setNearestStops] = useState<{ id: string, name: string, neighborhood?: string, distance_m: number }[]>([]);

    const [selectedStop, setSelectedStop] = useState('');
    const [autoNearestStop, setAutoNearestStop] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoadingStops, setIsLoadingStops] = useState(false);
    const [hasArrived, setHasArrived] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [isBusPhotoModalOpen, setIsBusPhotoModalOpen] = useState(false);
    const [recentPhotoDraft, setRecentPhotoDraft] = useState<BusPhotoDraft | null>(() =>
        typeof window === 'undefined' ? null : getRecentBusPhotoDraft()
    );

    // Search Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, neighborhood?: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Top Lines Logic
    const [topLines, setTopLines] = useState<{ line_id: string, code: string, name: string, count: number, pctVerified: number }[]>([]);
    const [isLoadingTopLines, setIsLoadingTopLines] = useState(false);
    const [rewardStopInfo, setRewardStopInfo] = useState<{ name: string, neighborhood?: string } | null>(null);

    const { isOnline, refreshPending } = useOfflineSync();
    const { stopMode, setStopMode } = useUiPrefs();

    const HUMAN_RATE_LIMIT_MESSAGE =
        'Calma, já recebemos um check-in seu agora há pouco. Tentar de novo em alguns minutos.';

    // Telemetry helper
    const trackTelemetry = useCallback((event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event })
        }).catch(() => { /* silent */ });
    }, []);

    const refreshGpsPosition = useCallback(() => {
        if (!('geolocation' in navigator)) {
            queueMicrotask(() => setGpsStatus('Geolocalização não suportada neste navegador.'));
            return;
        }

        setGpsStatus('Atualizando GPS...');
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
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    // Efeito para GPS
    useEffect(() => {
        setAutoNearestStop(stopMode === 'auto');
        refreshGpsPosition();
    }, [refreshGpsPosition, stopMode]);

    useEffect(() => {
        setStopMode(autoNearestStop ? 'auto' : 'manual');
    }, [autoNearestStop, setStopMode]);

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
                    if (autoNearestStop && data.stops?.length > 0) {
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
    }, [location, autoNearestStop]);

    useEffect(() => {
        if (!autoNearestStop || nearestStops.length === 0) return;
        if (selectedStop !== nearestStops[0].id) {
            setSelectedStop(nearestStops[0].id);
        }
    }, [autoNearestStop, nearestStops, selectedStop]);

    // Efeito para buscar linhas top do ponto selecionado e PREFETCH
    useEffect(() => {
        async function fetchTopLines() {
            if (!selectedStop) {
                setTopLines([]);
                return;
            }
            setIsLoadingTopLines(true);

            // Prefetch next probable step
            router.prefetch(`/registrar?stopId=${selectedStop}`);

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
    }, [selectedStop, router]);

    // Efeito para busca manual via typeahead
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/stops/search?q=${encodeURIComponent(searchQuery)}&lim=5`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.stops || []);
                }
            } catch (err) {
                console.error("Erro na busca:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400); // debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleArrived = async () => {
        if (!deviceId) return;
        setIsSubmitting(true);
        setMessage('');

        // Increment PWA action count
        const currentCount = parseInt(localStorage.getItem('pwa_action_count') || '0', 10);
        localStorage.setItem('pwa_action_count', (currentCount + 1).toString());

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
                if (res.status === 429) {
                    setMessage(HUMAN_RATE_LIMIT_MESSAGE);
                    return;
                }
                throw new Error(data.error || 'Erro desconhecido');
            }
            setMessage('PRESENÇA REGISTRADA! NÍVEL: ' + (data.event?.trust_level || 'L1'));
            setRewardStopInfo({
                name: currentStop?.name || 'este ponto',
                neighborhood: currentStop?.neighborhood
            });
            setHasArrived(true);
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            const normalized = errMessage.toLowerCase();
            if (normalized.includes('rate limit') || normalized.includes('429')) {
                setMessage(HUMAN_RATE_LIMIT_MESSAGE);
            } else {
                setMessage('ERRO NO REGISTRO: ' + errMessage.toUpperCase());
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStop = nearestStops.find(s => s.id === selectedStop);

    return (
        <AppShell hideHeader>
            <PublicTopBar title="No Ponto" />

            <div className="max-w-md mx-auto py-8 space-y-8">
                <PageHeader
                    title="Cheguei agora"
                    subtitle="Valide sua presença para auditoria real"
                />

                <div className="space-y-6">
                    <div className="space-y-8">
                        {/* ETAPA 1: GPS (Automático) */}
                        <Card variant={location ? "surface" : "surface2"} className={`transition-all duration-500 border-l-4 ${location ? "border-l-brand bg-brand/5 shadow-brand/5" : "border-l-white/10"}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-all ${location ? "bg-brand text-black scale-110" : "bg-white/5 text-white/20 animate-pulse"}`}>
                                    {location ? <CheckCircle2 size={24} /> : <Navigation size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Passo 1</p>
                                        {location && <span className="text-[8px] font-mono text-brand/50">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
                                    </div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">
                                        {location ? "Posição Capturada" : gpsStatus}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* ETAPA 2: Escolher Ponto */}
                        <div className={`transition-all duration-700 delay-100 ${location ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none translate-y-4"}`}>
                            <div className="flex items-center justify-between gap-3 mb-4 ml-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="brand" className="h-5 w-5 !p-0 flex items-center justify-center rounded-full text-[10px]" aria-hidden="true">2</Badge>
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-white/70">Qual é o seu ponto?</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoNearestStop((prev) => !prev)}
                                    className={`h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${autoNearestStop
                                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                                        : 'bg-white/[0.03] border-white/10 text-white/60'
                                        }`}
                                >
                                    {autoNearestStop ? 'Auto' : 'Manual'}
                                </button>
                            </div>

                            <Field
                                label=""
                                hint={isLoadingStops
                                    ? "Buscando pontos próximos..."
                                    : autoNearestStop
                                        ? "Modo Uber: conectado automaticamente ao ponto mais próximo."
                                        : "Modo manual: selecione o ponto da lista."}
                                className="min-h-[64px]"
                            >
                                {isLoadingStops ? (
                                    <div className="h-16 w-full bg-white/[0.03] rounded-2xl animate-pulse flex items-center px-4 gap-3 border border-white/10">
                                        <div className="w-5 h-5 bg-white/10 rounded-full" />
                                        <div className="h-4 w-1/2 bg-white/10 rounded-md" />
                                    </div>
                                ) : nearestStops.length > 0 ? (
                                    <>
                                        <Select
                                            id="stop"
                                            value={selectedStop}
                                            onChange={(e) => {
                                                const nextStopId = e.target.value;
                                                setSelectedStop(nextStopId);
                                                setAutoNearestStop(false);
                                            }}
                                            icon={<MapPin size={18} className="text-brand" />}
                                            className="h-16 !text-base font-bold !bg-white/[0.03] !border-white/10"
                                        >
                                            {nearestStops.map((stop) => (
                                                <option key={stop.id} value={stop.id} className="bg-zinc-900">
                                                    {stop.name} ({stop.distance_m}m)
                                                </option>
                                            ))}
                                        </Select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAutoNearestStop(true);
                                                refreshGpsPosition();
                                            }}
                                            className="mt-3 w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-[10px] font-black uppercase tracking-widest text-white/80 transition-colors inline-flex items-center justify-center gap-2"
                                        >
                                            <LocateFixed size={14} className="text-brand" />
                                            Atualizar ponto pelo GPS
                                        </button>
                                    </>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01] text-center space-y-5">
                                        <div className="p-4 bg-white/5 w-fit mx-auto rounded-2xl">
                                            <AlertCircle size={32} className="text-white/20" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-white/60 font-bold uppercase tracking-tight">
                                                {location ? "Nenhum ponto por perto" : "Aguardando GPS..."}
                                            </p>
                                            <p className="text-[10px] text-white/30 font-medium leading-relaxed">
                                                Não encontramos paradas no raio de 300m da sua posição atual.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-2">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowSearch(true)}
                                                className="!h-14 !text-[11px] font-black uppercase tracking-widest bg-white/5 border-white/10"
                                                icon={<Search size={18} />}
                                            >
                                                Buscar ponto pelo nome
                                            </Button>

                                            {location && !isLoadingStops && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        trackTelemetry('stop_suggestion_open');
                                                        setShowSuggestionModal(true);
                                                    }}
                                                    className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-brand text-black text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    <PlusCircle size={18} />
                                                    Sugerir ponto aqui
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Field>
                        </div>

                        {/* BUSCA MANUAL MODAL / OVERLAY */}
                        {showSearch && (
                            <div className="fixed inset-0 z-[100] bg-black/95 animate-in fade-in flex flex-col p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-industrial italic text-2xl text-white uppercase tracking-tight">Buscar Parada</h3>
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Nome da rua, ponto ou bairro..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold placeholder:text-white/20 outline-none focus:border-brand/50 transition-all"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(stop => (
                                            <button
                                                key={stop.id}
                                                onClick={() => {
                                                    setSelectedStop(stop.id);
                                                    setNearestStops(prev => {
                                                        const exists = prev.find(s => s.id === stop.id);
                                                        if (exists) return prev;
                                                        return [{ ...stop, distance_m: 0 }, ...prev];
                                                    });
                                                    setAutoNearestStop(false);
                                                    setShowSearch(false);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }}
                                                className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all"
                                            >
                                                <div className="text-left">
                                                    <p className="text-lg font-bold text-white leading-tight uppercase italic">{stop.name}</p>
                                                    <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1 opacity-70">
                                                        {stop.neighborhood || 'Bairro ñ informado'}
                                                    </p>
                                                </div>
                                                <div className="px-4 py-2 bg-brand text-black text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                                                    Selecionar
                                                </div>
                                            </button>
                                        ))
                                    ) : searchQuery.length >= 2 && !isSearching ? (
                                        <div className="py-12 text-center space-y-3 opacity-30">
                                            <Search size={40} className="mx-auto" />
                                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum ponto encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center space-y-4">
                                            <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em]">Exemplos: &quot;Vila Rica&quot;, &quot;Rua 33&quot;, &quot;Aterrado&quot;</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ETAPA 3: Ação Final */}
                        <div className={`transition-all duration-700 delay-200 ${selectedStop && !hasArrived ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none translate-y-4"}`}>
                            <div className="flex items-center gap-2 mb-4 ml-1">
                                <Badge variant="brand" className="h-5 w-5 !p-0 flex items-center justify-center rounded-full text-[10px]">3</Badge>
                                <h2 className="text-[11px] font-black uppercase tracking-widest text-white/70">Confirmar Presença</h2>
                            </div>

                            <PrimaryCTA
                                onClick={handleArrived}
                                loading={isSubmitting}
                                disabled={!deviceId || !selectedStop}
                                className="!h-24 shadow-xl border-0 !rounded-[2rem]"
                                aria-label="Confirmar que estou neste ponto para iniciar relato"
                            >
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60 mb-1 leading-none">Passo Final</span>
                                    <span className="font-industrial text-2xl leading-none italic uppercase">estou no ponto</span>
                                </div>
                            </PrimaryCTA>
                            <Button
                                variant="secondary"
                                onClick={() => setIsBusPhotoModalOpen(true)}
                                className="w-full mt-3 !h-12 !text-[10px] font-black uppercase tracking-widest"
                                icon={<Camera size={16} />}
                            >
                                Foto do ônibus (opcional)
                            </Button>
                            {recentPhotoDraft && (
                                <Card variant="surface2" className="mt-3 border-emerald-500/20 bg-emerald-500/10">
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
                    </div>

                    {/* Feedback da Chegada / Reward */}
                    {hasArrived && rewardStopInfo ? (
                        <div className="space-y-4 animate-scale-in">
                            <div className="p-6 rounded-[2rem] text-center border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 relative overflow-hidden">
                                <div className="flex flex-col items-center gap-2 relative z-10">
                                    <div className="bg-emerald-500/20 p-2 rounded-full mb-1">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <p className="font-industrial text-xl italic uppercase tracking-tight leading-none">Registrado</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 max-w-[240px] mx-auto leading-relaxed">
                                        Isso fortalece a auditoria no bairro <span className="text-white">{rewardStopInfo.neighborhood || 'Local'}</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => router.push(`/ponto/${selectedStop}`)}
                                    className="w-full !h-14 !bg-white !text-black !rounded-2xl !text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-between px-6 group"
                                >
                                    Ver meu ponto agora
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        const shareData = {
                                            title: 'VR no Ponto',
                                            text: `Acabei de chegar no ponto ${rewardStopInfo.name} e registrei minha presença!`,
                                            url: window.location.origin + '/boletim'
                                        };
                                        try {
                                            if (navigator.share) await navigator.share(shareData);
                                            else window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`);
                                        } catch { /* ignore */ }
                                    }}
                                    className="w-full !h-12 !text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
                                    icon={<Share size={16} />}
                                >
                                    Compartilhar boletim
                                </Button>
                            </div>
                        </div>
                    ) : message && (
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
                            <SectionCard title="Cenário Técnico" subtitle="Linhas mais vistas nesta parada (30D)">
                                <div className="min-h-[100px]">
                                    {isLoadingTopLines ? (
                                        <div className="space-y-3">
                                            <div className="h-[120px] w-full bg-white/[0.02] border border-white/5 rounded-xl animate-pulse p-4">
                                                <div className="flex gap-2 mb-4">
                                                    <div className="h-8 w-16 bg-white/5 rounded-lg" />
                                                    <div className="h-8 w-32 bg-white/5 rounded-lg" />
                                                </div>
                                                <div className="h-10 w-full bg-white/5 rounded-lg" />
                                            </div>
                                            <div className="h-[120px] w-full bg-white/[0.01] border border-white/5 rounded-xl animate-pulse p-4 hidden sm:block">
                                                <div className="flex gap-2 mb-4">
                                                    <div className="h-8 w-12 bg-white/5 rounded-lg opacity-40" />
                                                    <div className="h-8 w-24 bg-white/5 rounded-lg opacity-40" />
                                                </div>
                                                <div className="h-10 w-full bg-white/5 rounded-lg opacity-40" />
                                            </div>
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
                                                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-brand/20 hover:text-brand text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-white/5 hover:border-brand/30"
                                                        >
                                                            <Bus size={14} />
                                                            Registrar agora
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center space-y-2">
                                            <AlertCircle size={24} className="mx-auto text-white/20 mb-2" />
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-tight">Sem dados ainda neste ponto.</p>
                                            <p className="text-[10px] text-brand font-black uppercase tracking-widest">Seja o primeiro a registrar! 👑</p>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* 1-Tap Section (after arrival) */}
                    {hasArrived && selectedStop && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <Divider label="QUER REGISTRAR AGORA?" />

                            <OneTapCard
                                stopId={selectedStop}
                                stopName={currentStop?.name || 'Ponto Selecionado'}
                                onRecorded={() => {
                                    setRecentPhotoDraft(getRecentBusPhotoDraft());
                                }}
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
                </div>

                {/* Next Steps Orientation */}
                <NextStepBlock>
                    <Link href="/bairros" className="block">
                        <Button variant="secondary" className="w-full h-14 !text-[11px] font-black uppercase tracking-widest" icon={<MapPin size={16} />}>
                            Ver Ranking
                        </Button>
                    </Link>
                    <Link href="/como-usar" className="block">
                        <Button variant="ghost" className="w-full h-14 !text-[11px] font-black uppercase tracking-widest bg-white/5" icon={<HelpCircle size={16} />}>
                            Como Funciona
                        </Button>
                    </Link>
                </NextStepBlock>
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

            <BusPhotoModal
                isOpen={isBusPhotoModalOpen}
                onClose={() => setIsBusPhotoModalOpen(false)}
                deviceId={deviceId}
                stopId={selectedStop || null}
                lineId={topLines[0]?.line_id || null}
                location={location}
                isOnline={isOnline}
                onSaved={(draft) => setRecentPhotoDraft(draft)}
            />
        </AppShell>
    );
}
