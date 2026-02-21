'use client';

import { useEffect, useRef } from 'react';

export function TelemetryTracker({ eventName }: { eventName: string }) {
    const hasFired = useRef(false);

    useEffect(() => {
        if (hasFired.current) return;

        // Session storage debounce to avoid spamming on hot reloads or quick back/forth
        const sessionKey = `telemetry_fired_${eventName}`;
        if (sessionStorage.getItem(sessionKey)) return;

        hasFired.current = true;
        sessionStorage.setItem(sessionKey, 'true');

        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: eventName }),
        }).catch(() => { });
    }, [eventName]);

    return null; // Invisible component
}
