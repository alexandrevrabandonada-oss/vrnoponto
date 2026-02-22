'use client';

import { useState, useEffect } from 'react';

export type UIMode = 'default' | 'legivel';
export type UIDensity = 'comfort' | 'compact';

export function useUiPrefs() {
    const [uiMode, setUiModeState] = useState<UIMode>('default');
    const [density, setDensityState] = useState<UIDensity>('comfort');

    useEffect(() => {
        // Hydrate from current DOM attributes (SSR injected)
        const currentUiMode = document.documentElement.getAttribute('data-ui') as UIMode || 'default';
        const currentDensity = document.documentElement.getAttribute('data-density') as UIDensity || 'comfort';

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUiModeState(currentUiMode);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDensityState(currentDensity);
    }, []);

    const setPreference = (key: 'vrnp_ui' | 'vrnp_density', value: string) => {
        // 1. Save strictly to cookies (1 year expiration)
        document.cookie = `${key}=${value};path=/;max-age=31536000;SameSite=Lax`;

        // 2. Mutable DOM update to prevent any flicker during current session
        const attrKey = key === 'vrnp_ui' ? 'data-ui' : 'data-density';
        document.documentElement.setAttribute(attrKey, value);

        // 3. Update React state
        if (key === 'vrnp_ui') setUiModeState(value as UIMode);
        if (key === 'vrnp_density') setDensityState(value as UIDensity);
    };

    const setUiMode = (val: UIMode) => setPreference('vrnp_ui', val);
    const setDensity = (val: UIDensity) => setPreference('vrnp_density', val);

    return {
        uiMode,
        density,
        setUiMode,
        setDensity,
    };
}
