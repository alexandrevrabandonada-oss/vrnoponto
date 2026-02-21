'use client';

import { useState, useEffect } from 'react';

export function useDeviceId() {
    const [deviceId, setDeviceId] = useState<string | null>(null);

    useEffect(() => {
        let id = localStorage.getItem('vrnp_device_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('vrnp_device_id', id);
        }
        queueMicrotask(() => setDeviceId(id));
    }, []);

    return deviceId;
}
