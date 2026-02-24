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
    const [syncFeedback, setSyncFeedback] = React.useState<string | null>(null);

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
                stopName: 'Ponto (sincronizando...)',
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
        } catch (err) {
            console.error('Failed to load audit history:', err);
        } finally {
            setIsLoading(false);
        }
    }, [deviceId, isOnline]);

    React.useEffect(() => {
        loadData();
    }, [loadData, pendingCount]);

    const handleSync = async () => {
        if (!isOnline) {
            setSyncFeedback('Sem conexão no momento.');
            setTimeout(() => setSyncFeedback(null), 3000);
            return;
        }
        await syncNow();
        setSyncFeedback('Dados enviados com sucesso!');
        setTimeout(() => setSyncFeedback(null), 3000);
        loadData();
    };

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

            <div className="max-w-md mx-auto py-6 px-4 space-y-10 animate-in fade-in duration-700">
                <PageHeader
                    title="Minha Auditoria"
                    subtitle="Seu impacto na qualidade do transporte."
                />

                {/* Large Sync Status Card */}
                <div className="space-y-4">
                    <Card className={`relative overflow-hidden border-brand/20 ${pendingCount > 0 ? 'bg-brand/5 border-brand/30' : 'bg-white/[0.02] border-white/5'}`}>
                        <div className="absolute inset-0 bg-brand/5 blur-3xl rounded-full scale-150" />

                        <div className="relative flex flex-col items-center text-center p-6 space-y-4">
                            <div className="text-6xl font-industrial italic text-white tracking-tighter">
                                {pendingCount}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                                    Pendências para sincronizar
                                </p>
                                <p className="text-[12px] text-white/40 font-medium">
                                    {isOnline ? 'Pronto para enviar ao sistema.' : 'Aguardando conexão com a internet.'}
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleSync}
                                loading={isSyncing}
                                disabled={pendingCount === 0 || !isOnline}
                                className="w-full !h-16 !text-xs font-black uppercase tracking-widest !rounded-2xl shadow-xl shadow-brand/10"
                                icon={isSyncing ? <RefreshCw className="animate-spin" /> : <CheckCircle2 size={18} />}
                            >
                                {syncFeedback || (isSyncing ? 'Sincronizando...' : 'Sincronizar Agora')}
                            </Button>

                            {!isOnline && (
                                <div className="flex items-center gap-2 text-danger animate-pulse">
                                    <WifiOff size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Você está offline</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-2">
                        Últimos 20 registros neste device
                    </h3>

                    {isLoading && events.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
                            <RefreshCw size={32} className="animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest italic">Acessando histórico...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <EmptyState
                            icon={MapPin}
                            title="Sem registros ainda"
                            description="Seus relatos aparecerão aqui após você visitar um ponto."
                            actionLabel="Estou no ponto"
                            onAction={() => window.location.href = '/no-ponto'}
                        />
                    ) : (
                        <div className="space-y-3">
                            {events.map((ev) => (
                                <Card key={ev.id} className="group hover:bg-white/[0.04] transition-all border-white/5 active:scale-[0.98]">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-sm font-bold text-white uppercase italic tracking-tight truncate">
                                                    {formatEventAction(ev.eventType, ev.lineCode)}
                                                </p>
                                                <span className="text-[10px] font-medium text-white/20 tabular-nums">
                                                    {formatTime(ev.occurredAt)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-40">
                                                <MapPin size={10} className="text-white" />
                                                <p className="text-[10px] font-medium text-white truncate">
                                                    {ev.stopName}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 mt-3">
                                                <Badge
                                                    variant={ev.status === 'SENT' ? 'brand' : ev.status === 'FAILED' ? 'danger' : 'muted'}
                                                    className="!text-[8px] !px-2 !py-0.5 uppercase font-black tracking-widest"
                                                >
                                                    {ev.status === 'SENT' ? 'Enviado' : ev.status === 'FAILED' ? 'Erro' : 'Pendente'}
                                                </Badge>
                                                {ev.status === 'SENT' && (
                                                    <span className="text-[9px] font-black text-brand/40 uppercase tracking-tighter">
                                                        Confiança {ev.trustLevel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Privacy & Data Management Section */}
                <div className="pt-6 border-t border-white/5 space-y-6">
                    <div className="space-y-1 px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Gestão de Dados</h4>
                        <p className="text-[11px] text-white/20 leading-relaxed font-medium">
                            Não coletamos dados pessoais. Suas preferências e histórico local são armazenados apenas neste aparelho.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/config#privacidade'}
                            className="w-full !h-12 border border-white/5 hover:bg-white/5 !text-white/50 font-black uppercase tracking-widest text-[9px]"
                        >
                            Privacidade
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/config'}
                            className="w-full !h-12 border border-white/5 hover:bg-white/5 !text-white/50 font-black uppercase tracking-widest text-[9px]"
                        >
                            Limpar Dados
                        </Button>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={() => window.location.href = '/no-ponto'}
                        className="w-full !h-20 !bg-brand !text-black font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 !rounded-[2rem] shadow-2xl shadow-brand/20 active:scale-95 transition-all italic"
                    >
                        ESTOU NO PONTO AGORA
                        <ArrowRight size={20} />
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
