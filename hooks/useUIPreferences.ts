'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UIDensity = 'comfortable' | 'compact';
export type UIContrast = 'normal' | 'high';

export function useUIPreferences() {
    const router = useRouter();
    const [density, setDensityState] = useState<UIDensity>('comfortable');
    const [contrast, setContrastState] = useState<UIContrast>('normal');

    useEffect(() => {
        // Hydrate from current DOM attributes (SSR injected)
        const currentDensity = document.documentElement.getAttribute('data-density') as UIDensity || 'comfortable';
        const currentContrast = document.documentElement.getAttribute('data-contrast') as UIContrast || 'normal';
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDensityState(currentDensity);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContrastState(currentContrast);
    }, []);

    const setPreference = (key: 'ui_density' | 'ui_contrast', value: string) => {
        // 1. Save strictly to cookies (1 year expiration)
        document.cookie = `${key}=${value};path=/;max-age=31536000;SameSite=Lax`;

        // 2. Mutable DOM update to prevent any flicker during current session
        const attrKey = key === 'ui_density' ? 'data-density' : 'data-contrast';
        document.documentElement.setAttribute(attrKey, value);

        // 3. Update React state
        if (key === 'ui_density') setDensityState(value as UIDensity);
        if (key === 'ui_contrast') setContrastState(value as UIContrast);

        // 4. Optionally refresh Next.js cache so the server understands the new cookie on subsequent navigation
        router.refresh();
    };

    const setDensity = (val: UIDensity) => setPreference('ui_density', val);
    const setContrast = (val: UIContrast) => setPreference('ui_contrast', val);

    return {
        density,
        contrast,
        setDensity,
        setContrast,
    };
}
