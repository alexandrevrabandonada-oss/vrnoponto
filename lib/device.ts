/**
 * Utility to manage unique device identification
 * Isomorphic safe: returns null if not in browser context
 */
export function getDeviceId(): string | null {
    if (typeof window === 'undefined') return null;

    let id = localStorage.getItem('vrnp_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('vrnp_device_id', id);
    }

    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `vrnp_device_id=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`;
    return id;
}
