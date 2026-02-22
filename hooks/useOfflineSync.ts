'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingEvents, removeEvent, markEventFailed, incrementRetry } from '@/lib/offlineQueue';

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [pendingCount, setPendingCount] = useState<number>(0);

    const checkPendingCount = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            const pending = await getPendingEvents(100);
            setPendingCount(pending.length);
        } catch (err) {
            console.error('Failed to get pending events', err);
        }
    }, []);

    const syncNow = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        try {
            const pending = await getPendingEvents(20);
            if (pending.length === 0) {
                setIsSyncing(false);
                return;
            }

            let syncedCount = 0;
            let failedCount = 0;

            for (const item of pending) {
                try {
                    const res = await fetch('/api/events/record', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...item.payload, clientEventId: item.id })
                    });

                    const data = await res.json();

                    if (res.ok || res.status === 429 /* Rate limit -> consider it handled to avoid infinite retries */ || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
                        // Success or client error (bad request) -> Delete from queue
                        await removeEvent(item.id);
                        syncedCount++;
                    } else {
                        // 5xx Server Error -> Retry later
                        throw new Error(`Server returned ${res.status}: ${data.error || 'Unknown'}`);
                    }
                } catch (err: unknown) {
                    const errMessage = err instanceof Error ? err.message : 'Network error';
                    if (item.retry_count >= 3) {
                        await markEventFailed(item.id, 'Max retries reached: ' + errMessage);
                        failedCount++;
                    } else {
                        await incrementRetry(item.id, errMessage);
                    }
                }
            }

            // Sync aggregate telemetry securely
            if (syncedCount > 0 || failedCount > 0) {
                try {
                    const metrics = [];
                    if (syncedCount > 0) metrics.push('offline_queue_synced');
                    if (failedCount > 0) metrics.push('offline_queue_failed');

                    await fetch('/api/telemetry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ metrics })
                    });
                } catch {
                    // Non-critical
                }
            }

        } catch (err) {
            console.error('Sync process crashed', err);
        } finally {
            await checkPendingCount();
            setIsSyncing(false);
        }
    }, [checkPendingCount]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            syncNow(); // Auto sync on reconnection
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check count initially
        checkPendingCount();

        // Initial sync if online
        if (navigator.onLine) {
            syncNow();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncNow, checkPendingCount]);

    return {
        isOnline,
        isSyncing,
        pendingCount,
        syncNow,
        refreshPending: checkPendingCount
    };
}
