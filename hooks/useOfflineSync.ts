'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingEvents, removeEvent, markEventFailed, incrementRetry } from '@/lib/offlineQueue';
import {
    getPendingProofTasks,
    removeProofTask,
    markProofTaskFailed,
    incrementProofRetry
} from '@/lib/offlineProofQueue';

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [pendingCount, setPendingCount] = useState<number>(0);

    const checkPendingCount = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            const pending = await getPendingEvents(100);
            const pendingProof = await getPendingProofTasks(100);
            setPendingCount(pending.length + pendingProof.length);
        } catch (err) {
            console.error('Failed to get pending events', err);
        }
    }, []);

    const syncNow = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        try {
            const pending = await getPendingEvents(20);
            const pendingProof = await getPendingProofTasks(10);
            if (pending.length === 0 && pendingProof.length === 0) {
                return;
            }

            let syncedCount = 0;
            let failedCount = 0;
            let proofSyncedCount = 0;
            let proofFailedCount = 0;
            let proofSuggested = 0;
            let proofConfirmed = 0;
            let proofManualFallback = 0;
            const blockedProofByClientEvent = new Set<string>();

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
                    blockedProofByClientEvent.add(item.id);
                }
            }

            for (const task of pendingProof) {
                try {
                    if (task.client_event_id && blockedProofByClientEvent.has(task.client_event_id)) {
                        // Event is still pending/failed in this cycle; wait to keep linkage integrity.
                        continue;
                    }

                    const blob = await fetch(task.photo_data_url).then(r => r.blob());
                    const ext = (task.mime_type || blob.type || 'image/jpeg').split('/')[1] || 'jpg';
                    const file = new File([blob], `proof-${task.id}.${ext}`, { type: task.mime_type || blob.type || 'image/jpeg' });

                    const uploadForm = new FormData();
                    uploadForm.append('photo', file);
                    uploadForm.append('device_id', task.device_id);

                    const uploadRes = await fetch('/api/proof/upload-photo', {
                        method: 'POST',
                        body: uploadForm
                    });
                    const uploadJson = await uploadRes.json();
                    if (!uploadRes.ok) {
                        throw new Error(uploadJson?.error || `Upload failed (${uploadRes.status})`);
                    }
                    const photoPath = uploadJson.photo_path as string;

                    const analyzeRes = await fetch('/api/proof/analyze-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            photo_path: photoPath,
                            stop_id: task.stop_id || null
                        })
                    });
                    const analyzeJson = await analyzeRes.json();
                    if (!analyzeRes.ok) {
                        throw new Error(analyzeJson?.error || `Analyze failed (${analyzeRes.status})`);
                    }

                    const aiText = task.ai_text ?? analyzeJson.ai_text ?? null;
                    const aiGuess = task.ai_line_guess ?? analyzeJson.ai_line_guess ?? null;
                    const aiConfidence = typeof task.ai_confidence === 'number'
                        ? task.ai_confidence
                        : (typeof analyzeJson.ai_confidence === 'number' ? analyzeJson.ai_confidence : null);

                    const finalizeRes = await fetch('/api/proof/finalize-photo-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            device_id: task.device_id,
                            photo_path: photoPath,
                            stop_id: task.stop_id || null,
                            line_id: task.line_id || null,
                            lat: task.lat ?? null,
                            lng: task.lng ?? null,
                            ai_text: aiText,
                            ai_line_guess: aiGuess,
                            ai_confidence: aiConfidence,
                            user_confirmed: !!task.user_confirmed,
                            client_event_id: task.client_event_id || null
                        })
                    });
                    const finalizeJson = await finalizeRes.json();
                    if (!finalizeRes.ok) {
                        throw new Error(finalizeJson?.error || `Finalize failed (${finalizeRes.status})`);
                    }

                    await removeProofTask(task.id);
                    proofSyncedCount++;
                    if (aiGuess) proofSuggested++;
                    if (task.user_confirmed) {
                        proofConfirmed++;
                    } else if (!aiGuess && task.line_id) {
                        proofManualFallback++;
                    }
                } catch (err: unknown) {
                    const errMessage = err instanceof Error ? err.message : 'Proof sync network error';
                    if (task.retry_count >= 3) {
                        await markProofTaskFailed(task.id, 'Max retries reached: ' + errMessage);
                        proofFailedCount++;
                    } else {
                        await incrementProofRetry(task.id, errMessage);
                    }
                }
            }

            // Sync aggregate telemetry securely
            if (syncedCount > 0 || failedCount > 0 || proofSyncedCount > 0 || proofFailedCount > 0 || proofSuggested > 0 || proofConfirmed > 0 || proofManualFallback > 0) {
                try {
                    const metrics = [];
                    if (syncedCount > 0) metrics.push('offline_queue_synced');
                    if (failedCount > 0) metrics.push('offline_queue_failed');
                    if (proofSyncedCount > 0) metrics.push('bus_photo_uploaded');
                    if (proofSuggested > 0) metrics.push('bus_photo_ai_suggested');
                    if (proofConfirmed > 0) metrics.push('bus_photo_confirmed');
                    if (proofManualFallback > 0) metrics.push('bus_photo_fallback_manual');

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
