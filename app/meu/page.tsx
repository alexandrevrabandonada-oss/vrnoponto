'use client';

import * as React from 'react';
import {
    Clock,
    CheckCircle2,
    WifiOff,
    History,
    MapPin,
    Bus,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    ArrowRight,
    BarChart2
} from 'lucide-react';
import {
    AppShell,
    PageHeader,
    Card,
    Button,
    PublicTopBar,
    EmptyState,
    Badge
} from '@/components/ui';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getPendingEvents } from '@/lib/offlineQueue';

interface AuditEvent {
    id: string;
    stopId: string;
    stopName: string;
    lineId: string;
    lineCode: string;
    lineName: string;
    eventType: string;
    occurredAt: string | number;
    trustLevel: string;
    status: 'SENT' | 'PENDING' | 'FAILED';
}

export default function MeuAuditoriaPage() {
    const deviceId = useDeviceId();
    const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

    const [events, setEvents] = React.useState<AuditEvent[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [lastSync, setLastSync] = React.useState<Date | null>(null);

    const loadData = React.useCallback(async () => {
        if (!deviceId) return;

        setIsLoading(true);
        try {
            // 1. Fetch Remote Events
            let remoteEvents: AuditEvent[] = [];
            if (isOnline) {
                const res = await fetch(`/api/events/mine?deviceId=${deviceId}`);
                if (res.ok) {
                    const data = await res.json();
                    remoteEvents = data.events || [];
                }
            }

            // 2. Fetch Local Pending Events
            const pendingParams = await getPendingEvents(20);
            const localEvents: AuditEvent[] = pendingParams.map(p => ({
                id: p.id,
                stopId: p.payload.stopId as string,
                stopName: 'Ponto (sincronizando...)', // Local pending events don't have names in payload
                lineId: p.payload.lineId as string,
                lineCode: '...',
                lineName: '...',
                eventType: p.payload.eventType as string,
                occurredAt: p.created_at,
                trustLevel: 'L1',
                status: p.status === 'FAILED' ? 'FAILED' : 'PENDING'
            }));

            // 3. Merge and Sort
            const allEvents = [...localEvents, ...remoteEvents].sort((a, b) => {
                const dateA = new Date(a.occurredAt).getTime();
                const dateB = new Date(b.occurredAt).getTime();
                return dateB - dateA;
            });

            setEvents(allEvents.slice(0, 20));
            setLastSync(new Date());
        } catch (err) {
            console.error('Failed to load audit history:', err);
        } finally {
            setIsLoading(false);
        }
    }, [deviceId, isOnline]);

    React.useEffect(() => {
        loadData();
    }, [loadData, pendingCount]);

    const formatEventAction = (type: string, line: string) => {
        switch (type) {
            case 'boarding': return `Entrei no ${line}`;
            case 'passed_by': return `Vi o ${line} passar`;
            case 'alighted': return `Desci do ${line}`;
            case 'arrived': return `Cheguei no ponto`;
            default: return `Registro de presença`;
        }
    };

    const formatTime = (ts: string | number) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `Há ${diffMins} min`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Há ${diffHours}h`;

        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Minha Auditoria" />

            <div className="max-w-md mx-auto py-6 px-4 space-y-8">
                <PageHeader
                    title="Minha Auditoria"
                    subtitle="Seus últimos registros e status de sincronização."
                />

                {/* Sync Status Card */}
                <Card className={`relative overflow-hidden border-white/5 ${pendingCount > 0 ? 'bg-brand/5 border-brand/20' : 'bg-white/[0.02]'}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${pendingCount > 0 ? 'bg-brand/20 text-brand' : 'bg-white/5 text-white/40'}`}>
                                {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : <History size={20} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronização</p>
                                <p className="text-sm font-bold text-white uppercase italic">
                                    {pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Tudo atualizado'}
                                </p>
                            </div>
                        </div>

                        {isOnline && pendingCount > 0 && (
                            <Button
                                variant="primary"
                                onClick={syncNow}
                                loading={isSyncing}
                                className="!h-9 !px-4 !text-[10px] !py-0"
                            >
                                Sincronizar
                            </Button>
                        )}

                        {!isOnline && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-danger/10 border border-danger/20 rounded-full">
                                <WifiOff size={10} className="text-danger" />
                                <span className="text-[8px] font-black text-danger uppercase">Offline</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* History List */}
                <div className="space-y-4">
                    {isLoading && events.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/20">
                            <RefreshCw size={32} className="animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <EmptyState
                            icon={MapPin}
                            title="Sem registros ainda"
                            description="Você ainda não registrou sua presença nos pontos de VR."
                            actionLabel="Estou no ponto"
                            onAction={() => window.location.href = '/no-ponto'}
                        />
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 flex items-center justify-between">
                                <span>Últimas 20 atividades</span>
                                {lastSync && <span className="font-normal opacity-50">Atulizado às {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            </h3>

                            {events.map((ev) => (
                                <Card key={ev.id} className="group hover:bg-white/[0.04] transition-colors border-white/5">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            {ev.status === 'SENT' ? (
                                                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            ) : ev.status === 'FAILED' ? (
                                                <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                                                    <AlertCircle size={16} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 animate-pulse">
                                                    <Clock size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-white uppercase italic tracking-tight truncate">
                                                    {formatEventAction(ev.eventType, ev.lineCode)}
                                                </p>
                                                <span className="text-[10px] font-medium text-white/30 whitespace-nowrap">
                                                    {formatTime(ev.occurredAt)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <MapPin size={10} className="text-white/20" />
                                                <p className="text-[10px] font-medium text-white/50 truncate">
                                                    {ev.stopName}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="muted" className={`!text-[8px] !px-2 !py-0.5`}>
                                                    {ev.status === 'SENT' ? 'Enviado' : ev.status === 'FAILED' ? 'Erro' : 'Pendente'}
                                                </Badge>
                                                {ev.status === 'SENT' && (
                                                    <Badge variant="brand" className="!text-[8px] !px-2 !py-0.5 border-brand/20">
                                                        Confiança {ev.trustLevel}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Final CTAs */}
                <div className="space-y-4 pt-4">
                    <Button
                        onClick={() => window.location.href = '/no-ponto'}
                        className="w-full !h-14 !bg-brand !text-black font-black uppercase tracking-widest text-xs flex items-center justify-between px-6 group"
                    >
                        <span>Estou no Ponto Agora</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = '/boletim'}
                        className="w-full !h-14 border border-white/5 hover:bg-white/5 !text-white/70 font-black uppercase tracking-widest text-[10px] flex items-center justify-between px-6"
                    >
                        <span>Ver Boletim da Cidade</span>
                        <BarChart2 size={16} />
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
