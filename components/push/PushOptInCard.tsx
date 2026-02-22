'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { Bell, BellOff, Loader2, Save, ShieldAlert } from 'lucide-react';
import { getDeviceId } from '@/lib/device';
import { registerServiceWorker, requestNotificationPermission, subscribeToPush, saveSubscriptionOnServer } from '@/lib/push/register';

export function PushOptInCard() {
    const [permStatus, setPermStatus] = useState<NotificationPermission | 'loading'>('loading');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form states
    const [mode, setMode] = useState<'DIGEST' | 'IMMEDIATE'>('DIGEST');
    const [severityMin, setSeverityMin] = useState<'WARN' | 'CRIT'>('CRIT');
    const [neighborhoodsInput, setNeighborhoodsInput] = useState('');
    const [linesInput, setLinesInput] = useState('');

    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            setPermStatus('denied');
            return;
        }

        const checkSubscription = async () => {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) {
                        setIsSubscribed(true);
                        await loadPreferences();
                    }
                }
            } catch (e) {
                console.error('Error checking push subscription', e);
            } finally {
                setPermStatus(Notification.permission);
            }
        };

        setPermStatus(Notification.permission);
        if (Notification.permission === 'granted') {
            checkSubscription();
        } else {
            setPermStatus(Notification.permission);
        }
    }, [permStatus]);

    const loadPreferences = async () => {
        const deviceId = getDeviceId();
        try {
            const res = await fetch(`/api/push/preferences?deviceId=${deviceId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.preferences) {
                    setMode(data.preferences.mode || 'DIGEST');
                    setSeverityMin(data.preferences.severity_min || 'CRIT');
                    setNeighborhoodsInput((data.preferences.neighborhoods_norm || []).join(', '));
                    setLinesInput((data.preferences.lines || []).join(', '));
                }
            }
        } catch (error) {
            console.error('Error loading preferences', error);
        }
    };

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            await requestNotificationPermission();
            setPermStatus(Notification.permission);

            const res = await fetch('/api/push/vapid-public-key');
            if (!res.ok) throw new Error('Could not fetch VAPID key');
            const { publicKey } = await res.json();

            await registerServiceWorker();
            const sub = await subscribeToPush(publicKey);

            const deviceId = getDeviceId();
            if (!deviceId) throw new Error('Não foi possível gerar identificador de dispositivo.');

            const prefsPayload = {
                mode,
                severity_min: severityMin,
                neighborhoods_norm: neighborhoodsInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
                lines: linesInput.split(',').map(s => s.trim()).filter(Boolean)
            };

            await saveSubscriptionOnServer(deviceId, sub, prefsPayload);
            setIsSubscribed(true);
            alert('Notificações ativadas com sucesso!');
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : String(err);
            alert('Falha ao ativar notificações: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                const deviceId = getDeviceId();
                if (deviceId) {
                    await fetch('/api/push/unsubscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceId, endpoint: sub.endpoint })
                    });
                }
                await sub.unsubscribe();
            }
            setIsSubscribed(false);
            alert('Notificações desativadas localmente.');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrefs = async () => {
        if (!isSubscribed) {
            return handleSubscribe();
        }
        setLoading(true);
        try {
            const deviceId = getDeviceId();
            if (!deviceId) throw new Error('Identificador não encontrado');

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (!sub) throw new Error('Sem subscription local');

            const prefsPayload = {
                mode,
                severity_min: severityMin,
                neighborhoods_norm: neighborhoodsInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
                lines: linesInput.split(',').map(s => s.trim()).filter(Boolean)
            };

            await saveSubscriptionOnServer(deviceId, sub, prefsPayload);
            alert('Preferências atualizadas!');
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar preferências.');
        } finally {
            setLoading(false);
        }
    };

    if (permStatus === 'loading') {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    if (permStatus === 'denied') {
        return (
            <Card variant="surface" className="p-6 border-red-200 bg-red-50 text-red-900 shadow-sm border">
                <div className="flex items-center gap-3">
                    <BellOff size={24} className="text-red-500" />
                    <div>
                        <h3 className="font-bold text-lg">Notificações Bloqueadas</h3>
                        <p className="text-sm opacity-80">Você negou permissão para notificações neste navegador. Para receber alertas, altere as configurações de privacidade do seu sistema/navegador para este site.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="surface" className="p-6 border shadow-sm border-gray-200">
            <div className="flex items-start justify-between border-b border-gray-100 pb-5 mb-5">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${isSubscribed ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'}`}>
                        {isSubscribed ? <Bell size={24} /> : <BellOff size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg font-industrial tracking-wide text-gray-900">Push Notifications</h3>
                        <p className="text-xs font-bold text-gray-500 bg-white">
                            {isSubscribed ? 'ATIVADAS' : 'NÃO ATIVADAS'}
                        </p>
                    </div>
                </div>
                {isSubscribed && (
                    <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleUnsubscribe} loading={loading}>
                        Desativar
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Modo de Avaliação</label>
                        <div className="space-y-2">
                            <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition ${mode === 'DIGEST' ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input type="radio" value="DIGEST" checked={mode === 'DIGEST'} onChange={() => setMode('DIGEST')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-sm">Resumo Diário (DIGEST)</div>
                                    <div className="text-xs text-gray-500">Condensa todos os alertas graves numa única mensagem matinal. (Recomendado para evitar spam).</div>
                                </div>
                            </label>
                            <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition ${mode === 'IMMEDIATE' ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input type="radio" value="IMMEDIATE" checked={mode === 'IMMEDIATE'} onChange={() => setMode('IMMEDIATE')} className="mt-1" />
                                <div>
                                    <div className="font-bold text-sm">Tempo Real (IMMEDIATE)</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1"><ShieldAlert size={12} /> Alertas Críticos imediatos na tela.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Nível Mínimo</label>
                        <div className="space-y-2">
                            <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${severityMin === 'CRIT' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input type="radio" value="CRIT" checked={severityMin === 'CRIT'} onChange={() => setSeverityMin('CRIT')} />
                                <div>
                                    <div className="font-bold text-sm text-red-900">Só Críticos (CRIT)</div>
                                </div>
                            </label>
                            <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${severityMin === 'WARN' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input type="radio" value="WARN" checked={severityMin === 'WARN'} onChange={() => setSeverityMin('WARN')} />
                                <div>
                                    <div className="font-bold text-sm text-amber-900">Críticos + Avisos (WARN)</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Filtrar por Bairros Mapeados</label>
                        <p className="text-[10px] text-gray-400 mb-2">Separe por vírgulas. Deixe vazio para todos. Ex: aterrado, retiro</p>
                        <Input
                            value={neighborhoodsInput}
                            onChange={(e) => setNeighborhoodsInput(e.target.value)}
                            placeholder="Ex: vila rica, sessenta"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Filtrar por Linhas</label>
                        <p className="text-[10px] text-gray-400 mb-2">Separe por vírgulas. Deixe vazio para todas. Ex: 330, 215A</p>
                        <Input
                            value={linesInput}
                            onChange={(e) => setLinesInput(e.target.value)}
                            placeholder="Ex: 540, 315"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-5 border-t border-gray-100 flex justify-end">
                <Button variant="primary" onClick={handleSavePrefs} loading={loading} className="w-full sm:w-auto">
                    {isSubscribed ? (
                        <><Save size={16} className="mr-2" /> Salvar Preferências</>
                    ) : (
                        <><Bell size={16} className="mr-2" /> Ativar Alertas no Celular</>
                    )}
                </Button>
            </div>
        </Card>
    );
}
