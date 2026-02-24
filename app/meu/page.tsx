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
    Trash2,
    Info,
    CheckCircle
} from 'lucide-react';
import {
    AppShell,
    PageHeader,
    Card,
    Button,
    EmptyState,
    Divider
} from '@/components/ui';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getPendingEvents, clearEventQueue } from '@/lib/offlineQueue';

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
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

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
        setSyncFeedback('Dados enviados!');
        setTimeout(() => setSyncFeedback(null), 3000);
        loadData();
    };

    const handleClearData = async () => {
        // Clear Local Storage items
        localStorage.removeItem('vrp_device_id');
        localStorage.removeItem('pwa_optin_dismissed');
        localStorage.removeItem('ui_prefs');
        localStorage.removeItem('pwa_action_count');

        // Clear IndexedDB Queue
        await clearEventQueue();

        // Reload app
        window.location.href = '/';
    };

    const formatEventAction = (type: string, line: string) => {
        const lineText = line && line !== '...' ? line : 'Linha';
        switch (type) {
            case 'boarding': return `Entrei no ${lineText}`;
            case 'passed_by': return `Vi o ${lineText} passar`;
            case 'alighted': return `Desci do ${lineText}`;
            case 'arrived': return `Cheguei no ponto`;
            default: return `Registro de presença`;
        }
    };

    const formatTime = (ts: string | number) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;

        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <AppShell title="Hub de Auditoria">

            <div className="max-w-md mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-700 pb-20">
                <PageHeader
                    title="Seu Impacto"
                    subtitle="Central de sincronização offline e dados locais."
                />

                {/* Status Card: Contador Grande */}
                <Card variant="surface" className={`relative overflow-hidden border-2 transition-all ${pendingCount > 0 ? 'border-brand bg-brand/5 shadow-[0_0_30px_rgba(var(--brand-rgb),0.1)]' : 'border-white/5 bg-white/[0.02]'}`}>
                    <div className="relative flex flex-col items-center text-center p-8 space-y-6">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-1">Pendências</span>
                            <div className="text-8xl font-industrial italic text-white tracking-tighter leading-none">
                                {pendingCount}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-black text-white uppercase tracking-tight">
                                {pendingCount > 0
                                    ? (isOnline ? "Pronto para enviar" : "Aguardando internet")
                                    : "Tudo sincronizado"}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {isOnline ? 'Sincronização em tempo real ativa' : 'Os dados estão salvos no seu aparelho'}
                            </p>
                        </div>

                        <Button
                            variant={pendingCount > 0 ? "primary" : "secondary"}
                            onClick={handleSync}
                            loading={isSyncing}
                            disabled={pendingCount === 0 || !isOnline}
                            className="w-full !h-20 !text-sm font-black uppercase tracking-[0.2em] !rounded-2xl shadow-2xl"
                            icon={isSyncing ? <RefreshCw className="animate-spin" /> : <CheckCircle size={24} />}
                        >
                            {syncFeedback || (isSyncing ? 'Enviando...' : 'Sincronizar Agora')}
                        </Button>

                        {!isOnline && pendingCount > 0 && (
                            <div className="flex items-center gap-2 text-brand animate-pulse pt-2">
                                <WifiOff size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Conecte-se para enviar</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* History Section: Últimas 20 */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                            Histórico Recente
                        </h3>
                        {events.length > 0 && (
                            <span className="text-[9px] font-bold text-white/20 uppercase">Últimos 20 registros</span>
                        )}
                    </div>

                    {isLoading && events.length === 0 ? (
                        <Card className="py-12 flex flex-col items-center justify-center gap-3 border-dashed opacity-50">
                            <RefreshCw size={24} className="animate-spin text-brand" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                        </Card>
                    ) : events.length === 0 ? (
                        <EmptyState
                            icon={History}
                            title="Sem registros locais"
                            description="Seus relatos recentes aparecerão aqui após o primeiro uso."
                            actionLabel="Estou no ponto"
                            onAction={() => window.location.href = '/no-ponto'}
                            secondaryActionLabel="Como usar"
                            onSecondaryAction={() => window.location.href = '/como-usar'}
                        />
                    ) : (
                        <div className="space-y-2">
                            {events.map((ev) => (
                                <div key={ev.id} className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all">
                                    <div className={`p-2 rounded-xl ${ev.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand/10 text-brand'}`}>
                                        {ev.status === 'SENT' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-black text-white uppercase italic truncate">
                                                {formatEventAction(ev.eventType, ev.lineCode)}
                                            </p>
                                            <span className="text-[10px] font-bold text-white/20 tabular-nums">
                                                {formatTime(ev.occurredAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <MapPin size={10} className="text-white/20" />
                                            <p className="text-[9px] font-bold text-white/30 uppercase truncate">
                                                {ev.stopName}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Data Management: Limpar Dados */}
                <div className="pt-8 space-y-6">
                    <Divider label="GESTÃO DE PRIVACIDADE" />

                    <Card variant="surface2" className="border-white/5 bg-white/[0.02]">
                        <div className="p-6 space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl text-white/40">
                                    <Info size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Sobre seus dados</h4>
                                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                                        O VR no Ponto é focado em privacidade. Não usamos e-mail ou senha.
                                        Toda a inteligência e histórico ficam salvos localmente no seu navegador.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-white/5">
                                <div className="space-y-3">
                                    <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">O que a limpeza apaga:</h5>
                                    <ul className="grid grid-cols-1 gap-2">
                                        {[
                                            "Identificador anônimo (Device ID)",
                                            "Fila de registros pendentes",
                                            "Preferências de UI (Tema, Filtros)",
                                            "Cache local de paradas"
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase italic">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand/30" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full !h-14 border border-danger/10 hover:bg-danger/5 !text-danger/60 font-black uppercase tracking-widest text-xs"
                                        icon={<Trash2 size={16} />}
                                    >
                                        Limpar meus dados deste aparelho
                                    </Button>
                                ) : (
                                    <div className="space-y-3 p-4 rounded-2xl bg-danger/5 border border-danger/20 animate-in zoom-in-95">
                                        <p className="text-[10px] font-black text-danger uppercase text-center leading-tight">
                                            Tem certeza? Isso resetará o app completamente.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 !h-12 !text-[10px] font-black uppercase"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                onClick={handleClearData}
                                                className="flex-1 !h-12 !bg-danger !text-white !text-[10px] font-black uppercase"
                                            >
                                                Sim, Apagar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
