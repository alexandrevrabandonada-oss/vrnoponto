'use client';

import * as React from 'react';
import {
    MapPin,
    Bell,
    Type,
    Trash2,
    ChevronRight,
    Info,
    Check,
    AlertTriangle,
    Navigation,
    LocateFixed
} from 'lucide-react';
import {
    AppShell,
    PageHeader,
    SectionCard,
    Button,
    PublicTopBar,
    Divider,
    InlineAlert
} from '@/components/ui';
import { useUiPrefs, StopMode, NotifMode } from '@/lib/useUiPrefs';
import { useRouter } from 'next/navigation';

export default function ConfigPage() {
    const {
        uiMode,
        stopMode,
        notifMode,
        setUiMode,
        setStopMode,
        setNotifMode
    } = useUiPrefs();
    const router = useRouter();

    const [isClearing, setIsClearing] = React.useState(false);
    const [showConfirmClear, setShowConfirmClear] = React.useState(false);

    const handleClearData = async () => {
        setIsClearing(true);
        try {
            // 1. Clear LocalStorage
            localStorage.clear();

            // 2. Clear Cookies
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            }

            // 3. Clear IndexedDB
            const dbs = ['VRNP_OfflineQueue', 'VRNP_OfflineProofQueue'];
            for (const dbName of dbs) {
                indexedDB.deleteDatabase(dbName);
            }

            // 4. Force reload to home or splash
            window.location.href = '/';
        } catch (err) {
            console.error('Falha ao limpar dados:', err);
            setIsClearing(false);
        }
    };

    return (
        <AppShell hideHeader>
            <PublicTopBar title="Configurações" />

            <div className="max-w-md mx-auto py-6 px-4 space-y-8">
                <PageHeader
                    title="Configurações"
                    subtitle="Personalize sua experiência e gerencie seus dados locais."
                />

                {/* Localização / Auto GPS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <MapPin size={16} className="text-brand" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Localização</h3>
                    </div>

                    <SectionCard className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-xl ${stopMode === 'auto' ? 'bg-brand/10 text-brand' : 'bg-white/5 text-white/30'}`}>
                                <LocateFixed size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white uppercase italic">Sugestão de Ponto</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-1 leading-relaxed">
                                    No modo automático, sugerimos o ponto mais próximo via GPS.
                                </p>
                            </div>
                        </div>

                        <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/5">
                            <button
                                onClick={() => setStopMode('auto')}
                                className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${stopMode === 'auto' ? 'bg-brand text-black shadow-lg translate-y-[-1px]' : 'text-white/40 hover:text-white'}`}
                            >
                                Automático
                            </button>
                            <button
                                onClick={() => setStopMode('manual')}
                                className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${stopMode === 'manual' ? 'bg-brand text-black shadow-lg translate-y-[-1px]' : 'text-white/40 hover:text-white'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </SectionCard>
                </div>

                {/* Notificações */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <Bell size={16} className="text-brand" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Notificações</h3>
                    </div>

                    <SectionCard className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-xl ${notifMode === 'digest' ? 'bg-brand/10 text-brand' : 'bg-brand/10 text-brand'}`}>
                                <Bell size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white uppercase italic">Freqüência de Avisos</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase mt-1 leading-relaxed">
                                    Controle como recebe os alertas da sua região.
                                </p>
                            </div>
                        </div>

                        {notifMode === 'immediate' && (
                            <InlineAlert variant="warning" title="Aviso Anti-Spam">
                                <p className="text-[10px] leading-relaxed">
                                    O modo imediato pode gerar muitas mensagens em horários de pico. Ative com moderação.
                                </p>
                            </InlineAlert>
                        )}

                        <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/5">
                            <button
                                onClick={() => setNotifMode('digest')}
                                className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${notifMode === 'digest' ? 'bg-brand text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Resumo (Padrão)
                            </button>
                            <button
                                onClick={() => setNotifMode('immediate')}
                                className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${notifMode === 'immediate' ? 'bg-brand text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Imediato
                            </button>
                        </div>
                    </SectionCard>
                </div>

                {/* Acessibilidade */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <Type size={16} className="text-brand" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Acessibilidade</h3>
                    </div>

                    <SectionCard className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${uiMode === 'legivel' ? 'bg-brand/10 text-brand' : 'bg-white/5 text-white/30'}`}>
                                    <Type size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white uppercase italic">Texto Maior</p>
                                    <p className="text-[10px] font-bold text-white/40 uppercase mt-1 leading-relaxed">
                                        Aumenta o tamanho das fontes e melhora o contraste.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setUiMode(uiMode === 'legivel' ? 'default' : 'legivel')}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-ring ${uiMode === 'legivel' ? 'bg-brand' : 'bg-white/10'}`}
                                role="switch"
                                aria-checked={uiMode === 'legivel'}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${uiMode === 'legivel' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="pt-4 border-t border-white/5 space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Preview imediato</p>
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                <h4 className="text-base font-industrial tracking-widest text-white italic">Confirmar Presença</h4>
                                <p className="text-xs text-white/60 leading-relaxed font-medium">
                                    Este é um exemplo de como o texto será exibido em todo o aplicativo.
                                </p>
                                <Button variant="primary" className="w-full !h-12 !text-[10px]">
                                    Botão de Exemplo
                                </Button>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Privacidade */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-1 px-2">
                        <Trash2 size={16} className="text-danger" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-danger opacity-60">Privacidade</h3>
                    </div>

                    {!showConfirmClear ? (
                        <Button
                            variant="ghost"
                            onClick={() => setShowConfirmClear(true)}
                            className="w-full !h-14 border border-danger/20 hover:bg-danger/5 !text-danger/80 !rounded-2xl !text-[11px] font-black uppercase tracking-widest flex items-center justify-between px-6"
                        >
                            <span>Limpar meus dados do aparelho</span>
                            <Trash2 size={18} />
                        </Button>
                    ) : (
                        <Card className="border-danger/30 bg-danger/5 p-6 space-y-6 animate-scale-in">
                            <div className="flex items-center gap-3 text-danger">
                                <AlertTriangle size={24} />
                                <p className="text-sm font-bold uppercase italic tracking-tight">Tem certeza?</p>
                            </div>
                            <p className="text-[10px] font-bold text-danger/70 uppercase leading-relaxed">
                                Isso removerá sua identidade única, preferências e registros pendentes de envio. Esta ação não pode ser desfeita.
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    onClick={() => setShowConfirmClear(false)}
                                    className="!bg-white/10 !text-white !h-12 !text-[10px]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleClearData}
                                    loading={isClearing}
                                    className="!bg-danger !text-white !h-12 !text-[10px]"
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="pt-8 text-center">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                        VR no Ponto • MVP 0.1.0
                    </p>
                </div>
            </div>
        </AppShell>
    );
}

// Minimal Card component since SectionCard might be slightly different in implementation than what I need
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 rounded-3xl border border-white/5 bg-white/[0.02] ${className}`}>
        {children}
    </div>
);
