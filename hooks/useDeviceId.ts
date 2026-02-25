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

        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `vrnp_device_id=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`;
        queueMicrotask(() => setDeviceId(id));
    }, []);

    return deviceId;
}
