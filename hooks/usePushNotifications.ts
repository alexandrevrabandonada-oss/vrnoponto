'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDeviceId } from '@/lib/device';
import {
    registerServiceWorker,
    requestNotificationPermission,
    subscribeToPush,
    saveSubscriptionOnServer
} from '@/lib/push/register';

export interface PushPreferences {
    mode: 'DIGEST' | 'IMMEDIATE';
    severity_min: 'WARN' | 'CRIT';
    neighborhoods_norm: string[];
    lines: string[];
    is_active: boolean;
}

export function usePushNotifications() {
    const [permStatus, setPermStatus] = useState<NotificationPermission | 'loading'>('loading');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [preferences, setPreferences] = useState<PushPreferences | null>(null);
    const [loading, setLoading] = useState(false);

    const loadPreferences = useCallback(async () => {
        const deviceId = getDeviceId();
        if (!deviceId) return;

        try {
            const res = await fetch(`/api/push/preferences?deviceId=${deviceId}`);
            if (res.ok) {
                const data = await res.json();
                setPreferences(data.preferences);
            }
        } catch (error) {
            console.error('Error loading push preferences:', error);
        }
    }, []);

    const checkStatus = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
            setPermStatus('denied');
            return;
        }

        setPermStatus(Notification.permission);

        if (Notification.permission === 'granted') {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    const sub = await reg.pushManager.getSubscription();
                    setIsSubscribed(!!sub);
                    if (sub) {
                        await loadPreferences();
                    }
                }
            } catch (e) {
                console.error('Error checking push status:', e);
            }
        }

        if (permStatus === 'loading') {
            setPermStatus(Notification.permission);
        }
    }, [loadPreferences, permStatus]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const subscribe = async (initialPrefs?: Partial<PushPreferences>) => {
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
            if (!deviceId) throw new Error('Device identifier not found');

            const payload: PushPreferences = {
                mode: initialPrefs?.mode || preferences?.mode || 'DIGEST',
                severity_min: initialPrefs?.severity_min || preferences?.severity_min || 'CRIT',
                neighborhoods_norm: initialPrefs?.neighborhoods_norm || preferences?.neighborhoods_norm || [],
                lines: initialPrefs?.lines || preferences?.lines || [],
                is_active: true
            };

            await saveSubscriptionOnServer(deviceId, sub, payload);
            setIsSubscribed(true);
            setPreferences(payload);

            fetch('/api/telemetry', {
                method: 'POST',
                body: JSON.stringify({ event: 'push_optin_success' })
            }).catch(() => { });

            return true;
        } catch (err) {
            console.error('Subscribe error:', err);
            fetch('/api/telemetry', {
                method: 'POST',
                body: JSON.stringify({ event: 'push_optin_denied' })
            }).catch(() => { });
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
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
            setPreferences(null);
        } catch (err) {
            console.error('Unsubscribe error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updatePreferences = async (newPrefs: Partial<PushPreferences>) => {
        if (!isSubscribed) return false;

        setLoading(true);
        try {
            const deviceId = getDeviceId();
            if (!deviceId) throw new Error('Device identifier not found');

            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (!sub) throw new Error('No local subscription found');

            const updated: PushPreferences = {
                mode: newPrefs.mode || preferences?.mode || 'DIGEST',
                severity_min: newPrefs.severity_min || preferences?.severity_min || 'CRIT',
                neighborhoods_norm: Array.from(new Set(newPrefs.neighborhoods_norm || preferences?.neighborhoods_norm || [])),
                lines: Array.from(new Set(newPrefs.lines || preferences?.lines || [])),
                is_active: true
            };

            await saveSubscriptionOnServer(deviceId, sub, updated);
            setPreferences(updated);
            return true;
        } catch (e) {
            console.error('Update preferences error:', e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const followNeighborhood = async (neighborhoodNorm: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            body: JSON.stringify({ event: 'follow_bairro_click' })
        }).catch(() => { });

        if (!isSubscribed) return false;

        const current = preferences?.neighborhoods_norm || [];
        if (current.includes(neighborhoodNorm)) return true;

        return updatePreferences({
            neighborhoods_norm: [...current, neighborhoodNorm]
        });
    };

    const followLine = async (lineId: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            body: JSON.stringify({ event: 'follow_linha_click' })
        }).catch(() => { });

        if (!isSubscribed) return false;

        const current = preferences?.lines || [];
        if (current.includes(lineId)) return true;

        return updatePreferences({
            lines: [...current, lineId]
        });
    };

    const isFollowingNeighborhood = (neighborhoodNorm: string) => {
        return preferences?.neighborhoods_norm.includes(neighborhoodNorm) || false;
    };

    const isFollowingLine = (lineId: string) => {
        return preferences?.lines.includes(lineId) || false;
    };

    return {
        permStatus,
        isSubscribed,
        preferences,
        loading,
        subscribe,
        unsubscribe,
        updatePreferences,
        followNeighborhood,
        followLine,
        isFollowingNeighborhood,
        isFollowingLine,
        refresh: checkStatus
    };
}
