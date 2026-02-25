'use client';

import { useState, useCallback } from 'react';

export type UIMode = 'default' | 'legivel';
export type UIDensity = 'comfort' | 'compact';
export type StopMode = 'auto' | 'manual';
export type NotifMode = 'digest' | 'immediate';

function getInitialPrefs() {
    if (typeof document === 'undefined') {
        return {
            uiMode: 'default' as UIMode,
            density: 'comfort' as UIDensity,
            stopMode: 'auto' as StopMode,
            notifMode: 'digest' as NotifMode
        };
    }

    const currentUiMode = (document.documentElement.getAttribute('data-ui') as UIMode) || 'default';
    const currentDensity = (document.documentElement.getAttribute('data-density') as UIDensity) || 'comfort';

    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const currentStopMode = ((getCookie('vrnp_stop_mode') || localStorage.getItem('vrnp_stop_mode')) as StopMode) || 'auto';
    const currentNotifMode = (getCookie('vrnp_notif') as NotifMode) || 'digest';

    return {
        uiMode: currentUiMode,
        density: currentDensity,
        stopMode: currentStopMode,
        notifMode: currentNotifMode
    };
}

export function useUiPrefs() {
    const initial = getInitialPrefs();
    const [uiMode, setUiModeState] = useState<UIMode>(initial.uiMode);
    const [density, setDensityState] = useState<UIDensity>(initial.density);
    const [stopMode, setStopModeState] = useState<StopMode>(initial.stopMode);
    const [notifMode, setNotifModeState] = useState<NotifMode>(initial.notifMode);

    const setPreference = useCallback((key: 'vrnp_ui' | 'vrnp_density' | 'vrnp_stop_mode' | 'vrnp_notif', value: string) => {
        // 1. Save strictly to cookies (1 year expiration)
        document.cookie = `${key}=${value};path=/;max-age=31536000;SameSite=Lax`;

        // 2. LocalStorage fallback/sync for non-SSR components
        if (key === 'vrnp_stop_mode') localStorage.setItem(key, value);

        // 3. Mutable DOM update for flicker prevention (UI only)
        if (key === 'vrnp_ui' || key === 'vrnp_density') {
            const attrKey = key === 'vrnp_ui' ? 'data-ui' : 'data-density';
            document.documentElement.setAttribute(attrKey, value);

            // Sync data-ui-scale for global typographic scaling
            if (key === 'vrnp_ui') {
                document.documentElement.setAttribute('data-ui-scale', value === 'legivel' ? 'lg' : 'default');
            }
        }

        // 4. Update React state
        if (key === 'vrnp_ui') setUiModeState(value as UIMode);
        if (key === 'vrnp_density') setDensityState(value as UIDensity);
        if (key === 'vrnp_stop_mode') setStopModeState(value as StopMode);
        if (key === 'vrnp_notif') setNotifModeState(value as NotifMode);
    }, []);

    const setUiMode = useCallback((val: UIMode) => setPreference('vrnp_ui', val), [setPreference]);
    const setDensity = useCallback((val: UIDensity) => setPreference('vrnp_density', val), [setPreference]);
    const setStopMode = useCallback((val: StopMode) => setPreference('vrnp_stop_mode', val), [setPreference]);
    const setNotifMode = useCallback((val: NotifMode) => setPreference('vrnp_notif', val), [setPreference]);

    return {
        uiMode,
        density,
        stopMode,
        notifMode,
        setUiMode,
        setDensity,
        setStopMode,
        setNotifMode,
    };
}
