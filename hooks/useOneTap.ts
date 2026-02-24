'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { enqueueEvent } from '@/lib/offlineQueue';
import { getRecentBusPhotoDraft, clearBusPhotoDraft } from '@/lib/busPhotoDraft';
import { updateProofTaskClientEvent } from '@/lib/offlineProofQueue';
import { suggestLine, saveLastLine, SuggestedLine } from '@/lib/suggestLine';

export type OneTapEventType = 'passed_by' | 'boarding';

export interface OneTapResult {
    ok: boolean;
    queued: boolean;
    trust_level?: string;
    event_id?: string;
    client_event_id?: string;
}

interface TopLine {
    line_id: string;
    code: string;
    name: string;
}

interface UseOneTapOptions {
    stopId: string | null;
    defaultLineId?: string;
    onRecorded?: (result: OneTapResult) => void;
}

const HUMAN_RATE_LIMIT_MESSAGE =
    'Calma, já recebemos um registro seu agora há pouco. Tentar de novo em alguns minutos.';

export function useOneTap({ stopId, defaultLineId, onRecorded }: UseOneTapOptions) {
    const deviceId = useDeviceId();
    const { isOnline, refreshPending } = useOfflineSync();

    const [suggestion, setSuggestion] = useState<SuggestedLine | null>(null);
    const [selectedLine, setSelectedLine] = useState<TopLine | null>(null);
    const [topLines, setTopLines] = useState<TopLine[]>([]);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [isLoadingTopLines, setIsLoadingTopLines] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'queued' | 'error'; text: string } | null>(null);
    const [lineOverridden, setLineOverridden] = useState(false);

    const shownRef = useRef(false);

    // Telemetry helper (fire-and-forget, no PII)
    const trackTelemetry = useCallback((event: string) => {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event })
        }).catch(() => { /* silent */ });
    }, []);

    // Load suggestion when stopId changes
    useEffect(() => {
        if (!stopId) return;
        let cancelled = false;

        async function load() {
            setIsLoadingSuggestion(true);
            setFeedback(null);
            try {
                const s = await suggestLine(stopId!, deviceId || undefined);
                if (!cancelled) {
                    setSuggestion(s);
                    if (s) {
                        setSelectedLine({ line_id: s.line_id, code: s.code, name: s.name });
                    } else if (defaultLineId) {
                        // No suggestion but we have a default
                        setSelectedLine(null);
                    }
                }
            } catch (e) {
                console.error('useOneTap: suggestLine error', e);
            } finally {
                if (!cancelled) setIsLoadingSuggestion(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [stopId, deviceId, defaultLineId]);

    // Load top lines for line switching
    useEffect(() => {
        if (!stopId) return;
        let cancelled = false;

        async function loadTopLines() {
            setIsLoadingTopLines(true);
            try {
                const res = await fetch(`/api/stop/top-lines?stop_id=${stopId}&limit=5&device_id=${deviceId || ''}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data.lines) {
                        setTopLines(data.lines);
                    }
                }
            } catch (e) {
                console.error('useOneTap: top-lines error', e);
            } finally {
                if (!cancelled) setIsLoadingTopLines(false);
            }
        }
        loadTopLines();
        return () => { cancelled = true; };
    }, [stopId, deviceId]);

    // Track "shown" telemetry once per session
    useEffect(() => {
        if (suggestion && !shownRef.current) {
            shownRef.current = true;
            trackTelemetry('no_ponto_one_tap_shown');
        }
    }, [suggestion, trackTelemetry]);

    // Override line selection
    const selectLine = useCallback((line: TopLine) => {
        setSelectedLine(line);
        setLineOverridden(true);
        trackTelemetry('no_ponto_one_tap_override_line');
    }, [trackTelemetry]);

    const attachRecentPhotoProof = useCallback(async ({
        eventId,
        clientEventId,
        lineId
    }: {
        eventId?: string | null;
        clientEventId: string;
        lineId: string;
    }) => {
        if (!deviceId || !stopId) return;

        const draft = getRecentBusPhotoDraft();
        if (!draft || draft.device_id !== deviceId) return;

        const resolvedLineId = lineId || draft.line_id || null;

        try {
            if (draft.proof_task_id) {
                await updateProofTaskClientEvent(draft.proof_task_id, clientEventId, {
                    stop_id: stopId,
                    line_id: resolvedLineId,
                    lat: draft.lat ?? null,
                    lng: draft.lng ?? null,
                    user_confirmed: !!draft.user_confirmed
                });
                await refreshPending();
                clearBusPhotoDraft();
                return;
            }

            if (!isOnline || !draft.photo_path) return;

            const finalizeRes = await fetch('/api/proof/finalize-photo-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: deviceId,
                    photo_path: draft.photo_path,
                    stop_id: stopId,
                    line_id: resolvedLineId,
                    event_id: eventId || null,
                    client_event_id: clientEventId,
                    lat: draft.lat ?? null,
                    lng: draft.lng ?? null,
                    ai_text: draft.ai_text ?? null,
                    ai_line_guess: draft.ai_line_guess ?? null,
                    ai_confidence: draft.ai_confidence ?? null,
                    user_confirmed: !!draft.user_confirmed
                })
            });

            if (finalizeRes.ok) {
                clearBusPhotoDraft();
            }
        } catch {
            // No hard-fail: photo proof is optional
        }
    }, [deviceId, stopId, isOnline, refreshPending]);

    // Core: record an event
    const record = useCallback(async (eventType: OneTapEventType): Promise<OneTapResult> => {
        if (!deviceId || !stopId || !selectedLine) {
            setFeedback({ type: 'error', text: 'Selecione ponto e linha.' });
            return { ok: false, queued: false };
        }

        setIsSubmitting(true);
        setFeedback(null);

        const clientEventId = crypto.randomUUID();
        const payload = {
            deviceId,
            stopId,
            lineId: selectedLine.line_id,
            eventType,
            clientEventId
        };

        try {
            trackTelemetry('no_ponto_one_tap_used');

            if (!isOnline) {
                await enqueueEvent({
                    id: clientEventId,
                    payload,
                    status: 'PENDING',
                    created_at: Date.now(),
                    retry_count: 0
                });
                await refreshPending();

                // Save last line even offline
                saveLastLine(stopId, selectedLine);
                await attachRecentPhotoProof({
                    eventId: null,
                    clientEventId,
                    lineId: selectedLine.line_id
                });

                const result: OneTapResult = {
                    ok: true,
                    queued: true,
                    client_event_id: clientEventId
                };
                setFeedback({ type: 'queued', text: 'Salvo (vai sincronizar)' });
                onRecorded?.(result);
                return result;
            }

            const res = await fetch('/api/events/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429) {
                    setFeedback({ type: 'error', text: HUMAN_RATE_LIMIT_MESSAGE });
                    return { ok: false, queued: false };
                }
                throw new Error(data.error || 'Erro desconhecido');
            }

            saveLastLine(stopId, selectedLine);
            await attachRecentPhotoProof({
                eventId: data.event?.id || null,
                clientEventId,
                lineId: selectedLine.line_id
            });

            const trustLevel = data.event?.trust_level || 'L1';
            const result: OneTapResult = {
                ok: true,
                queued: false,
                trust_level: trustLevel,
                event_id: data.event?.id || undefined,
                client_event_id: clientEventId
            };
            setFeedback({ type: 'ok', text: 'Registrado ✓' });
            onRecorded?.(result);
            return result;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
            const normalized = msg.toLowerCase();
            if (normalized.includes('rate limit') || normalized.includes('429')) {
                setFeedback({ type: 'error', text: HUMAN_RATE_LIMIT_MESSAGE });
            } else {
                setFeedback({ type: 'error', text: msg });
            }
            return { ok: false, queued: false };
        } finally {
            setIsSubmitting(false);
        }
    }, [deviceId, stopId, selectedLine, isOnline, refreshPending, trackTelemetry, onRecorded, attachRecentPhotoProof]);

    return {
        suggestion,
        selectedLine,
        topLines,
        isLoadingSuggestion,
        isLoadingTopLines,
        isSubmitting,
        feedback,
        lineOverridden,
        selectLine,
        record,
        trackTelemetry
    };
}
