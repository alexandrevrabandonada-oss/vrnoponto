export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker is not supported in this browser.');
    }
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        throw new Error('This browser does not support desktop notification');
    }

    // "granted", "denied", "default"
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Permission denied for notifications');
    }
    return permission;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush(vapidPublicKey: string) {
    const registration = await navigator.serviceWorker.ready;
    const existingSub = await registration.pushManager.getSubscription();

    if (existingSub) {
        return existingSub;
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    return subscription;
}

export async function saveSubscriptionOnServer(
    deviceId: string,
    subscription: PushSubscription,
    prefs: { mode: string, severity_min: string, neighborhoods_norm: string[], lines: string[] }
) {
    const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deviceId,
            subscription,
            prefs
        })
    });

    if (!res.ok) {
        throw new Error('Failed to save subscription on server');
    }
    return res.json();
}
